import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  TokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(
                encryptedSharedPreferences: true,
              ),
            );

  final FlutterSecureStorage _storage;

  static const _accessKey = 'access_token';
  static const _refreshKey = 'refresh_token';
  static const _baseUrlKey = 'api_base_url';
  static const _operationModeKey = 'app_operation_mode';
  static const _userKey = 'cached_user_json';

  Future<String?> get accessToken => _storage.read(key: _accessKey);
  Future<String?> get refreshToken => _storage.read(key: _refreshKey);
  Future<String?> get baseUrl => _storage.read(key: _baseUrlKey);

  Future<bool> get hasRefreshToken async {
    final token = await refreshToken;
    return token != null && token.isNotEmpty;
  }

  Future<bool> get hasAnyToken async {
    final access = await accessToken;
    if (access != null && access.isNotEmpty) return true;
    return hasRefreshToken;
  }

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _accessKey, value: accessToken);
    await _storage.write(key: _refreshKey, value: refreshToken);
  }

  Future<void> saveAccessToken(String accessToken) async {
    await _storage.write(key: _accessKey, value: accessToken);
  }

  Future<void> saveUser(Map<String, dynamic> user) async {
    await _storage.write(key: _userKey, value: jsonEncode(user));
  }

  Future<Map<String, dynamic>?> loadUser() async {
    final raw = await _storage.read(key: _userKey);
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) return decoded;
      if (decoded is Map) return Map<String, dynamic>.from(decoded);
    } catch (_) {}
    return null;
  }

  Future<void> clearUser() async {
    await _storage.delete(key: _userKey);
  }

  Future<void> saveBaseUrl(String url) async {
    await _storage.write(key: _baseUrlKey, value: url);
  }

  Future<String?> get operationMode => _storage.read(key: _operationModeKey);

  Future<void> saveOperationMode(String mode) async {
    await _storage.write(key: _operationModeKey, value: mode);
  }

  /// Seeds or refreshes the API base URL in secure storage.
  Future<void> ensureBaseUrl(String defaultUrl, {bool force = false}) async {
    final saved = await baseUrl;
    if (force || saved == null || saved.isEmpty) {
      await saveBaseUrl(defaultUrl);
    }
  }

  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _userKey);
  }
}
