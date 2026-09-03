import '../../../models/stock_models.dart';
import '../../../network/api_endpoints.dart';
import '../../../network/dio_client.dart';

class StockService {
  StockService({required DioClient client}) : _client = client;

  final DioClient _client;

  Future<List<StockItemRow>> fetchByItem({
    StockFilters filters = const StockFilters(),
  }) async {
    final response = await _client.get(
      ApiEndpoints.inventoryByItem,
      query: filters.toQuery(),
    );
    final items =
        (response['data']?['items'] as List?)?.cast<Map<String, dynamic>>() ??
            [];
    return items.map(StockItemRow.fromJson).toList();
  }

  Future<StockOverview> fetchOverview() async {
    final response = await _client.get(ApiEndpoints.inventoryOverview);
    final data = response['data']?['overview'];
    if (data is Map<String, dynamic>) {
      return StockOverview.fromJson(data);
    }
    if (data is Map) {
      return StockOverview.fromJson(Map<String, dynamic>.from(data));
    }
    return StockOverview.empty();
  }

  Future<List<UndeliveredStockRow>> fetchUndelivered() async {
    final response = await _client.get(ApiEndpoints.inventoryUndelivered);
    final items =
        (response['data']?['items'] as List?)?.cast<Map<String, dynamic>>() ??
            [];
    return items.map(UndeliveredStockRow.fromJson).toList();
  }

  Future<void> adjustOnHand({
    required String productId,
    required String warehouseId,
    required double quantity,
  }) async {
    await _client.post(
      ApiEndpoints.inventoryAdjustOnHand,
      body: {
        'productId': productId,
        'warehouseId': warehouseId,
        'quantity': quantity,
      },
    );
  }

  Future<void> deliverAll({required String warehouseId}) async {
    await _client.post(
      ApiEndpoints.purchaseDeliverAll,
      body: {'warehouseId': warehouseId},
    );
  }

  Future<void> deliverItem({
    required String itemId,
    required String warehouseId,
    required double quantity,
  }) async {
    await _client.patch(
      ApiEndpoints.purchaseItem(itemId),
      body: {
        'deliveryStatus': 'DELIVERED',
        'warehouseId': warehouseId,
        'quantity': quantity,
      },
    );
  }
}
