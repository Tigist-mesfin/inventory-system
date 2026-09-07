import '../../../models/team_models.dart';
import '../../../network/api_endpoints.dart';
import '../../../network/dio_client.dart';

class TeamService {
  TeamService({required DioClient client}) : _client = client;

  final DioClient _client;

  Future<List<SalesmanRow>> fetchSalesmen() async {
    final response = await _client.get(ApiEndpoints.team);
    final rows =
        (response['data']?['salesmen'] as List?)?.cast<Map<String, dynamic>>() ??
            [];
    return rows.map(SalesmanRow.fromJson).toList();
  }

  Future<void> createSalesman({
    required String fullName,
    required String phone,
    required String password,
    required bool allWarehouses,
    required List<String> warehouseIds,
    required List<String> permissions,
  }) async {
    await _client.post(
      ApiEndpoints.team,
      body: {
        'fullName': fullName,
        'phone': phone,
        'password': password,
        'allWarehouses': allWarehouses,
        'warehouseIds': allWarehouses ? <String>[] : warehouseIds,
        'permissions': permissions,
      },
    );
  }

  Future<void> updateSalesman({
    required String id,
    required String fullName,
    required String phone,
    String? password,
    required bool allWarehouses,
    required List<String> warehouseIds,
    required List<String> permissions,
  }) async {
    final body = <String, dynamic>{
      'fullName': fullName,
      'phone': phone,
      'allWarehouses': allWarehouses,
      'warehouseIds': allWarehouses ? <String>[] : warehouseIds,
      'permissions': permissions,
    };
    if (password != null && password.isNotEmpty) {
      body['password'] = password;
    }
    await _client.patch(ApiEndpoints.teamById(id), body: body);
  }
}
