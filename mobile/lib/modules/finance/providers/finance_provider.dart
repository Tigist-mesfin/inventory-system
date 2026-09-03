import 'package:flutter/foundation.dart';

import '../../../core/errors/app_exception.dart';
import '../../../models/finance_models.dart';
import '../../sync/providers/sync_provider.dart';
import '../services/finance_service.dart';

class FinanceProvider extends ChangeNotifier {
  FinanceProvider({
    required FinanceService financeService,
    required SyncProvider sync,
  })  : _financeService = financeService,
        _sync = sync;

  final FinanceService _financeService;
  final SyncProvider _sync;

  bool _loading = false;
  String? _error;
  String _period = 'all_time';
  String _from = '';
  String _to = '';
  IncomeStatement? _statement;
  VatReport? _vatReport;

  bool get loading => _loading;
  String? get error => _error;
  String get period => _period;
  String get from => _from;
  String get to => _to;
  IncomeStatement? get statement => _statement;
  VatReport? get vatReport => _vatReport;

  Future<void> refresh({
    String? period,
    String? from,
    String? to,
  }) async {
    if (!_sync.isOperatingOnline) {
      _error = 'Income statement requires an online connection.';
      notifyListeners();
      return;
    }

    final nextPeriod = period ?? _period;
    final nextFrom = from ?? _from;
    final nextTo = to ?? _to;

    _loading = true;
    _error = null;
    _period = nextPeriod;
    _from = nextFrom;
    _to = nextTo;
    notifyListeners();

    try {
      final statement = await _financeService.fetchIncomeStatement(
        period: nextPeriod,
        from: nextFrom,
        to: nextTo,
      );

      var vatFrom = '';
      var vatTo = '';
      if (nextPeriod != 'all_time' && nextPeriod != 'all') {
        vatFrom = (statement.period.from ?? '').toString().length >= 10
            ? statement.period.from!.substring(0, 10)
            : (nextPeriod == 'custom' ? nextFrom : '');
        vatTo = (statement.period.to ?? '').toString().length >= 10
            ? statement.period.to!.substring(0, 10)
            : (nextPeriod == 'custom' ? nextTo : '');
      }

      final vat = await _financeService.fetchVatReport(
        from: vatFrom,
        to: vatTo,
      );

      _statement = statement;
      _vatReport = vat;
    } on AppException catch (err) {
      _error = err.message;
      _statement = null;
      _vatReport = null;
    } catch (err) {
      _error = err.toString();
      _statement = null;
      _vatReport = null;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void setCustomDates({required String from, required String to}) {
    _from = from;
    _to = to;
    notifyListeners();
  }
}
