import 'package:flutter/foundation.dart';

import '../../../constants/app_mode.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/services/api_logger.dart';
import '../../../database/app_database.dart';
import '../../../models/team_models.dart';
import '../../../network/api_endpoints.dart';
import '../../../services/cache_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../services/team_service.dart';

class TeamProvider extends ChangeNotifier {
  TeamProvider({
    required TeamService teamService,
    required CacheService cache,
    required SyncProvider sync,
  })  : _teamService = teamService,
        _cache = cache,
        _sync = sync;

  final TeamService _teamService;
  final CacheService _cache;
  final SyncProvider _sync;

  bool _loading = false;
  bool _busy = false;
  String? _error;
  List<SalesmanRow> _salesmen = [];
  List<WarehousesCacheData> _warehouses = [];

  bool get loading => _loading;
  bool get busy => _busy;
  String? get error => _error;
  List<SalesmanRow> get salesmen => _salesmen;
  List<WarehousesCacheData> get warehouses => _warehouses;

  Future<void> refresh() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      if (!_sync.isOperatingOnline) {
        _error = 'Salesmen require online mode';
        _salesmen = [];
        return;
      }
      if (!await _sync.ensureAuthenticated()) {
        _error = 'Not signed in — log in again';
        return;
      }
      await _sync.refreshCache();
      _warehouses = await _cache.getWarehouses();
      _salesmen = await _teamService.fetchSalesmen();
    } catch (error) {
      _error = friendlyError(error);
      ApiLogger.error('GET', ApiEndpoints.team, error);
      if (_sync.userMode == AppOperationMode.auto) {
        _sync.markServerUnreachable();
      }
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> createSalesman({
    required String fullName,
    required String phone,
    required String password,
    required bool allWarehouses,
    required List<String> warehouseIds,
    required List<String> permissions,
  }) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await _teamService.createSalesman(
        fullName: fullName,
        phone: phone,
        password: password,
        allWarehouses: allWarehouses,
        warehouseIds: warehouseIds,
        permissions: permissions,
      );
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

  Future<bool> updateSalesman({
    required String id,
    required String fullName,
    required String phone,
    String? password,
    required bool allWarehouses,
    required List<String> warehouseIds,
    required List<String> permissions,
  }) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await _teamService.updateSalesman(
        id: id,
        fullName: fullName,
        phone: phone,
        password: password,
        allWarehouses: allWarehouses,
        warehouseIds: warehouseIds,
        permissions: permissions,
      );
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

  void clearError() {
    if (_error == null) return;
    _error = null;
    notifyListeners();
  }
}
