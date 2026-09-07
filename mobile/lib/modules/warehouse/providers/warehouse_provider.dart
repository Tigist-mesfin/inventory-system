import 'package:flutter/foundation.dart';

import '../../../core/errors/app_exception.dart';
import '../../../services/cache_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../services/warehouse_service.dart';

class WarehouseProvider extends ChangeNotifier {
  WarehouseProvider({
    required WarehouseService warehouseService,
    required CacheService cache,
    required SyncProvider sync,
  })  : _warehouseService = warehouseService,
        _cache = cache,
        _sync = sync;

  final WarehouseService _warehouseService;
  final CacheService _cache;
  final SyncProvider _sync;

  bool _loading = false;
  bool _busy = false;
  String? _error;
  List<WarehouseRow> _warehouses = [];

  bool get loading => _loading;
  bool get busy => _busy;
  String? get error => _error;
  List<WarehouseRow> get warehouses => _warehouses;

  Future<void> refresh() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      if (!_sync.isOperatingOnline) {
        _error = 'Warehouses require online mode';
        return;
      }
      if (!await _sync.ensureAuthenticated()) {
        _error = 'Not signed in — log in again';
        return;
      }
      _warehouses = await _warehouseService.fetchWarehouses();
    } catch (error) {
      _error = friendlyError(error);
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> createWarehouse(String name) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await _warehouseService.createWarehouse(name);
      try {
        await _cache.refreshWarehouses();
      } catch (_) {}
      await refresh();
      return true;
    } catch (error) {
      _error = friendlyError(error);
      return false;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }
}
