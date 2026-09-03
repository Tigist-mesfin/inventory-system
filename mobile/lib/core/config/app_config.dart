import 'package:flutter_dotenv/flutter_dotenv.dart';

/// API and app settings loaded from `mobile/.env` (gitignored).
/// Copy `.env.example` → `.env` before running locally.
class AppConfig {
  AppConfig._();

  static const _productionApiUrl = 'https://inventory-api.fortinoacademics.com';

  static late String apiBaseUrl;
  static late bool allowUrlOverride;
  static late double vatRate;

  static const connectTimeout = Duration(seconds: 30);
  static const receiveTimeout = Duration(seconds: 30);

  static Future<void> load() async {
    try {
      await dotenv.load(fileName: '.env');
    } catch (_) {
      // .env missing in dev — fall back to dart-define / production default.
    }

    apiBaseUrl = _readUrl();
    allowUrlOverride = _readBool('ALLOW_URL_OVERRIDE', fallback: false);
    vatRate = _readDouble('VAT_RATE', fallback: 15);
  }

  static String _readUrl() {
    const fromDefine = String.fromEnvironment('API_BASE_URL');
    if (fromDefine.isNotEmpty) return _normalize(fromDefine);

    final fromEnv = dotenv.env['API_BASE_URL']?.trim();
    if (fromEnv != null && fromEnv.isNotEmpty) return _normalize(fromEnv);

    return _productionApiUrl;
  }

  static bool _readBool(String key, {required bool fallback}) {
    const fromDefine = bool.fromEnvironment('ALLOW_URL_OVERRIDE');
    if (fromDefine) return true;
    final raw = dotenv.env[key]?.trim().toLowerCase();
    if (raw == 'true' || raw == '1') return true;
    if (raw == 'false' || raw == '0') return false;
    return fallback;
  }

  static double _readDouble(String key, {required double fallback}) {
    const fromDefine = String.fromEnvironment('VAT_RATE');
    if (fromDefine.isNotEmpty) {
      return double.tryParse(fromDefine) ?? fallback;
    }
    return double.tryParse(dotenv.env[key] ?? '') ?? fallback;
  }

  static String _normalize(String url) {
    var value = url.trim();
    while (value.endsWith('/')) {
      value = value.substring(0, value.length - 1);
    }
    return value;
  }
}
