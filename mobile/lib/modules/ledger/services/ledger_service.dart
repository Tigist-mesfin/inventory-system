import '../../../models/party_models.dart';
import '../../../network/api_endpoints.dart';
import '../../../network/dio_client.dart';

class LedgerService {
  LedgerService({required DioClient client}) : _client = client;

  final DioClient _client;

  Future<LedgerData> fetchLedger() async {
    final response = await _client.get(ApiEndpoints.ledger);
    final data = response['data']?['ledger'];
    if (data is Map<String, dynamic>) return LedgerData.fromJson(data);
    if (data is Map) {
      return LedgerData.fromJson(Map<String, dynamic>.from(data));
    }
    return LedgerData.empty();
  }

  Future<void> collectCustomerPayment({
    required String customerId,
    required double amount,
    required String method,
  }) async {
    await _client.post(
      ApiEndpoints.customerPayments(customerId),
      body: {
        'amount': amount,
        'method': method,
      },
    );
  }

  Future<void> collectSalePayment({
    required String saleId,
    required double amount,
    required String paymentMethod,
  }) async {
    await _client.post(
      ApiEndpoints.salePayments(saleId),
      body: {
        'amount': amount,
        'paymentMethod': paymentMethod,
      },
    );
  }

  Future<void> payPurchaseBalance({
    required String purchaseOrderId,
    required double amount,
    required String paymentMethod,
  }) async {
    await _client.post(
      ApiEndpoints.purchasePayments(purchaseOrderId),
      body: {
        'amount': amount,
        'paymentMethod': paymentMethod,
      },
    );
  }
}
