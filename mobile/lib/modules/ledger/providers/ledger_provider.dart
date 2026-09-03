import 'package:flutter/foundation.dart';

import '../../../constants/app_mode.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/services/api_logger.dart';
import '../../../database/app_database.dart';
import '../../../models/party_models.dart';
import '../../../network/api_endpoints.dart';
import '../../../services/cache_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../services/ledger_service.dart';

enum LedgerTab { credit, debit }

class LedgerProvider extends ChangeNotifier {
  LedgerProvider({
    required LedgerService ledgerService,
    required CacheService cache,
    required SyncProvider sync,
  })  : _ledgerService = ledgerService,
        _cache = cache,
        _sync = sync;

  final LedgerService _ledgerService;
  final CacheService _cache;
  final SyncProvider _sync;

  bool _loading = false;
  bool _busy = false;
  String? _error;
  LedgerTab _tab = LedgerTab.credit;
  LedgerData _ledger = LedgerData.empty();
  List<PaymentMethodsCacheData> _methods = [];

  bool get loading => _loading;
  bool get busy => _busy;
  String? get error => _error;
  LedgerTab get tab => _tab;
  LedgerData get ledger => _ledger;
  List<PaymentMethodsCacheData> get methods => _methods;

  List<OpenCustomerBalance> get customersOpen {
    final map = <String, OpenCustomerBalance>{};
    for (final row in _ledger.credits) {
      final id = row.customerId;
      if (id == null || id.isEmpty) continue;
      final current = map[id];
      map[id] = OpenCustomerBalance(
        id: id,
        name: row.partyName,
        remaining: (current?.remaining ?? 0) + row.remainingBalance,
      );
    }
    return map.values.toList();
  }

  void setTab(LedgerTab tab) {
    _tab = tab;
    notifyListeners();
  }

  Future<void> refresh() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      if (!_sync.isOperatingOnline) {
        _error = 'Debit & credit requires online mode';
        _ledger = LedgerData.empty();
        return;
      }
      if (!await _sync.ensureAuthenticated()) {
        _error = 'Not signed in — log in again';
        return;
      }
      await _sync.refreshCache();
      _methods = await _cache.getPaymentMethods();
      _ledger = await _ledgerService.fetchLedger();
      ApiLogger.info(
        'Ledger loaded: ${_ledger.credits.length} credits, ${_ledger.debits.length} debits',
      );
    } catch (error) {
      _error = friendlyError(error);
      ApiLogger.error('GET', ApiEndpoints.ledger, error);
      if (_sync.userMode == AppOperationMode.auto) {
        _sync.markServerUnreachable();
      }
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> collectFromCustomer({
    required String customerId,
    required double amount,
    required String method,
  }) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await _ledgerService.collectCustomerPayment(
        customerId: customerId,
        amount: amount,
        method: method,
      );
      await refresh();
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

  Future<bool> collectSaleRow({
    required LedgerEntry row,
    required String paymentMethod,
  }) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await _ledgerService.collectSalePayment(
        saleId: row.id,
        amount: row.remainingBalance,
        paymentMethod: paymentMethod,
      );
      await refresh();
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

  Future<bool> paySupplier({
    required String purchaseOrderId,
    required double amount,
    required String paymentMethod,
  }) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await _ledgerService.payPurchaseBalance(
        purchaseOrderId: purchaseOrderId,
        amount: amount,
        paymentMethod: paymentMethod,
      );
      await refresh();
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
