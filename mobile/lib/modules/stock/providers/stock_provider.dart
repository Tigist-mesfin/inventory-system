import 'package:flutter/foundation.dart';

import '../../../constants/app_mode.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/services/api_logger.dart';
import '../../../database/app_database.dart';
import '../../../models/stock_models.dart';
import '../../../network/api_endpoints.dart';
import '../../../services/cache_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../services/stock_service.dart';

enum StockViewMode { delivered, undelivered }

class StockProvider extends ChangeNotifier {
  StockProvider({
    required StockService stockService,
    required CacheService cache,
    required SyncProvider sync,
  })  : _stockService = stockService,
        _cache = cache,
        _sync = sync;

  final StockService _stockService;
  final CacheService _cache;
  final SyncProvider _sync;

  bool _loading = false;
  bool _busy = false;
  String? _error;
  StockViewMode _view = StockViewMode.delivered;
  bool _showAllColumns = false;
  StockFilters _filters = const StockFilters();
  StockOverview _overview = StockOverview.empty();
  List<StockItemRow> _items = [];
  List<UndeliveredStockRow> _undelivered = [];
  List<WarehousesCacheData> _warehouses = [];
  String? _deliverWarehouseId;
  final Map<String, String> _rowWarehouse = {};

  bool get loading => _loading;
  bool get busy => _busy;
  String? get error => _error;
  StockViewMode get view => _view;
  bool get showAllColumns => _showAllColumns;
  StockFilters get filters => _filters;
  StockOverview get overview => _overview;
  List<StockItemRow> get items => _items;
  List<UndeliveredStockRow> get undelivered => _undelivered;
  List<WarehousesCacheData> get warehouses => _warehouses;
  String? get deliverWarehouseId => _deliverWarehouseId;

  List<StockOverviewStore> get storeCards {
    if (_warehouses.isEmpty) return _overview.stores;
    return _warehouses.map((store) {
      StockOverviewStore? stats;
      for (final row in _overview.stores) {
        if (row.warehouseId == store.id) {
          stats = row;
          break;
        }
      }
      return StockOverviewStore(
        warehouseId: store.id,
        name: store.name,
        itemCount: stats?.itemCount ?? 0,
        quantity: stats?.quantity ?? 0,
      );
    }).toList();
  }

  List<StockItemRow> get visibleDelivered => rankStockRows(
        _items,
        _filters.search,
        nameOf: (row) => row.name,
        hayOf: (row) =>
            '${row.name} ${row.sku} ${row.brand} ${row.size} ${row.color}',
      );

  List<UndeliveredStockRow> get visibleUndelivered => rankStockRows(
        _undelivered,
        _filters.search,
        nameOf: (row) => row.productName,
        hayOf: (row) =>
            '${row.productName} ${row.party} ${row.document}',
      );

  ({int count, double units}) get totals {
    if (_view == StockViewMode.undelivered) {
      final rows = visibleUndelivered;
      final units = rows.fold<double>(
        0,
        (sum, row) => sum + row.remainingQuantity,
      );
      return (count: rows.length, units: units);
    }
    final rows = visibleDelivered;
    final units = rows.fold<double>(
      0,
      (sum, row) => sum + row.qtyInStore(_filters.warehouseId),
    );
    return (count: rows.length, units: units);
  }

  Map<String, double> get undeliveredByProduct {
    final map = <String, double>{};
    for (final row in _undelivered) {
      map[row.productId] =
          (map[row.productId] ?? 0) + row.remainingQuantity;
    }
    return map;
  }

  String warehouseForRow(String rowId) =>
      _rowWarehouse[rowId] ?? _deliverWarehouseId ?? '';

  void setRowWarehouse(String rowId, String warehouseId) {
    _rowWarehouse[rowId] = warehouseId;
    notifyListeners();
  }

  void setDeliverWarehouseId(String? id) {
    _deliverWarehouseId = id;
    notifyListeners();
  }

  void setView(StockViewMode view) {
    _view = view;
    notifyListeners();
  }

  void setShowAllColumns(bool value) {
    _showAllColumns = value;
    notifyListeners();
  }

  Future<void> setFilters(StockFilters next) async {
    final reload = next.warehouseId != _filters.warehouseId ||
        next.from != _filters.from ||
        next.to != _filters.to ||
        next.lowStock != _filters.lowStock;
    _filters = next;
    notifyListeners();
    if (reload) await refresh();
  }

  Future<void> toggleWarehouseFilter(String warehouseId) async {
    final next = _filters.warehouseId == warehouseId ? '' : warehouseId;
    await setFilters(_filters.copyWith(warehouseId: next, lowStock: false));
    _view = StockViewMode.delivered;
    notifyListeners();
  }

  Future<void> toggleLowStock() async {
    _view = StockViewMode.delivered;
    await setFilters(_filters.copyWith(lowStock: !_filters.lowStock));
  }

  Future<void> refresh() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      if (!_sync.isOperatingOnline) {
        _error = 'Live stock requires online mode';
        _items = [];
        _undelivered = [];
        _overview = StockOverview.empty();
        return;
      }
      if (!await _sync.ensureAuthenticated()) {
        _error = 'Not signed in — log in again to load live stock';
        return;
      }
      await _sync.refreshCache();
      _warehouses = await _cache.getWarehouses();
      if (_deliverWarehouseId == null && _warehouses.isNotEmpty) {
        _deliverWarehouseId = _warehouses.first.id;
      }
      final results = await Future.wait([
        _stockService.fetchByItem(filters: _filters),
        _stockService.fetchOverview(),
        _stockService.fetchUndelivered(),
      ]);
      _items = results[0] as List<StockItemRow>;
      _overview = results[1] as StockOverview;
      _undelivered = results[2] as List<UndeliveredStockRow>;
      ApiLogger.info('Loaded ${_items.length} stock items');
    } catch (error) {
      _error = friendlyError(error);
      ApiLogger.error('GET', ApiEndpoints.inventoryByItem, error);
      if (_sync.userMode == AppOperationMode.auto) {
        _sync.markServerUnreachable();
      }
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> adjustOnHand({
    required String productId,
    required String warehouseId,
    required double quantity,
  }) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await _stockService.adjustOnHand(
        productId: productId,
        warehouseId: warehouseId,
        quantity: quantity,
      );
      await refresh();
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

  Future<bool> deliverAll() async {
    final warehouseId = _deliverWarehouseId;
    if (warehouseId == null || warehouseId.isEmpty) {
      _error = 'Choose a store to deliver into';
      notifyListeners();
      return false;
    }
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await _stockService.deliverAll(warehouseId: warehouseId);
      await refresh();
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

  Future<bool> deliverOne(UndeliveredStockRow row) async {
    final warehouseId = warehouseForRow(row.id);
    if (warehouseId.isEmpty) {
      _error = 'Choose a store to deliver into';
      notifyListeners();
      return false;
    }
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await _stockService.deliverItem(
        itemId: row.id,
        warehouseId: warehouseId,
        quantity: row.quantity,
      );
      await refresh();
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
}
