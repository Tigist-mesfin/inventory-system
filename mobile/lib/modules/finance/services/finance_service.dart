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
}
