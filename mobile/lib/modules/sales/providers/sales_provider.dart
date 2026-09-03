import 'package:flutter/foundation.dart';

import '../../../constants/app_mode.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/services/api_logger.dart';
import '../../../database/app_database.dart';
import '../../../models/server_list_models.dart';
import '../../../network/api_endpoints.dart';
import '../../../services/cache_service.dart';
import '../../auth/services/auth_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../services/sales_service.dart';

class SalesProvider extends ChangeNotifier {
  SalesProvider({
    required SalesService salesService,
    required CacheService cache,
    required SyncProvider sync,
  })  : _salesService = salesService,
        _cache = cache,
        _sync = sync;

  final SalesService _salesService;
  final CacheService _cache;
  final SyncProvider _sync;

  bool _busy = false;
  bool _listLoading = false;
  String? _error;
  String? _listError;
  String? _success;
  String? _actionError;
  List<ServerSaleLine> _serverLines = [];
  List<ServerSaleLine> _periodLines = [];
  SalesFilters _filters = SalesFilters.initial();
  bool _showAllColumns = false;
  List<TeamSalesman> _salesmen = [];
  List<SaleMethodStat> _methodStats = [];
  SaleListTotals _totals = const SaleListTotals(
    count: 0,
    qtySold: 0,
    withoutVat: 0,
    withVat: 0,
    purchase: 0,
  );

  bool get busy => _busy;
  bool get listLoading => _listLoading;
  String? get error => _error;
  String? get listError => _listError;
  String? get success => _success;
  String? get actionError => _actionError;
  List<ServerSaleLine> get serverLines => _serverLines;
  SalesFilters get filters => _filters;
  bool get showAllColumns => _showAllColumns;
  List<TeamSalesman> get salesmen => _salesmen;
  List<SaleMethodStat> get methodStats => _methodStats;
  SaleListTotals get totals => _totals;

  int get saleCount => _serverLines.map((e) => e.saleId).toSet().length;

  String get periodLabel {
    const labels = {
      'today': 'Today',
      'yesterday': 'Yesterday',
      'this_month': 'This month',
      'this_year': 'This year',
      'all': 'All sales',
      'custom': 'Date range',
    };
    return labels[_filters.period] ?? 'Sales';
  }

  Stream<List<LocalSale>> watchLocalSales() => _salesService.watchLocalSales();

  Future<bool> ensureReferenceData() async {
    if (_sync.isOperatingOnline) {
      return _sync.refreshCache();
    }
    return true;
  }

  void setShowAllColumns(bool value) {
    _showAllColumns = value;
    notifyListeners();
  }

  Future<void> setFilters(SalesFilters next) async {
    _filters = next;
    notifyListeners();
    await refreshLists();
  }

  Future<void> setPeriod(String period) async {
    final range = SalesFilters.rangeFor(period);
    await setFilters(
      _filters.copyWith(period: period, from: range.from, to: range.to),
    );
  }

  Future<void> togglePaymentMethodFilter(String method) async {
    final next = _filters.paymentMethod == method ? '' : method;
    await setFilters(_filters.copyWith(paymentMethod: next));
  }

  void _recomputeStats(List<PaymentMethodsCacheData> methods) {
    final map = <String, SaleMethodStat>{};
    for (final method in methods) {
      map[method.name] = SaleMethodStat(
        name: method.name,
        count: 0,
        qty: 0,
        total: 0,
      );
    }
    for (final line in _periodLines) {
      final key =
          line.paymentMethod.isEmpty ? 'Unknown' : line.paymentMethod;
      final current = map[key] ??
          SaleMethodStat(name: key, count: 0, qty: 0, total: 0);
      map[key] = SaleMethodStat(
        name: current.name,
        count: current.count + 1,
        qty: current.qty + line.quantity,
        total: current.total + line.totalWithVat,
      );
    }
    _methodStats = map.values.toList();

    var qtySold = 0.0;
    var withoutVat = 0.0;
    var withVat = 0.0;
    var purchase = 0.0;
    for (final line in _serverLines) {
      qtySold += line.quantity;
      withoutVat += line.totalPrice;
      withVat += line.totalWithVat;
      purchase += line.purchaseTotal;
    }
    _totals = SaleListTotals(
      count: _serverLines.length,
      qtySold: qtySold,
      withoutVat: withoutVat,
      withVat: withVat,
      purchase: purchase,
    );
  }

