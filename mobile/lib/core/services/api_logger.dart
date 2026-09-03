import 'package:flutter/foundation.dart';

class ApiLogger {
  static void request(String method, String url, {Map<String, dynamic>? query}) {
    if (!kDebugMode) return;
    final q = query == null || query.isEmpty ? '' : ' ?$query';
    debugPrint('[API] → $method $url$q');
  }

  static void response(String method, String url, int? status) {
    if (!kDebugMode) return;
    debugPrint('[API] ← $method $url status=${status ?? '?'}');
  }

  static void error(String method, String url, Object error, {StackTrace? stack}) {
    if (!kDebugMode) return;
    debugPrint('[API] ✗ $method $url error=$error');
    if (stack != null) {
      debugPrint(stack.toString());
    }
  }

  static void info(String message) {
    if (!kDebugMode) return;
    debugPrint('[API] $message');
  }
}
