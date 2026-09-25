import '../../../core/errors/app_exception.dart';
import '../../../core/services/api_logger.dart';
import '../../../core/services/auth_token_parser.dart';
import '../../../core/services/token_storage.dart';
import '../../../network/api_endpoints.dart';
import '../../../network/dio_client.dart';
import '../models/otp_models.dart';

class AuthService {
  AuthService({
    required DioClient client,
    required TokenStorage tokenStorage,
  })  : _client = client,
        _tokenStorage = tokenStorage;

  final DioClient _client;
  final TokenStorage _tokenStorage;

  Future<Map<String, dynamic>> login({
    required String username,
    required String password,
  }) async {
    final result = await _client.postAuth(
      ApiEndpoints.authLogin,
      body: {'username': username, 'password': password},
    );
    return _finalizeAuthSession(result);
  }

  /// Starts registration: creates PENDING user and sends REGISTRATION OTP.
  /// Does not establish a session.
  Future<OtpChallenge> registerCompany({
    required String name,
    required String phone,
    required String password,
    String address = '',
  }) async {
    final response = await _client.post(
      ApiEndpoints.authRegisterCompany,
      body: {
        'name': name,
        'phone': phone,
        'password': password,
        if (address.trim().isNotEmpty) 'address': address.trim(),
      },
    );
    final data = response['data'] as Map<String, dynamic>? ?? {};
    final challenge = OtpChallenge.fromJson(data);
    if (challenge.phone.isEmpty) {
      throw AppException('Registration started but phone was missing.');
    }
    return challenge;
  }

  Future<Map<String, dynamic>> verifyRegistrationOtp({
    required String phone,
    required String otp,
  }) async {
    final result = await _client.postAuth(
      ApiEndpoints.authRegisterVerifyOtp,
      body: {'phone': phone, 'otp': otp},
    );
    return _finalizeAuthSession(result);
  }

  Future<OtpChallenge> resendRegistrationOtp({required String phone}) async {
    final response = await _client.post(
      ApiEndpoints.authRegisterResendOtp,
      body: {'phone': phone},
    );
    final data = response['data'] as Map<String, dynamic>? ?? {};
    return OtpChallenge.fromJson(data);
  }

  Future<OtpChallenge> requestLoginOtp({required String phone}) async {
    final response = await _client.post(
      ApiEndpoints.authLoginOtpRequest,
      body: {'phone': phone},
    );
    final data = response['data'] as Map<String, dynamic>? ?? {};
    return OtpChallenge.fromJson(data);
  }

  Future<Map<String, dynamic>> verifyLoginOtp({
    required String phone,
    required String otp,
  }) async {
    final result = await _client.postAuth(
      ApiEndpoints.authLoginOtpVerify,
      body: {'phone': phone, 'otp': otp},
    );
    return _finalizeAuthSession(result);
  }

  Future<OtpChallenge> requestPasswordResetOtp({required String phone}) async {
    final response = await _client.post(
      ApiEndpoints.authForgotPassword,
      body: {'phone': phone},
    );
    final data = response['data'] as Map<String, dynamic>? ?? {};
    return OtpChallenge.fromJson(data);
  }

  Future<String> verifyPasswordResetOtp({
    required String phone,
    required String otp,
  }) async {
    final response = await _client.post(
      ApiEndpoints.authForgotPasswordVerifyOtp,
      body: {'phone': phone, 'otp': otp},
    );
    final data = response['data'] as Map<String, dynamic>? ?? {};
    final resetToken = data['resetToken']?.toString();
    if (resetToken == null || resetToken.isEmpty) {
      throw AppException('OTP verified but reset token was missing.');
    }
    return resetToken;
  }

  Future<void> resetPassword({
    required String resetToken,
    required String newPassword,
  }) async {
    await _client.post(
      ApiEndpoints.authResetPassword,
      body: {
        'resetToken': resetToken,
        'newPassword': newPassword,
      },
    );
  }