  Future<void> refreshLists({Map<String, dynamic>? user}) async {
    _listLoading = true;
    _listError = null;
    notifyListeners();

    try {
      if (_sync.isOperatingOnline) {
        if (!await _sync.ensureAuthenticated()) {
          _listError = 'Not signed in — log in again to load sales from server';
          return;
        }
        await _sync.refreshCache();
        final methods = await _cache.getPaymentMethods();

        // Period lines without payment-method filter (for analytics cards).
        final periodFilters = _filters.copyWith(paymentMethod: '');
        _periodLines =
            await _salesService.fetchServerSales(filters: periodFilters);
        _serverLines = _filters.paymentMethod.isEmpty
            ? List.of(_periodLines)
            : _periodLines
                .where((l) => l.paymentMethod == _filters.paymentMethod)
                .toList();
        _recomputeStats(methods);

        if (PermissionHelper.isOwner(user)) {
          try {
            _salesmen = await _salesService.fetchTeamSalesmen();
          } catch (_) {
            _salesmen = [];
          }
        }
        ApiLogger.info('Loaded ${_serverLines.length} sale lines from server');
      } else {
        _serverLines = [];
        _periodLines = [];
        _methodStats = [];
        _totals = const SaleListTotals(
          count: 0,
          qtySold: 0,
          withoutVat: 0,
          withVat: 0,
          purchase: 0,
        );
      }
    } catch (error) {
      _listError = friendlyError(error);
      ApiLogger.error('GET', ApiEndpoints.sales, error);
      if (_sync.userMode == AppOperationMode.auto) {
        _sync.markServerUnreachable();
      }
    } finally {
      _listLoading = false;
      notifyListeners();
    }
  }

  Future<List<CustomersCacheData>> customers() => _cache.getCustomers();

  Future<String?> resolveWarehouseId(String name) =>
      _cache.resolveWarehouseId(name);

  Future<List<WarehousesCacheData>> warehouses() => _cache.getWarehouses();

  Future<List<ProductsCacheData>> allProducts() => _cache.getProducts();

  Future<List<ProductsCacheData>> productsForWarehouse(
    String warehouseId, {
    required bool includeAllProducts,
  }) async {
    final products = await _cache.getProducts();
    if (includeAllProducts) return products;
    final filtered = <ProductsCacheData>[];
    for (final product in products) {
      final stock = await _cache.stockFor(product.id, warehouseId);
      if (stock > 0) filtered.add(product);
    }
    return filtered;
  }

  Future<double> stockFor(String productId, String warehouseId) =>
      _cache.stockFor(productId, warehouseId);

  Future<List<PaymentMethodsCacheData>> paymentMethods() =>
      _cache.getPaymentMethods();

  Future<List<ServerSaleLine>> fetchTodaySales() async {
    final today = SalesFilters.isoLocal(DateTime.now());
    return _salesService.fetchServerSales(
      filters: SalesFilters(period: 'custom', from: today, to: today),
    );
  }

  Future<bool> createSale({
    required String warehouseId,
    String? warehouseName,
    String? customerId,
    String? customerName,
    required String paymentMethod,
    required double paidAmount,
    required List<SaleLineInput> items,
  }) async {
    _busy = true;
    _error = null;
    _success = null;
    notifyListeners();

    try {
      if (_sync.isOperatingOnline) {
        try {
          await _salesService.createSale(
            online: true,
            warehouseId: warehouseId,
            warehouseName: warehouseName,
            customerId: customerId,
            customerName: customerName,
            paymentMethod: paymentMethod,
            paidAmount: paidAmount,
            items: items,
          );
          _success = 'Sale completed on server';
          await refreshLists();
          _busy = false;
          notifyListeners();
          return true;
        } catch (error) {
          if (_sync.userMode == AppOperationMode.online) {
            _error = friendlyError(error);
            _busy = false;
            notifyListeners();
            return false;
          }
          _sync.markServerUnreachable();
        }
      }

      await _salesService.createSale(
        online: false,
        warehouseId: warehouseId,
        warehouseName: warehouseName,
        customerId: customerId,
        customerName: customerName,
        paymentMethod: paymentMethod,
        paidAmount: paidAmount,
        items: items,
      );
      _success = _sync.userMode == AppOperationMode.offline
          ? 'Sale saved offline'
          : 'Server unreachable — sale saved offline, will sync later';
      _busy = false;
      notifyListeners();
      return true;
    } catch (error) {
      _error = friendlyError(error);
      _busy = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> recordPayment({
    required String saleId,
    required double amount,
    required String paymentMethod,
  }) async {
    _busy = true;
    _actionError = null;
    notifyListeners();
    try {
      await _salesService.recordPayment(
        saleId: saleId,
        amount: amount,
        paymentMethod: paymentMethod,
      );
      await refreshLists();
      _busy = false;
      notifyListeners();
      return true;
    } catch (error) {
      _actionError = friendlyError(error);
      _busy = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> cancelSale(String saleId) async {
    _busy = true;
    _listError = null;
    notifyListeners();
    try {
      await _salesService.cancelSale(saleId);
      await refreshLists();
      _busy = false;
      notifyListeners();
      return true;
    } catch (error) {
      _listError = friendlyError(error);
      _busy = false;
      notifyListeners();
      return false;
    }
  }
}
