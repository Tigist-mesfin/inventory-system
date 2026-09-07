import 'package:flutter/foundation.dart';

import '../../../core/errors/app_exception.dart';
import '../../../network/dio_client.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  AuthProvider({
    required AuthService authService,
    required DioClient client,
  })  : _authService = authService,
        _client = client;

  final AuthService _authService;
  final DioClient _client;

  Map<String, dynamic>? _user;
  bool _loading = true;
  bool _testingConnection = false;
  String? _error;
  String? _connectionMessage;
  String _baseUrl = '';

  Map<String, dynamic>? get user => _user;
  bool get loading => _loading;
  bool get testingConnection => _testingConnection;
  String? get error => _error;
  String? get connectionMessage => _connectionMessage;
  bool get isAuthenticated => _user != null;
  String get baseUrl => _baseUrl;

  bool can(String module, String action) =>
      PermissionHelper.can(_user, module, action);

  Future<void> bootstrap() async {
    _loading = true;
    notifyListeners();
    await _client.initBaseUrl();
    await _client.loadSession();
    _baseUrl = _client.baseUrl;
    try {
      // Stay logged in until refresh token expires; only then show login.
      _user = await _authService.restoreSession();
    } catch (_) {
      _user = null;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> testConnection(String baseUrl) async {
    _testingConnection = true;
    _connectionMessage = null;
    _error = null;
    notifyListeners();
    try {
      final message = await _client.testConnection(overrideBaseUrl: baseUrl);
      _connectionMessage = message;
      _testingConnection = false;
      notifyListeners();
      return true;
    } catch (error) {
      _error = friendlyError(error, serverUrl: baseUrl.trim());
      _testingConnection = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> login({
    required String username,
    required String password,
    String? baseUrl,
  }) async {
    _error = null;
    _connectionMessage = null;
    _loading = true;
    notifyListeners();
    try {
      if (baseUrl != null && baseUrl.trim().isNotEmpty) {
        await _client.updateBaseUrl(baseUrl.trim());
        _baseUrl = _client.baseUrl;
      }
      _user = await _authService.login(username: username, password: password);
      if (!await _client.hasSession()) {
        throw AppException('Login succeeded but session could not be verified.');
      }
      _loading = false;
      notifyListeners();
      return true;
    } catch (error) {
      _error = friendlyError(error, serverUrl: _client.baseUrl);
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> registerCompany({
    required String name,
    required String phone,
    required String password,
    String address = '',
    String? baseUrl,
  }) async {
    _error = null;
    _connectionMessage = null;
    _loading = true;
    notifyListeners();
    try {
      if (baseUrl != null && baseUrl.trim().isNotEmpty) {
        await _client.updateBaseUrl(baseUrl.trim());
        _baseUrl = _client.baseUrl;
      }
      _user = await _authService.registerCompany(
        name: name,
        phone: phone,
        password: password,
        address: address,
      );
      if (!await _client.hasSession()) {
        throw AppException(
          'Registration succeeded but session could not be verified.',
        );
      }
      _loading = false;
      notifyListeners();
      return true;
    } catch (error) {
      _error = friendlyError(error, serverUrl: _client.baseUrl);
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  void clearError() {
    if (_error == null) return;
    _error = null;
    notifyListeners();
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    notifyListeners();
  }
}
