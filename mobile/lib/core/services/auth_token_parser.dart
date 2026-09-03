import 'package:dio/dio.dart';

class AuthTokens {
  const AuthTokens({
    this.accessToken,
    this.refreshToken,
  });

  final String? accessToken;
  final String? refreshToken;

  bool get hasAccess =>
      accessToken != null && accessToken!.isNotEmpty;

  bool get isComplete =>
      hasAccess && refreshToken != null && refreshToken!.isNotEmpty;
}

/// Reads tokens from JSON body and/or Set-Cookie headers (legacy web API).
AuthTokens extractAuthTokens({
  required Map<String, dynamic> envelope,
  Headers? headers,
}) {
  final data = envelope['data'];
  String? access;
  String? refresh;

  if (data is Map) {
    access = _readToken(data, 'accessToken');
    refresh = _readToken(data, 'refreshToken');
    final nested = data['tokens'];
    if (nested is Map) {
      access ??= _readToken(nested, 'accessToken');
      refresh ??= _readToken(nested, 'refreshToken');
    }
  }

  access ??= _readToken(envelope, 'accessToken');
  refresh ??= _readToken(envelope, 'refreshToken');

  if (headers != null) {
    final fromCookies = parseAuthCookies(headers);
    access ??= fromCookies.accessToken;
    refresh ??= fromCookies.refreshToken;
  }

  return AuthTokens(accessToken: access, refreshToken: refresh);
}

AuthTokens parseAuthCookies(Headers headers) {
  String? access;
  String? refresh;

  for (final entry in headers.map.entries) {
    if (!entry.key.toLowerCase().contains('cookie')) continue;
    for (final raw in entry.value) {
      for (final part in _splitSetCookieHeader(raw)) {
        access ??= _cookieValue(part, 'accessToken');
        refresh ??= _cookieValue(part, 'refreshToken');
      }
    }
  }

  return AuthTokens(accessToken: access, refreshToken: refresh);
}

List<String> _splitSetCookieHeader(String raw) {
  // Some servers send multiple cookies in one header line.
  if (!raw.contains('accessToken=') && !raw.contains('refreshToken=')) {
    return [raw];
  }
  final parts = <String>[];
  final chunks = raw.split(', ');
  var buffer = StringBuffer();
  for (final chunk in chunks) {
    if (buffer.isNotEmpty) buffer.write(', ');
    buffer.write(chunk);
    final text = buffer.toString();
    if (text.contains('=') &&
        (text.contains('accessToken=') ||
            text.contains('refreshToken=') ||
            text.contains('Path='))) {
      parts.add(text);
      buffer = StringBuffer();
    }
  }
  final tail = buffer.toString();
  if (tail.isNotEmpty) parts.add(tail);
  return parts.isEmpty ? [raw] : parts;
}

String? _readToken(Map map, String key) {
  final value = map[key]?.toString();
  if (value == null || value.isEmpty) return null;
  return value;
}

String? _cookieValue(String raw, String name) {
  final parts = raw.split(';');
  if (parts.isEmpty) return null;
  final pair = parts.first.trim();
  final prefix = '$name=';
  if (!pair.startsWith(prefix)) return null;
  final value = pair.substring(prefix.length).trim();
  return value.isEmpty ? null : value;
}
