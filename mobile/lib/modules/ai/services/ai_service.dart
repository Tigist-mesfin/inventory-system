import '../../models/ai_models.dart';
import '../../network/api_endpoints.dart';
import '../../network/dio_client.dart';

class AiService {
  AiService({required DioClient client}) : _client = client;

  final DioClient _client;

  Map<String, dynamic> _query({String? warehouseId}) {
    final query = <String, dynamic>{};
    if (warehouseId != null && warehouseId.isNotEmpty) {
      query['warehouseId'] = warehouseId;
    }
    return query;
  }

  Future<Map<String, dynamic>> fetchDashboard({String? warehouseId}) async {
    final response = await _client.get(
      ApiEndpoints.aiDashboard,
      query: _query(warehouseId: warehouseId),
    );
    return asMap(response['data']?['dashboard']);
  }

  Future<Map<String, dynamic>> fetchDailySummary({String? warehouseId}) async {
    final response = await _client.get(
      ApiEndpoints.aiSummaryDaily,
      query: _query(warehouseId: warehouseId),
    );
    return asMap(response['data']?['summary']);
  }

  Future<Map<String, dynamic>> fetchMonthlySummary({String? warehouseId}) async {
    final response = await _client.get(
      ApiEndpoints.aiSummaryMonthly,
      query: _query(warehouseId: warehouseId),
    );
    return asMap(response['data']?['summary']);
  }

  Future<Map<String, dynamic>> fetchInsights({String? warehouseId}) async {
    final response = await _client.get(
      ApiEndpoints.aiSummaryInsights,
      query: _query(warehouseId: warehouseId),
    );
    return asMap(response['data']?['board']);
  }

  Future<AiChatResult> chat(String question) async {
    final response = await _client.post(
      ApiEndpoints.aiChat,
      body: {'question': question, 'mode': 'sql'},
    );
    return AiChatResult.fromJson(
      asMap(response['data']?['chat']),
      question: question,
    );
  }

  Future<({List<String> candidates, String? grammarFixed})> clarify(
    String rawQuery,
  ) async {
    final response = await _client.post(
      ApiEndpoints.aiClarify,
      body: {'rawQuery': rawQuery},
    );
    final clarify = asMap(response['data']?['clarify']);
    final candidates = (clarify['candidates'] as List?)
            ?.map((c) => c.toString())
            .toList() ??
        const <String>[];
    return (
      candidates: candidates,
      grammarFixed: clarify['grammarFixed']?.toString(),
    );
  }
}