  Future<Map<String, dynamic>> _finalizeAuthSession(
    ({Map<String, dynamic> envelope, AuthTokens tokens}) result,
  ) async {
    final data = result.envelope['data'] as Map<String, dynamic>? ?? {};
    final tokens = result.tokens;

    if (tokens.isComplete || tokens.hasAccess) {
      await _client.setSessionTokens(
        accessToken: tokens.accessToken!,
        refreshToken: tokens.refreshToken,
      );
    } else if (await _client.hasSession()) {
      await _client.syncTokensFromCookies();
      ApiLogger.info('Auth OK via HTTP cookies only');
    } else {
      ApiLogger.info('Auth failed: no tokens in JSON, headers, or cookies');
      throw AppException(
        'Authentication succeeded but no auth token was received. '
        'Deploy the latest API to production, or check that the response returns '
        'accessToken in JSON or Set-Cookie headers.',
      );
    }

    if (!await _client.hasSession()) {
      throw AppException('Could not establish an authenticated session.');
    }

    final user = data['user'] as Map<String, dynamic>? ?? {};
    if (user.isNotEmpty) {
      await _tokenStorage.saveUser(user);
    }
    return user;
  }

  /// Restores a previous login. Returns user if still valid (or cached offline).
  /// Clears tokens only when refresh fails / session is truly expired.
  Future<Map<String, dynamic>?> restoreSession() async {
    await _client.loadSession();

    final hasTokens =
        await _tokenStorage.hasAnyToken || await _client.hasSession();
    if (!hasTokens) {
      ApiLogger.info('No stored session — login required');
      return null;
    }

    if (!_client.hasAccessToken) {
      final refreshed = await _client.refreshAccessToken();
      ApiLogger.info('Cold start refresh: ${refreshed != null}');
    }

    try {
      final user = await me();
      if (user != null) await _tokenStorage.saveUser(user);
      ApiLogger.info('Session restored via /auth/me');
      return user;
    } catch (error) {
      ApiLogger.info('Session restore /me failed: $error');

      final refreshed = await _client.refreshAccessToken();
      if (refreshed != null) {
        try {
          final user = await me();
          if (user != null) await _tokenStorage.saveUser(user);
          ApiLogger.info('Session restored after token refresh');
          return user;
        } catch (retryError) {
          ApiLogger.info('Session restore after refresh failed: $retryError');
        }
      }

      final cached = await _tokenStorage.loadUser();
      if (cached != null && !_isAuthExpiredError(error)) {
        ApiLogger.info('Using cached user profile (offline session)');
        return cached;
      }

      if (_isAuthExpiredError(error) || refreshed == null && cached == null) {
        ApiLogger.info('Session expired — clearing tokens');
        await _client.clearSession();
        await _tokenStorage.clearUser();
        return null;
      }

      if (cached != null) {
        ApiLogger.info('Keeping cached session after ambiguous auth error');
        return cached;
      }

      await _client.clearSession();
      await _tokenStorage.clearUser();
      return null;
    }
  }

  Future<Map<String, dynamic>?> me() async {
    await _client.loadSession();
    if (!_client.hasAccessToken) {
      await _client.refreshAccessToken();
    }
    if (!await _client.hasSession()) {
      throw AppException('No access token — please log in again.');
    }
    final response = await _client.get(ApiEndpoints.authMe);
    return response['data']?['user'] as Map<String, dynamic>?;
  }

  Future<void> logout() async {
    try {
      await _client.post(ApiEndpoints.authLogout);
    } catch (_) {}
    await _client.clearSession();
    await _tokenStorage.clearUser();
  }

  bool _isAuthExpiredError(Object error) {
    final text = error.toString().toLowerCase();
    return text.contains('expired') ||
        text.contains('unauthorized') ||
        text.contains('invalid or expired') ||
        text.contains('access token not found') ||
        text.contains('please log in') ||
        text.contains('session expired') ||
        text.contains('not authorized');
  }
}

class PermissionHelper {
  static bool isOwner(Map<String, dynamic>? user) {
    if (user == null) return false;
    final role = user['role'];
    final roleName = role is Map ? role['name']?.toString() : null;
    return roleName == 'COMPANY_OWNER' || roleName == 'ADMIN';
  }

  static bool can(Map<String, dynamic>? user, String module, String action) {
    if (user == null) return false;
    if (isOwner(user)) return true;
    final permissions = user['permissions'];
    if (permissions is! List) return false;
    for (final item in permissions) {
      if (item is Map &&
          item['module'] == module &&
          item['action'] == action) {
        return true;
      }
    }
    return false;
  }

  static bool canAny(
    Map<String, dynamic>? user,
    List<(String module, String action)> requirements,
  ) {
    if (user == null) return false;
    if (isOwner(user)) return true;
    return requirements.any((r) => can(user, r.$1, r.$2));
  }
}
