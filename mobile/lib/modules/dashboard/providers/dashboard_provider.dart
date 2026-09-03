import 'package:flutter/foundation.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/services/api_logger.dart';
import '../../sync/providers/sync_provider.dart';
import '../../../sync/sync_manager.dart';

class DashboardProvider extends ChangeNotifier {
  DashboardProvider({
    required SyncManager syncManager,
    required SyncProvider sync,
  })  : _syncManager = syncManager,
        _sync = sync;

  final SyncManager _syncManager;
  final SyncProvider _sync;

  Map<String, dynamic>? _data;
  bool _loading = false;
  String? _error;

  Map<String, dynamic>? get data => _data;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> load() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      if (!_sync.isOperatingOnline) {
        _error = 'Dashboard needs an online connection.';
        _data = null;
        return;
      }
      final dashboard = await _syncManager.fetchDashboard();
      if (dashboard == null) {
        _error = 'Could not load dashboard from the server.';
        _data = null;
      } else {
        _data = dashboard;
      }
    } catch (error) {
      ApiLogger.error('GET', '/api/insights/dashboard', error);
      _error = friendlyError(error);
      if (_data == null) {
        _sync.markServerUnreachable();
      }
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}
