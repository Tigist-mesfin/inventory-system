import '../../../network/api_endpoints.dart';
import '../../../network/dio_client.dart';

class PaymentMethodRow {
  PaymentMethodRow({
    required this.id,
    required this.name,
    required this.status,
  });

  factory PaymentMethodRow.fromJson(Map<String, dynamic> json) {
    return PaymentMethodRow(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      status: json['status']?.toString() ?? 'ACTIVE',
    );
  }

  final String id;
  final String name;
  final String status;

  bool get isActive => status == 'ACTIVE';
}

class PaymentMethodService {
  PaymentMethodService({required DioClient client}) : _client = client;

  final DioClient _client;

  Future<List<PaymentMethodRow>> fetchAll() async {
    final response = await _client.get(ApiEndpoints.paymentMethods);
    final rows = (response['data']?['paymentMethods'] as List?)
            ?.cast<Map<String, dynamic>>() ??
        [];
    return rows.map(PaymentMethodRow.fromJson).toList();
  }

  Future<void> create(String name) async {
    await _client.post(ApiEndpoints.paymentMethods, body: {'name': name});
  }

  Future<void> setStatus(String id, String status) async {
    await _client.patch(
      ApiEndpoints.paymentMethodById(id),
      body: {'status': status},
    );
  }
}
