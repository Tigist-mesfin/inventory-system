import 'package:flutter/foundation.dart';

import '../../../constants/app_mode.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/services/api_logger.dart';
import '../../../core/utils/money_format.dart';
import '../../../database/app_database.dart';
import '../../../models/server_list_models.dart';
import '../../../network/api_endpoints.dart';
import '../../../services/cache_service.dart';
import '../../auth/services/auth_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../services/purchase_service.dart';

class PurchaseProvider extends ChangeNotifier {
  PurchaseProvider({
    required PurchaseService purchaseService,
    required CacheService cache,
    required SyncProvider sync,
  })  : _purchaseService = purchaseService,
        _cache = cache,
        _sync = sync;

  final PurchaseService _purchaseService;
  final CacheService _cache;
  final SyncProvider _sync;

  bool _busy = false;
  bool _listLoading = false;
  String? _error;
  String? _listError;
  String? _success;
  String? _updateError;
  List<ServerPurchaseLine> _serverLines = [];
  PurchaseReportTotals _totals = PurchaseReportTotals(amount: 0, quantity: 0);
  PurchaseDeliverySummary _summary = PurchaseDeliverySummary.empty();
  PurchaseFilters _filters = const PurchaseFilters();
  bool _showAllColumns = false;
  List<TeamSalesman> _salesmen = [];
  String? _deliverWarehouseId;

  bool get busy => _busy;
  bool get listLoading => _listLoading;
  String? get error => _error;
  String? get listError => _listError;
  String? get success => _success;
  String? get updateError => _updateError;
  List<ServerPurchaseLine> get serverLines => _serverLines;
  PurchaseReportTotals get totals => _totals;
  PurchaseDeliverySummary get summary => _summary;
  PurchaseFilters get filters => _filters;
  bool get showAllColumns => _showAllColumns;
  List<TeamSalesman> get salesmen => _salesmen;
  String? get deliverWarehouseId => _deliverWarehouseId;

  double get unpaidTotal {
    final seen = <String>{};
    var unpaid = 0.0;
    for (final row in _serverLines) {
      if (!seen.add(row.purchaseOrderId)) continue;
      unpaid += row.remainingBalance;
    }
    return unpaid;
  }

  Stream<List<LocalPurchase>> watchPurchases() =>
      _purchaseService.watchLocalPurchases();

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

  void setDeliverWarehouseId(String? id) {
    _deliverWarehouseId = id;
    notifyListeners();
  }

  Future<void> setFilters(PurchaseFilters next) async {
    _filters = next;
    notifyListeners();
    await refreshLists();
  }

  Future<void> refreshLists({Map<String, dynamic>? user}) async {
    _listLoading = true;
    _listError = null;
    notifyListeners();

    try {
      if (_sync.isOperatingOnline) {
        if (!await _sync.ensureAuthenticated()) {
          _listError =
              'Not signed in — log in again to load purchases from server';
          return;
        }
        await _sync.refreshCache();
        final report = await _purchaseService.fetchServerPurchases(
          filters: _filters,
        );
        _serverLines = report.lines;
        _totals = report.totals;
        _summary = await _purchaseService.fetchUndeliveredSummary();
        if (PermissionHelper.isOwner(user)) {
          try {
            _salesmen = await _purchaseService.fetchTeamSalesmen();
          } catch (_) {
            _salesmen = [];
          }
        }
        ApiLogger.info('Loaded ${_serverLines.length} purchase lines from server');
      } else {
        _serverLines = [];
        _totals = PurchaseReportTotals(amount: 0, quantity: 0);
        _summary = PurchaseDeliverySummary.empty();
      }
    } catch (error) {
      _listError = friendlyError(error);
      ApiLogger.error('GET', ApiEndpoints.purchasesReport, error);
      if (_sync.userMode == AppOperationMode.auto) {
        _sync.markServerUnreachable();
      }
    } finally {
      _listLoading = false;
      notifyListeners();
    }
  }

  Future<List<ProductsCacheData>> products({String search = ''}) =>
      _cache.getProducts(search: search);

  Future<List<SuppliersCacheData>> suppliers() => _cache.getSuppliers();

  Future<List<PaymentMethodsCacheData>> paymentMethods() =>
      _cache.getPaymentMethods();

  Future<List<WarehousesCacheData>> warehouses() => _cache.getWarehouses();

  Future<bool> createPurchase({
    String? supplierId,
    String? walkInName,
    required String paymentMethod,
    required double paidAmount,
    required List<PurchaseLineInput> items,
  }) async {
    _busy = true;
    _error = null;
    _success = null;
    notifyListeners();

    try {
      if (_sync.isOperatingOnline) {
        try {
          await _purchaseService.createPurchase(
            online: true,
            supplierId: supplierId,
            walkInName: walkInName,
            paymentMethod: paymentMethod,
            paidAmount: paidAmount,
            items: items,
          );
          _success = 'Purchase recorded on server';
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

      await _purchaseService.createPurchase(
        online: false,
        supplierId: supplierId,
        walkInName: walkInName,
        paymentMethod: paymentMethod,
        paidAmount: paidAmount,
        items: items,
      );
      _success = _sync.userMode == AppOperationMode.offline
          ? 'Purchase saved offline'
          : 'Server unreachable — purchase saved offline, will sync later';
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

  Future<bool> saveUpdate({
    required ServerPurchaseLine row,
    required bool owner,
    required String deliveryStatus,
    String? warehouseId,
    required double quantity,
    required double payAmount,
    required String paymentMethod,
  }) async {
    _busy = true;
    _updateError = null;
    notifyListeners();

    try {
      final remaining = row.remainingBalance < 0 ? 0.0 : row.remainingBalance;
      if (payAmount < 0) {
        throw AppException('Amount to pay cannot be negative');
      }
      if (payAmount > remaining + 0.001) {
        throw AppException(
          'Amount to pay cannot exceed unpaid ${money(remaining)} ETB',
        );
      }

      if (owner) {
        await _purchaseService.updateItemDelivery(
          itemId: row.lineId,
          deliveryStatus: deliveryStatus,
          warehouseId: warehouseId,
          quantity: quantity,
        );
      }
      if (payAmount > 0) {
        await _purchaseService.recordPayment(
          purchaseOrderId: row.purchaseOrderId,
          amount: payAmount,
          paymentMethod: paymentMethod,
        );
      }
      await refreshLists();
      _busy = false;
      notifyListeners();
      return true;
    } catch (error) {
      _updateError = friendlyError(error);
      _busy = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> deliverAll() async {
    final warehouseId = _deliverWarehouseId;
    if (warehouseId == null || warehouseId.isEmpty) {
      _listError = 'Choose a warehouse to deliver into';
      notifyListeners();
      return false;
    }
    _busy = true;
    _listError = null;
    notifyListeners();
    try {
      await _purchaseService.deliverAll(warehouseId: warehouseId);
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
