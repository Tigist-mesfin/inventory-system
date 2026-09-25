import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class AppException implements Exception {
  AppException(this.message, {this.code});

  final String message;
  final String? code;

  @override
  String toString() => message;
}

String friendlyError(Object error, {String? serverUrl}) {
  if (error is AppException) return error.message;
  if (error is DioException) {
    return mapDioError(error, serverUrl: serverUrl);
  }
  final text = error.toString();
  if (text.contains('Connection refused') ||
      text.contains('connection errored') ||
      text.contains('Network is unreachable')) {
    return _serverUnreachable(serverUrl);
  }
  if (text.contains('SocketException') || text.contains('Failed host lookup')) {
    return _serverUnreachable(serverUrl);
  }
  if (text.contains('TimeoutException') || text.contains('receive timeout')) {
    return 'Server timed out. Check the Server URL and that the backend is running.';
  }
  return 'Something went wrong. Please try again.';
}

bool pathLooksLikeAuth(String path) {
  return path.contains('/auth/login') || path.contains('/auth/refresh');
}

String mapDioError(DioException error, {String? serverUrl}) {
  switch (error.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
      return 'Server timed out. Check the Server URL and that the backend is running on port 3000.';
    case DioExceptionType.connectionError:
    case DioExceptionType.unknown:
      return _serverUnreachable(serverUrl);
    case DioExceptionType.badResponse:
      final status = error.response?.statusCode;
      final body = error.response?.data;
      if (body is Map) {
        final apiMessage = body['error'] is Map
            ? body['error']['message']?.toString()
            : body['message']?.toString();
        if (apiMessage != null && apiMessage.isNotEmpty) {
          return apiMessage;
        }
      }
      if (status == 401) {
        return pathLooksLikeAuth(error.requestOptions.path)
            ? 'Invalid username or password.'
            : 'Session expired or not authorized. Please log in again.';
      }
      if (status != null) {
        return 'Server error ($status). Please try again.';
      }
      return 'Unexpected server response.';
    default:
      return friendlyError(error.error ?? error, serverUrl: serverUrl);
  }
}

String _serverUnreachable(String? serverUrl) {
  final url =
      (serverUrl == null || serverUrl.isEmpty) ? 'the server' : serverUrl;
  if (kDebugMode) {
    return 'Cannot reach $url.\n'
        '• Start the backend: npm run dev\n'
        '• Android emulator: http://10.0.2.2:3000\n'
        '• Physical phone: http://YOUR_PC_IP:3000 (same Wi‑Fi as this phone)\n'
        'Your PC may be at http://192.168.1.10:3000 — use ipconfig to confirm.';
  }
  return 'Cannot reach $url. Check your internet connection and try again.';
}
