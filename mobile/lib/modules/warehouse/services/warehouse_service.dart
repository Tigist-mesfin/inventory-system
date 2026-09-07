import '../../../network/api_endpoints.dart';
import '../../../network/dio_client.dart';

class WarehouseRow {
  WarehouseRow({
    required this.id,
    required this.name,
    this.code = '',
    this.status = 'ACTIVE',
  });

  factory WarehouseRow.fromJson(Map<String, dynamic> json) {
    return WarehouseRow(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
      status: json['status']?.toString() ?? 'ACTIVE',
    );
  }

  final String id;
  final String name;
  final String code;
  final String status;
}

class WarehouseService {
  WarehouseService({required DioClient client}) : _client = client;

  final DioClient _client;

  Future<List<WarehouseRow>> fetchWarehouses() async {
    final response = await _client.get(ApiEndpoints.warehouses);
    final rows =
        (response['data']?['warehouses'] as List?)?.cast<Map<String, dynamic>>() ??
            [];
    return rows.map(WarehouseRow.fromJson).toList();
  }

  Future<void> createWarehouse(String name) async {
    await _client.post(ApiEndpoints.warehouses, body: {'name': name});
  }
}
