import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/services/api_logger.dart';
import '../../../constants/app_mode.dart';
import '../../../core/services/token_storage.dart';
import '../../../database/app_database.dart';
import '../../../network/dio_client.dart';
import '../../../services/cache_service.dart';
import '../../../sync/connectivity_service.dart';
import '../../../sync/sync_manager.dart';

enum ConnectionUiState { online, offline, syncing, synced, pending, autoOffline }

class SyncProvider extends ChangeNotifier {
  SyncProvider({
    required ConnectivityService connectivity,
    required SyncManager syncManager,
    required CacheService cacheService,
    required AppDatabase db,
    required DioClient client,
    required TokenStorage tokenStorage,
  })  : _connectivity = connectivity,
        _syncManager = syncManager,
        _cacheService = cacheService,
        _db = db,
        _client = client,
        _tokenStorage = tokenStorage {
    _init();
  }

  final ConnectivityService _connectivity;
  final SyncManager _syncManager;
  final CacheService _cacheService;
  final AppDatabase _db;
  final DioClient _client;
  final TokenStorage _tokenStorage;

  AppOperationMode _userMode = AppOperationMode.auto;
  bool _deviceOnline = true;
  bool _serverReachable = true;
  bool _autoFallbackActive = false;
  bool _syncing = false;
  int _pending = 0;
  String? _message;

  AppOperationMode get userMode => _userMode;
  bool get deviceOnline => _deviceOnline;
  bool get serverReachable => _serverReachable;
  bool get autoFallbackActive => _autoFallbackActive;
  bool get syncing => _syncing;
  int get pendingCount => _pending;
  String? get message => _message;

  /// Whether reads/writes should hit the API (like the React web app).
  bool get isOperatingOnline {
    if (_userMode == AppOperationMode.offline) return false;
    if (_userMode == AppOperationMode.online) {
      return _deviceOnline;
    }
    return _deviceOnline && _serverReachable && !_autoFallbackActive;
  }

  ConnectionUiState get uiState {
    if (_syncing) return ConnectionUiState.syncing;
    if (_userMode == AppOperationMode.offline) {
      return _pending > 0 ? ConnectionUiState.pending : ConnectionUiState.offline;
    }
    if (_userMode == AppOperationMode.auto && _autoFallbackActive) {
      return _pending > 0 ? ConnectionUiState.pending : ConnectionUiState.autoOffline;
    }
    if (!isOperatingOnline) {
      return ConnectionUiState.offline;
    }
    if (_pending > 0) return ConnectionUiState.pending;
    return ConnectionUiState.synced;
  }

  String get modeLabel => switch (_userMode) {
        AppOperationMode.auto =>
          _autoFallbackActive ? 'Auto · offline fallback' : 'Auto · online',
        AppOperationMode.online => 'Online',
        AppOperationMode.offline => 'Offline',
      };

  Future<bool> ensureAuthenticated() async {
    await _client.loadSession();
    return _client.hasSession();
  }

  Future<void> _init() async {
    final saved = await _tokenStorage.operationMode;
    _userMode = AppOperationModeX.parse(saved);

    _deviceOnline = await _connectivity.isOnline;
    _pending = await _db.pendingCount();
    notifyListeners();

    if (_deviceOnline && _userMode != AppOperationMode.offline) {
      await _probeServer(silent: true);
    }

    _connectivity.onConnectivityChanged.listen((_) async {
      final wasOffline = !_deviceOnline;
      _deviceOnline = await _connectivity.isOnline;
      if (_deviceOnline) {
        await _probeServer(silent: true);
        if (wasOffline) {
          _autoFallbackActive = false;
          await refreshCache();
          await syncNow();
        }
      } else {
        _serverReachable = false;
        if (_userMode == AppOperationMode.auto) {
          _autoFallbackActive = true;
        }
      }
      notifyListeners();
    });

    _db.select(_db.localPurchases).watch().listen((_) async {
      _pending = await _db.pendingCount();
      notifyListeners();
    });
    _db.select(_db.localSales).watch().listen((_) async {
      _pending = await _db.pendingCount();
      notifyListeners();
    });

    if (isOperatingOnline) {
      // Defer heavy network work so the first frame is not blocked.
      unawaited(_bootstrapOnline());
    }
  }

