import 'package:flutter/foundation.dart';

import '../../../core/errors/app_exception.dart';
import '../../../database/app_database.dart';
import '../../../models/finance_models.dart';
import '../../../services/cache_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../services/finance_service.dart';

class ExpensesProvider extends ChangeNotifier {
  ExpensesProvider({
    required FinanceService financeService,
    required CacheService cache,
    required SyncProvider sync,
  })  : _financeService = financeService,
        _cache = cache,
        _sync = sync;

  final FinanceService _financeService;
  final CacheService _cache;
  final SyncProvider _sync;

  bool _loading = false;
  bool _busy = false;
  String? _error;
  String _period = 'this_month';
  String _from = '';
  String _to = '';
  String _category = '';
  String _paymentMethod = '';
  ExpenseReport? _report;
  List<PaymentMethodsCacheData> _methods = [];

  bool get loading => _loading;
  bool get busy => _busy;
  String? get error => _error;
  String get period => _period;
  String get from => _from;
  String get to => _to;
  String get category => _category;
  String get paymentMethod => _paymentMethod;
  ExpenseReport? get report => _report;
  List<PaymentMethodsCacheData> get methods => _methods;

  Future<void> refresh({
    String? period,
    String? from,
    String? to,
    String? category,
    String? paymentMethod,
  }) async {
    if (!_sync.isOperatingOnline) {
      _error = 'Expenses require an online connection.';
      notifyListeners();
      return;
    }
    _loading = true;
    _error = null;
    _period = period ?? _period;
    _from = from ?? _from;
    _to = to ?? _to;
    _category = category ?? _category;
    _paymentMethod = paymentMethod ?? _paymentMethod;
    notifyListeners();
    try {
      if (!await _sync.ensureAuthenticated()) {
        _error = 'Not signed in — log in again';
        return;
      }
      await _sync.refreshCache();
      _methods = await _cache.getPaymentMethods();
      _report = await _financeService.fetchExpensesReport(
        period: _period,
        from: _from,
        to: _to,
        category: _category,
        paymentMethod: _paymentMethod,
      );
    } catch (error) {
      _error = friendlyError(error);
      _report = null;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> createExpense({
    required String expenseDate,
    required String category,
    required String description,
    required double amount,
    String? paymentMethod,
  }) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await _financeService.createExpense(
        expenseDate: expenseDate,
        category: category,
        description: description,
        amount: amount,
        paymentMethod: paymentMethod,
      );
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

  Future<bool> deleteExpense(String id) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await _financeService.deleteExpense(id);
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

class OtherIncomeProvider extends ChangeNotifier {
  OtherIncomeProvider({
    required FinanceService financeService,
    required CacheService cache,
    required SyncProvider sync,
  })  : _financeService = financeService,
        _cache = cache,
        _sync = sync;

  final FinanceService _financeService;
  final CacheService _cache;
  final SyncProvider _sync;

  bool _loading = false;
  bool _busy = false;
  String? _error;
  String _period = 'this_month';
  String _from = '';
  String _to = '';
  String _paymentMethod = '';
  OtherIncomeReport? _report;
  List<PaymentMethodsCacheData> _methods = [];

  bool get loading => _loading;
  bool get busy => _busy;
  String? get error => _error;
  String get period => _period;
  String get from => _from;
  String get to => _to;
  String get paymentMethod => _paymentMethod;
  OtherIncomeReport? get report => _report;
  List<PaymentMethodsCacheData> get methods => _methods;

  Future<void> refresh({
    String? period,
    String? from,
    String? to,
    String? paymentMethod,
  }) async {
    if (!_sync.isOperatingOnline) {
      _error = 'Other income requires an online connection.';
      notifyListeners();
      return;
    }
    _loading = true;
    _error = null;
    _period = period ?? _period;
    _from = from ?? _from;
    _to = to ?? _to;
    _paymentMethod = paymentMethod ?? _paymentMethod;
    notifyListeners();
    try {
      if (!await _sync.ensureAuthenticated()) {
        _error = 'Not signed in — log in again';
        return;
      }
      await _sync.refreshCache();
      _methods = await _cache.getPaymentMethods();
      _report = await _financeService.fetchOtherIncomeReport(
        period: _period,
        from: _from,
        to: _to,
        paymentMethod: _paymentMethod,
      );
    } catch (error) {
      _error = friendlyError(error);
      _report = null;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> createIncome({
    required String incomeDate,
    required String receivedFrom,
    required String reason,
    required double amount,
    String? paymentMethod,
  }) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await _financeService.createOtherIncome(
        incomeDate: incomeDate,
        receivedFrom: receivedFrom,
        reason: reason,
        amount: amount,
        paymentMethod: paymentMethod,
      );
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

  Future<bool> deleteIncome(String id) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await _financeService.deleteOtherIncome(id);
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

class VatProvider extends ChangeNotifier {
  VatProvider({
    required FinanceService financeService,
    required SyncProvider sync,
  })  : _financeService = financeService,
        _sync = sync;

  final FinanceService _financeService;
  final SyncProvider _sync;

  bool _loading = false;
  String? _error;
  String _period = 'this_month';
  String _from = '';
  String _to = '';
  VatReport? _report;

  bool get loading => _loading;
  String? get error => _error;
  String get period => _period;
  String get from => _from;
  String get to => _to;
  VatReport? get report => _report;

  Future<void> refresh({
    String? period,
    String? from,
    String? to,
  }) async {
    if (!_sync.isOperatingOnline) {
      _error = 'VAT data requires an online connection.';
      notifyListeners();
      return;
    }
    _loading = true;
    _error = null;
    _period = period ?? _period;
    _from = from ?? _from;
    _to = to ?? _to;
    notifyListeners();
    try {
      if (!await _sync.ensureAuthenticated()) {
        _error = 'Not signed in — log in again';
        return;
      }
      _report = await _financeService.fetchVatReportStrict(
        from: _from,
        to: _to,
      );
    } catch (error) {
      _error = friendlyError(error);
      _report = null;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void setDates({required String from, required String to}) {
    _from = from;
    _to = to;
    notifyListeners();
  }
}
