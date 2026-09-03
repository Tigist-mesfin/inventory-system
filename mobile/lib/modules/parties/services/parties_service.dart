import '../../../models/party_models.dart';
import '../../../network/api_endpoints.dart';
import '../../../network/dio_client.dart';

class PartiesService {
  PartiesService({required DioClient client}) : _client = client;

  final DioClient _client;

  Future<List<PartyRow>> fetchParties() async {
    final response = await _client.get(
      ApiEndpoints.customers,
      query: {'limit': 500},
    );
    final rows =
        (response['data']?['customers'] as List?)?.cast<Map<String, dynamic>>() ??
            [];
    return rows.map(PartyRow.fromJson).toList();
  }

  Future<void> createParty({
    required String name,
    required String phone,
    String? location,
    required String type,
  }) async {
    await _client.post(
      ApiEndpoints.customers,
      body: {
        'name': name,
        'phone': phone,
        if (location != null && location.isNotEmpty) 'location': location,
        'type': type,
      },
    );
  }

  Future<void> recordPayment({
    required String partyId,
    required double amount,
    required String method,
  }) async {
    await _client.post(
      ApiEndpoints.customerPayments(partyId),
      body: {
        'amount': amount,
        'method': method,
      },
    );
  }

  Future<List<PartyRow>> fetchWallets() async {
    final response = await _client.get(ApiEndpoints.customerWallets);
    final rows =
        (response['data']?['customers'] as List?)?.cast<Map<String, dynamic>>() ??
            [];
    return rows.map(PartyRow.fromJson).toList();
  }

  Future<List<WalletTransactionRow>> fetchWalletTransactions({
    String search = '',
    String customerId = '',
    String type = '',
  }) async {
    final query = <String, dynamic>{'limit': 100};
    if (search.isNotEmpty) query['search'] = search;
    if (customerId.isNotEmpty) query['customerId'] = customerId;
    if (type.isNotEmpty) query['type'] = type;
    final response = await _client.get(
      ApiEndpoints.customerWalletTransactions,
      query: query,
    );
    final rows = (response['data']?['transactions'] as List?)
            ?.cast<Map<String, dynamic>>() ??
        [];
    return rows.map(WalletTransactionRow.fromJson).toList();
  }

  Future<void> rechargeWallet({
    required String customerId,
    required double amount,
    required String method,
    String? reason,
    String? paidAtIso,
  }) async {
    await _client.post(
      ApiEndpoints.customerWallet(customerId),
      body: {
        'amount': amount,
        'method': method,
        if (reason != null && reason.isNotEmpty) 'reason': reason,
        if (paidAtIso != null) 'paidAt': paidAtIso,
      },
    );
  }
}