  Future<void> _bootstrapOnline() async {
    if (!await ensureAuthenticated()) {
      ApiLogger.info('Skipping online bootstrap — not logged in');
      return;
    }
    try {
      await refreshCache();
      await syncNow();
    } catch (_) {
      // Errors are surfaced via [message] inside each method.
    }
  }

  /// Call after login when the home shell opens.
  Future<void> onAuthenticated() async {
    await _client.loadSession();
    if (!await ensureAuthenticated()) {
      _message = 'Not signed in — log in again to load server data';
      notifyListeners();
      return;
    }
    if (isOperatingOnline) {
      await _bootstrapOnline();
    }
    notifyListeners();
  }

  Future<void> setUserMode(AppOperationMode mode) async {
    _userMode = mode;
    await _tokenStorage.saveOperationMode(mode.storageValue);
    _autoFallbackActive = false;
    if (mode == AppOperationMode.offline) {
      _message = 'Offline mode — data saved on this device';
    } else if (mode == AppOperationMode.online) {
      _message = 'Online mode — using server like the web app';
      if (_deviceOnline) {
        await _probeServer();
        await refreshCache();
        await syncNow();
      }
    } else {
      _message = 'Auto mode — online first, offline if connection fails';
      if (_deviceOnline) {
        await _probeServer(silent: true);
        if (isOperatingOnline) {
          await refreshCache();
          await syncNow();
        }
      }
    }
    notifyListeners();
  }

  Future<bool> _probeServer({bool silent = false}) async {
    if (!_deviceOnline || _userMode == AppOperationMode.offline) {
      _serverReachable = false;
      return false;
    }
    try {
      await _client.testConnection();
      _serverReachable = true;
      if (_userMode == AppOperationMode.auto) {
        _autoFallbackActive = false;
      }
      if (!silent) {
        _message = 'Connected to server';
      }
      notifyListeners();
      return true;
    } catch (_) {
      _serverReachable = false;
      if (_userMode == AppOperationMode.auto) {
        _autoFallbackActive = true;
        if (!silent) {
          _message = 'Server unreachable — working offline until connection returns';
        }
      }
      notifyListeners();
      return false;
    }
  }

  void markServerUnreachable() {
    _serverReachable = false;
    if (_userMode == AppOperationMode.auto) {
      _autoFallbackActive = true;
      _message = 'Connection failed — saved offline, will sync when online';
    }
    notifyListeners();
  }

  void clearAutoFallback() {
    _autoFallbackActive = false;
    notifyListeners();
  }

  Future<bool> refreshCache() async {
    if (!isOperatingOnline) return false;
    if (!await ensureAuthenticated()) {
      _message = 'Not signed in — log in again to load catalog';
      notifyListeners();
      return false;
    }
    try {
      await _cacheService.refreshAll();
      _message = 'Catalog updated from server';
      notifyListeners();
      return true;
    } catch (error) {
      if (_userMode == AppOperationMode.online) {
        _message = 'Failed to load server data: ${friendlyError(error, serverUrl: _client.baseUrl)}';
      } else {
        markServerUnreachable();
      }
      notifyListeners();
      return false;
    }
  }

  Future<void> syncNow() async {
    if (!isOperatingOnline && _userMode != AppOperationMode.auto) {
      _message = 'Offline mode — sync when you switch to Auto or Online';
      notifyListeners();
      return;
    }
    if (!_deviceOnline) {
      _message = 'No network — working offline';
      notifyListeners();
      return;
    }
    _syncing = true;
    _message = 'Synchronizing...';
    notifyListeners();
    try {
      await _syncManager.syncNow();
      _pending = await _db.pendingCount();
      _message = _pending > 0 ? '$_pending waiting to sync' : 'All data synchronized';
    } catch (error) {
      final text = friendlyError(error, serverUrl: _client.baseUrl);
      _message = text.contains('Invalid username or password')
          ? 'Session expired — please log in again'
          : text;
    } finally {
      _syncing = false;
      notifyListeners();
    }
  }
}
