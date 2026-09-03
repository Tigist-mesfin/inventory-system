import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import '../core/config/app_config.dart';
import '../core/errors/app_exception.dart';
import '../core/services/api_logger.dart';
import '../core/services/auth_token_parser.dart';
import '../core/services/token_storage.dart';
import 'api_endpoints.dart';

typedef TokenRefreshCallback = Future<String?> Function();

class DioClient {
  DioClient({
    required TokenStorage tokenStorage,
    String? baseUrl,
    TokenRefreshCallback? onRefresh,
    CookieJar? cookieJar,
  })  : _tokenStorage = tokenStorage,
        _cookieJar = cookieJar ?? CookieJar() {
    _onRefresh = onRefresh;
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl ?? AppConfig.apiBaseUrl,
        connectTimeout: AppConfig.connectTimeout,
        receiveTimeout: AppConfig.receiveTimeout,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(CookieManager(_cookieJar));

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          ApiLogger.request(
            options.method,
            '${options.baseUrl}${options.path}',
            query: options.queryParameters,
          );
          await syncTokensFromCookies();
          final token = await _resolveAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
            // cPanel/Apache often strips Authorization; backend accepts this too.
            options.headers['X-Access-Token'] = token;
          } else {
            ApiLogger.info('No bearer token on ${options.path} (cookies may still auth)');
          }
          handler.next(options);
        },
        onResponse: (response, handler) {
          ApiLogger.response(
            response.requestOptions.method,
            '${response.requestOptions.baseUrl}${response.requestOptions.path}',
            response.statusCode,
          );
          handler.next(response);
        },
        onError: (error, handler) async {
          ApiLogger.error(
            error.requestOptions.method,
            '${error.requestOptions.baseUrl}${error.requestOptions.path}',
            mapDioError(error, serverUrl: baseUrl),
            stack: error.stackTrace,
          );
          if (error.response?.statusCode == 401) {
            final refreshFn = _onRefresh ?? refreshAccessToken;
            final refreshed = await refreshFn();
            if (refreshed != null && refreshed.isNotEmpty) {
              final request = error.requestOptions;
              request.headers['Authorization'] = 'Bearer $refreshed';
              request.headers['X-Access-Token'] = refreshed;
              try {
                final response = await _dio.fetch(request);
                return handler.resolve(response);
              } catch (retryError) {
                return handler.next(retryError as DioException);
              }
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  final TokenStorage _tokenStorage;
  final CookieJar _cookieJar;
  TokenRefreshCallback? _onRefresh;
  late final Dio _dio;
  String? _memoryAccessToken;

  Dio get dio => _dio;
  String get baseUrl => _dio.options.baseUrl;

  bool get hasAccessToken =>
      _memoryAccessToken != null && _memoryAccessToken!.isNotEmpty;

  Future<bool> hasSession() async {
    await syncTokensFromCookies();
    if (hasAccessToken) return true;
    if (await _cookieExists('accessToken')) return true;
    final refresh = await _tokenStorage.refreshToken;
    return refresh != null && refresh.isNotEmpty;
  }

  Future<void> loadSession() async {
    _memoryAccessToken = await _tokenStorage.accessToken;
    await syncTokensFromCookies();
    ApiLogger.info(
      'Session loaded (memory=$hasAccessToken, cookies=${await _cookieExists('accessToken')})',
    );
  }

  Future<void> syncTokensFromCookies() async {
    final cookies = await _cookiesForBaseUrl();
    String? access;
    String? refresh;
    for (final cookie in cookies) {
      if (cookie.name == 'accessToken') access = cookie.value;
      if (cookie.name == 'refreshToken') refresh = cookie.value;
    }
    if (access == null || access.isEmpty) return;

    _memoryAccessToken = access;
    if (refresh != null && refresh.isNotEmpty) {
      await _tokenStorage.saveTokens(
        accessToken: access,
        refreshToken: refresh,
      );
    } else {
      await _tokenStorage.saveAccessToken(access);
    }
  }

  Future<void> setSessionTokens({
    required String accessToken,
    String? refreshToken,
  }) async {
    _memoryAccessToken = accessToken;
    if (refreshToken != null && refreshToken.isNotEmpty) {
      await _tokenStorage.saveTokens(
        accessToken: accessToken,
        refreshToken: refreshToken,
      );
    } else {
      await _tokenStorage.saveAccessToken(accessToken);
    }
    ApiLogger.info('Session tokens stored in memory + secure storage');
  }

  Future<void> clearSession() async {
    _memoryAccessToken = null;
    await _tokenStorage.clear();
    await _cookieJar.deleteAll();
    ApiLogger.info('Session cleared');
  }

  Future<String?> _resolveAccessToken() async {
    if (_memoryAccessToken != null && _memoryAccessToken!.isNotEmpty) {
      return _memoryAccessToken;
    }
    _memoryAccessToken = await _tokenStorage.accessToken;
    if (_memoryAccessToken != null && _memoryAccessToken!.isNotEmpty) {
      return _memoryAccessToken;
    }
    await syncTokensFromCookies();
    return _memoryAccessToken;
  }

  Future<List<Cookie>> _cookiesForBaseUrl() async {
    final uri = Uri.parse(baseUrl);
    return _cookieJar.loadForRequest(uri);
  }

  Future<bool> _cookieExists(String name) async {
    final cookies = await _cookiesForBaseUrl();
    return cookies.any((c) => c.name == name && c.value.isNotEmpty);
  }

  Future<void> updateBaseUrl(String url) async {
    final normalized = _normalizeBaseUrl(url);
    _dio.options.baseUrl = normalized;
    await _tokenStorage.saveBaseUrl(normalized);
  }

  Future<void> initBaseUrl() async {
    final saved = await _tokenStorage.baseUrl;
    if (saved != null && saved.isNotEmpty) {
      _dio.options.baseUrl = _normalizeBaseUrl(saved);
    }
  }

  String _normalizeBaseUrl(String url) {
    var value = url.trim();
    while (value.endsWith('/')) {
      value = value.substring(0, value.length - 1);
    }
    return value;
  }

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    try {
      final response = await _dio.get(path, queryParameters: query);
      return _unwrap(response);
    } on DioException catch (error) {
      throw AppException(mapDioError(error, serverUrl: baseUrl));
    }
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    try {
      final response = await _dio.post(path, data: body);
      return _unwrap(response);
    } on DioException catch (error) {
      throw AppException(mapDioError(error, serverUrl: baseUrl));
    }
  }

  Future<Map<String, dynamic>> patch(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    try {
      final response = await _dio.patch(path, data: body);
      return _unwrap(response);
    } on DioException catch (error) {
      throw AppException(mapDioError(error, serverUrl: baseUrl));
    }
  }

  /// Login/register — returns JSON envelope and extracts tokens from body or cookies.
  Future<({Map<String, dynamic> envelope, AuthTokens tokens})> postAuth(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    try {
      final response = await _dio.post(path, data: body);
      final envelope = _unwrap(response);
      var tokens = extractAuthTokens(
        envelope: envelope,
        headers: response.headers,
      );
      if (!tokens.hasAccess) {
        await syncTokensFromCookies();
        if (hasAccessToken) {
          final refresh = await _tokenStorage.refreshToken;
          tokens = AuthTokens(
            accessToken: _memoryAccessToken,
            refreshToken: refresh,
          );
          ApiLogger.info('Auth tokens loaded from cookie jar after login');
        }
      } else if (tokens.isComplete) {
        ApiLogger.info('Auth tokens parsed from login JSON/headers');
      }
      return (envelope: envelope, tokens: tokens);
    } on DioException catch (error) {
      throw AppException(mapDioError(error, serverUrl: baseUrl));
    }
  }

  Future<String> testConnection({String? overrideBaseUrl}) async {
    final url = overrideBaseUrl != null
        ? _normalizeBaseUrl(overrideBaseUrl)
        : baseUrl;
    try {
      final client = Dio(
        BaseOptions(
          baseUrl: url,
          connectTimeout: const Duration(seconds: 8),
          receiveTimeout: const Duration(seconds: 8),
        ),
      );
      final response = await client.get('/health');
      final data = response.data;
      if (data is Map &&
          (data['status']?.toString().toUpperCase() == 'OK' ||
              data['server'] == 'running')) {
        return 'Connected to $url';
      }
      return 'Server responded at $url';
    } on DioException catch (error) {
      throw AppException(mapDioError(error, serverUrl: url));
    }
  }

  Map<String, dynamic> _unwrap(Response response) {
    final data = response.data;
    if (data is! Map<String, dynamic>) {
      throw AppException('Unexpected server response');
    }
    if (data['success'] == false) {
      final error = data['error'];
      final message = error is Map
          ? (error['message']?.toString() ?? 'Request failed')
          : data['message']?.toString() ?? 'Request failed';
      throw AppException(message);
    }
    return data;
  }

  Future<String?> refreshAccessToken() async {
    await syncTokensFromCookies();
    var refresh = await _tokenStorage.refreshToken;
    if (refresh == null || refresh.isEmpty) {
      final cookies = await _cookiesForBaseUrl();
      for (final cookie in cookies) {
        if (cookie.name == 'refreshToken') refresh = cookie.value;
      }
    }
    if (refresh == null || refresh.isEmpty) return null;
    try {
      final response = await _dio.post(
        ApiEndpoints.authRefresh,
        data: {'refreshToken': refresh},
        options: Options(
          headers: {
            'Authorization': null,
            'X-Access-Token': null,
          },
        ),
      );
      final data = response.data;
      if (data is! Map) return null;

      String? token;
      if (data['success'] == true) {
        token = extractAuthTokens(
          envelope: Map<String, dynamic>.from(data),
          headers: response.headers,
        ).accessToken;
        if (token == null || token.isEmpty) {
          await syncTokensFromCookies();
          token = _memoryAccessToken;
        }
      }

      if (token != null && token.isNotEmpty) {
        _memoryAccessToken = token;
        await _tokenStorage.saveAccessToken(token);
        ApiLogger.info('Access token refreshed');
        return token;
      }
    } catch (error) {
      ApiLogger.error('POST', ApiEndpoints.authRefresh, error);
    }
    return null;
  }
}
