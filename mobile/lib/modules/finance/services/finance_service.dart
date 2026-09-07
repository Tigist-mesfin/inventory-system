import '../../../models/finance_models.dart';
import '../../../network/api_endpoints.dart';
import '../../../network/dio_client.dart';

class FinanceService {
  FinanceService({required DioClient client}) : _client = client;

  final DioClient _client;

  Future<IncomeStatement> fetchIncomeStatement({
    required String period,
    String from = '',
    String to = '',
  }) async {
    final query = <String, dynamic>{'period': period};
    if (period == 'custom') {
      if (from.isNotEmpty) query['from'] = from;
      if (to.isNotEmpty) query['to'] = to;
    }
    final response = await _client.get(
      ApiEndpoints.incomeStatement,
      query: query,
    );
    final statement = response['data']?['statement'];
    return IncomeStatement.fromJson(
      statement is Map ? Map<String, dynamic>.from(statement) : null,
    );
  }

  Future<VatReport?> fetchVatReport({
    String from = '',
    String to = '',
  }) async {
    try {
      final query = <String, dynamic>{};
      if (from.isNotEmpty) query['from'] = from;
      if (to.isNotEmpty) query['to'] = to;
      final response = await _client.get(
        ApiEndpoints.vatReport,
        query: query,
      );
      final report = response['data']?['report'];
      if (report is! Map) return null;
      return VatReport.fromJson(Map<String, dynamic>.from(report));
    } catch (_) {
      return null;
    }
  }

  Future<VatReport> fetchVatReportStrict({
    String from = '',
    String to = '',
  }) async {
    final query = <String, dynamic>{};
    if (from.isNotEmpty) query['from'] = from;
    if (to.isNotEmpty) query['to'] = to;
    final response = await _client.get(
      ApiEndpoints.vatReport,
      query: query,
    );
    final report = response['data']?['report'];
    return VatReport.fromJson(
      report is Map ? Map<String, dynamic>.from(report) : null,
    );
  }

  Future<ExpenseReport> fetchExpensesReport({
    required String period,
    String from = '',
    String to = '',
    String category = '',
    String paymentMethod = '',
  }) async {
    final query = <String, dynamic>{'period': period};
    if (period == 'custom') {
      if (from.isNotEmpty) query['from'] = from;
      if (to.isNotEmpty) query['to'] = to;
    }
    if (category.isNotEmpty) query['category'] = category;
    if (paymentMethod.isNotEmpty) query['paymentMethod'] = paymentMethod;
    final response = await _client.get(
      ApiEndpoints.expensesReport,
      query: query,
    );
    final report = response['data']?['report'];
    return ExpenseReport.fromJson(
      report is Map ? Map<String, dynamic>.from(report) : null,
    );
  }

  Future<void> createExpense({
    required String expenseDate,
    required String category,
    required String description,
    required double amount,
    String? paymentMethod,
  }) async {
    await _client.post(
      ApiEndpoints.expenses,
      body: {
        'expenseDate': expenseDate,
        'category': category,
        'description': description,
        'amount': amount,
        'paymentMethod':
            (paymentMethod == null || paymentMethod.isEmpty) ? null : paymentMethod,
      },
    );
  }

  Future<void> deleteExpense(String id) async {
    await _client.delete(ApiEndpoints.expenseById(id));
  }

  Future<OtherIncomeReport> fetchOtherIncomeReport({
    required String period,
    String from = '',
    String to = '',
    String paymentMethod = '',
  }) async {
    final query = <String, dynamic>{'period': period};
    if (period == 'custom') {
      if (from.isNotEmpty) query['from'] = from;
      if (to.isNotEmpty) query['to'] = to;
    }
    if (paymentMethod.isNotEmpty) query['paymentMethod'] = paymentMethod;
    final response = await _client.get(
      ApiEndpoints.otherIncomesReport,
      query: query,
    );
    final report = response['data']?['report'];
    return OtherIncomeReport.fromJson(
      report is Map ? Map<String, dynamic>.from(report) : null,
    );
  }

  Future<void> createOtherIncome({
    required String incomeDate,
    required String receivedFrom,
    required String reason,
    required double amount,
    String? paymentMethod,
  }) async {
    await _client.post(
      ApiEndpoints.otherIncomes,
      body: {
        'incomeDate': incomeDate,
        'receivedFrom': receivedFrom,
        'reason': reason,
        'amount': amount,
        'paymentMethod':
            (paymentMethod == null || paymentMethod.isEmpty) ? null : paymentMethod,
      },
    );
  }

  Future<void> deleteOtherIncome(String id) async {
    await _client.delete(ApiEndpoints.otherIncomeById(id));
  }
}
