import 'package:flutter/foundation.dart';

import '../../../core/errors/app_exception.dart';
import '../../../services/cache_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../services/payment_method_service.dart';

class PaymentMethodProvider extends ChangeNotifier {
  PaymentMethodProvider({
    required PaymentMethodService service,
    required CacheService cache,
    required SyncProvider sync,
  })  : _service = service,
        _cache = cache,
        _sync = sync;

  final PaymentMethodService _service;
  final CacheService _cache;
  final SyncProvider _sync;

  bool _loading = false;
  bool _busy = false;
  String? _error;
  List<PaymentMethodRow> _methods = [];

  bool get loading => _loading;
  bool get busy => _busy;
  String? get error => _error;
  List<PaymentMethodRow> get methods => _methods;

  Future<void> refresh() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      if (!_sync.isOperatingOnline) {
        _error = 'Payment methods require online mode';
        return;
      }
      if (!await _sync.ensureAuthenticated()) {
        _error = 'Not signed in — log in again';
        return;
      }
      _methods = await _service.fetchAll();
    } catch (error) {
      _error = friendlyError(error);
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> create(String name) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await _service.create(name);
      try {
        await _cache.refreshPaymentMethods();
      } catch (_) {}
      await refresh();
      return true;
    } catch (error) {
      _error = friendlyError(error);
      return false;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  Future<bool> toggle(PaymentMethodRow row) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await _service.setStatus(
        row.id,
        row.isActive ? 'INACTIVE' : 'ACTIVE',
      );
      try {
        await _cache.refreshPaymentMethods();
      } catch (_) {}
      await refresh();
      return true;
    } catch (error) {
      _error = friendlyError(error);
      return false;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }
}
