import 'package:flutter/foundation.dart';

import '../../../constants/app_mode.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/services/api_logger.dart';
import '../../../database/app_database.dart';
import '../../../models/party_models.dart';
import '../../../network/api_endpoints.dart';
import '../../../services/cache_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../services/parties_service.dart';

class PartiesProvider extends ChangeNotifier {
  PartiesProvider({
    required PartiesService partiesService,
    required CacheService cache,
    required SyncProvider sync,
  })  : _partiesService = partiesService,
        _cache = cache,
        _sync = sync;

  final PartiesService _partiesService;
  final CacheService _cache;
  final SyncProvider _sync;

  bool _loading = false;
  bool _busy = false;
  String? _error;
  List<PartyRow> _parties = [];
  List<PartyRow> _wallets = [];
  List<WalletTransactionRow> _transactions = [];
  List<PaymentMethodsCacheData> _methods = [];

  bool get loading => _loading;
  bool get busy => _busy;
  String? get error => _error;
  List<PartyRow> get parties => _parties;
  List<PartyRow> get wallets => _wallets;
  List<WalletTransactionRow> get transactions => _transactions;
  List<PaymentMethodsCacheData> get methods => _methods;

  Future<void> refreshParties() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      if (!_sync.isOperatingOnline) {
        _error = 'Customers & suppliers require online mode';
        _parties = [];
        return;
      }
      if (!await _sync.ensureAuthenticated()) {
        _error = 'Not signed in — log in again';
        return;
      }
      await _sync.refreshCache();
      _methods = await _cache.getPaymentMethods();
      _parties = await _partiesService.fetchParties();
    } catch (error) {
      _error = friendlyError(error);
      ApiLogger.error('GET', ApiEndpoints.customers, error);
      if (_sync.userMode == AppOperationMode.auto) {
        _sync.markServerUnreachable();
      }
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> refreshWallets({
    String search = '',
    String customerId = '',
    String type = '',
  }) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      if (!_sync.isOperatingOnline) {
        _error = 'Wallets require online mode';
        _wallets = [];
        _transactions = [];
        return;
      }
      if (!await _sync.ensureAuthenticated()) {
        _error = 'Not signed in — log in again';
        return;
      }
      await _sync.refreshCache();
      _methods = await _cache.getPaymentMethods();
      final results = await Future.wait([
        _partiesService.fetchWallets(),
        _partiesService.fetchWalletTransactions(
          search: search,
          customerId: customerId,
          type: type,
        ),
      ]);
      _wallets = results[0] as List<PartyRow>;
      _transactions = results[1] as List<WalletTransactionRow>;
    } catch (error) {
      _error = friendlyError(error);
      ApiLogger.error('GET', ApiEndpoints.customerWallets, error);
      if (_sync.userMode == AppOperationMode.auto) {
        _sync.markServerUnreachable();
      }
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> createParty({
    required String name,
    required String phone,
    String? location,
    required String type,
  }) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await _partiesService.createParty(
        name: name,
        phone: phone,
        location: location,
        type: type,
      );
      await refreshParties();
      _busy = false;
      notifyListeners();
      return true;
    } catch (error) {
      _error = friendlyError(error);
      _busy = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> recordPayment({
    required String partyId,
    required double amount,
    required String method,
  }) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await _partiesService.recordPayment(
        partyId: partyId,
        amount: amount,
        method: method,
      );
      await refreshParties();
      _busy = false;
      notifyListeners();
      return true;
    } catch (error) {
      _error = friendlyError(error);
      _busy = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> rechargeWallet({
    required String customerId,
    required double amount,
    required String method,
    String? reason,
    String? paidAtIso,
  }) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await _partiesService.rechargeWallet(
        customerId: customerId,
        amount: amount,
        method: method,
        reason: reason,
        paidAtIso: paidAtIso,
      );
      await refreshWallets();
      _busy = false;
      notifyListeners();
      return true;
    } catch (error) {
      _error = friendlyError(error);
      _busy = false;
      notifyListeners();
      return false;
    }
  }
}
