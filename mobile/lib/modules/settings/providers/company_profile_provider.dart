import 'package:flutter/foundation.dart';

import '../../../core/errors/app_exception.dart';
import '../../sync/providers/sync_provider.dart';
import '../services/company_profile_service.dart';

class CompanyProfileProvider extends ChangeNotifier {
  CompanyProfileProvider({
    required CompanyProfileService service,
    required SyncProvider sync,
  })  : _service = service,
        _sync = sync;

  final CompanyProfileService _service;
  final SyncProvider _sync;

  bool _loading = false;
  bool _busy = false;
  String? _error;
  String? _savedMessage;
  CompanyProfile? _profile;

  bool get loading => _loading;
  bool get busy => _busy;
  String? get error => _error;
  String? get savedMessage => _savedMessage;
  CompanyProfile? get profile => _profile;

  Future<void> refresh() async {
    _loading = true;
    _error = null;
    _savedMessage = null;
    notifyListeners();
    try {
      if (!_sync.isOperatingOnline) {
        _error = 'Company profile requires online mode';
        return;
      }
      if (!await _sync.ensureAuthenticated()) {
        _error = 'Not signed in — log in again';
        return;
      }
      _profile = await _service.fetch();
    } catch (error) {
      _error = friendlyError(error);
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> save({
    required String name,
    required String phone,
    required String email,
    required String tin,
    required String address,
  }) async {
    _busy = true;
    _error = null;
    _savedMessage = null;
    notifyListeners();
    try {
      _profile = await _service.update({
        'name': name,
        'phone': phone,
        'email': email,
        'tin': tin,
        'address': address,
      });
      _savedMessage = 'Company details saved. They appear on invoices.';
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
