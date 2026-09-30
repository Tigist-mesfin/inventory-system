import 'package:flutter/foundation.dart';

import '../../../core/errors/app_exception.dart';
import '../../../network/dio_client.dart';
import '../models/otp_models.dart';
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
  bool _deletingAccount = false;
  String? _error;
  String? _errorCode;
  String? _connectionMessage;
  String _baseUrl = '';
  String? _pendingResetToken;

  Map<String, dynamic>? get user => _user;
  bool get loading => _loading;
  bool get testingConnection => _testingConnection;
  bool get deletingAccount => _deletingAccount;
  String? get error => _error;
  String? get errorCode => _errorCode;
  String? get connectionMessage => _connectionMessage;
  bool get isAuthenticated => _user != null;
  String get baseUrl => _baseUrl;
  String? get pendingResetToken => _pendingResetToken;

  bool can(String module, String action) =>
      PermissionHelper.can(_user, module, action);

  Future<void> bootstrap() async {
    _loading = true;
    notifyListeners();
    await _client.initBaseUrl();
    await _client.loadSession();
    _baseUrl = _client.baseUrl;
    try {
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
    _errorCode = null;
    notifyListeners();
    try {
      final message = await _client.testConnection(overrideBaseUrl: baseUrl);
      _connectionMessage = message;
      _testingConnection = false;
      notifyListeners();
      return true;
    } catch (error) {
      _setError(error);
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
    _errorCode = null;
    _connectionMessage = null;
    _loading = true;
    notifyListeners();
    try {
      await _maybeUpdateBaseUrl(baseUrl);
      _user = await _authService.login(username: username, password: password);
      if (!await _client.hasSession()) {
        throw AppException('Login succeeded but session could not be verified.');
      }
      _loading = false;
      notifyListeners();
      return true;
    } catch (error) {
      _setError(error);
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  /// Starts registration and sends OTP. Does not authenticate.
  Future<OtpChallenge?> registerCompany({
    required String name,
    required String phone,
    required String password,
    String address = '',
    String? baseUrl,
  }) async {
    _error = null;
    _errorCode = null;
    _connectionMessage = null;
    _loading = true;
    notifyListeners();
    try {
      await _maybeUpdateBaseUrl(baseUrl);
      final challenge = await _authService.registerCompany(
        name: name,
        phone: phone,
        password: password,
        address: address,
      );
      _loading = false;
      notifyListeners();
      return challenge;
    } catch (error) {
      _setError(error);
      _loading = false;
      notifyListeners();
      return null;
    }
  }

  Future<bool> verifyRegistrationOtp({
    required String phone,
    required String otp,
  }) async {
    _error = null;
    _errorCode = null;
    _loading = true;
    notifyListeners();
    try {
      _user = await _authService.verifyRegistrationOtp(phone: phone, otp: otp);
      if (_user == null || _user!.isEmpty || !await _client.hasSession()) {
        throw AppException('Verification succeeded but session is missing.');
      }
      _loading = false;
      notifyListeners();
      return true;
    } catch (error) {
      _setError(error);
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<OtpChallenge?> resendRegistrationOtp({required String phone}) async {
    return _runOtpSend(() => _authService.resendRegistrationOtp(phone: phone));
  }

  Future<OtpChallenge?> requestLoginOtp({
    required String phone,
    String? baseUrl,
  }) async {
    return _runOtpSend(() async {
      await _maybeUpdateBaseUrl(baseUrl);
      return _authService.requestLoginOtp(phone: phone);
    });
  }

  Future<bool> verifyLoginOtp({
    required String phone,
    required String otp,
  }) async {
    _error = null;
    _errorCode = null;
    _loading = true;
    notifyListeners();
    try {
      _user = await _authService.verifyLoginOtp(phone: phone, otp: otp);
      if (!await _client.hasSession()) {
        throw AppException('Login succeeded but session could not be verified.');
      }
      _loading = false;
      notifyListeners();
      return true;
    } catch (error) {
      _setError(error);
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<OtpChallenge?> requestPasswordResetOtp({
    required String phone,
    String? baseUrl,
  }) async {
    _pendingResetToken = null;
    return _runOtpSend(() async {
      await _maybeUpdateBaseUrl(baseUrl);
      return _authService.requestPasswordResetOtp(phone: phone);
    });
  }

  Future<String?> verifyPasswordResetOtp({
    required String phone,
    required String otp,
  }) async {
    _error = null;
    _errorCode = null;
    _loading = true;
    notifyListeners();
    try {
      final token = await _authService.verifyPasswordResetOtp(
        phone: phone,
        otp: otp,
      );
      _pendingResetToken = token;
      _loading = false;
      notifyListeners();
      return token;
    } catch (error) {
      _setError(error);
      _loading = false;
      notifyListeners();
      return null;
    }
  }

  Future<bool> resetPassword({
    required String newPassword,
    String? resetToken,
  }) async {
    _error = null;
    _errorCode = null;
    _loading = true;
    notifyListeners();
    try {
      final token = resetToken ?? _pendingResetToken;
      if (token == null || token.isEmpty) {
        throw AppException(
          'Verify the OTP before resetting your password.',
          code: 'RESET_TOKEN_REQUIRED',
        );
      }
      await _authService.resetPassword(
        resetToken: token,
        newPassword: newPassword,
      );
      _pendingResetToken = null;
      _loading = false;
      notifyListeners();
      return true;
    } catch (error) {
      _setError(error);
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<OtpChallenge?> resendOtp({
    required OtpPurpose purpose,
    required String phone,
  }) async {
    switch (purpose) {
      case OtpPurpose.registration:
        return resendRegistrationOtp(phone: phone);
      case OtpPurpose.login:
        return requestLoginOtp(phone: phone);
      case OtpPurpose.passwordReset:
        return requestPasswordResetOtp(phone: phone);
    }
  }

  Future<bool> verifyOtp({
    required OtpPurpose purpose,
    required String phone,
    required String otp,
  }) async {
    switch (purpose) {
      case OtpPurpose.registration:
        return verifyRegistrationOtp(phone: phone, otp: otp);
      case OtpPurpose.login:
        return verifyLoginOtp(phone: phone, otp: otp);
      case OtpPurpose.passwordReset:
        final token = await verifyPasswordResetOtp(phone: phone, otp: otp);
        return token != null;
    }
  }

  /// Seconds to wait before another OTP send, from last error or default.
  int resendCooldownSeconds({int fallback = 60}) {
    if (_errorCode == 'OTP_RESEND_COOLDOWN' || _error != null) {
      return otpResendCooldownSeconds(
        error: AppException(_error ?? '', code: _errorCode),
        fallback: fallback,
      );
    }
    return fallback;
  }

  void clearError() {
    if (_error == null && _errorCode == null) return;
    _error = null;
    _errorCode = null;
    notifyListeners();
  }

  void clearPendingResetToken() {
    _pendingResetToken = null;
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    _pendingResetToken = null;
    notifyListeners();
  }

  /// Deletes the current account on the server, then clears local session state.
  /// Returns false and sets [error] when deletion fails (account remains intact).
  Future<bool> deleteAccount({required String password}) async {
    if (_deletingAccount) return false;
    _deletingAccount = true;
    _error = null;
    _errorCode = null;
    _loading = true;
    notifyListeners();
    try {
      await _authService.deleteAccount(password: password);
      _user = null;
      _pendingResetToken = null;
      _loading = false;
      _deletingAccount = false;
      notifyListeners();
      return true;
    } catch (error) {
      _setError(error);
      _loading = false;
      _deletingAccount = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> _maybeUpdateBaseUrl(String? baseUrl) async {
    if (baseUrl != null && baseUrl.trim().isNotEmpty) {
      await _client.updateBaseUrl(baseUrl.trim());
      _baseUrl = _client.baseUrl;
    }
  }

  void _setError(Object error) {
    _error = friendlyError(error, serverUrl: _client.baseUrl);
    _errorCode = error is AppException ? error.code : null;
  }

  Future<OtpChallenge?> _runOtpSend(
    Future<OtpChallenge> Function() action,
  ) async {
    _error = null;
    _errorCode = null;
    _loading = true;
    notifyListeners();
    try {
      final challenge = await action();
      _loading = false;
      notifyListeners();
      return challenge;
    } catch (error) {
      _setError(error);
      _loading = false;
      notifyListeners();
      return null;
    }
  }
}
