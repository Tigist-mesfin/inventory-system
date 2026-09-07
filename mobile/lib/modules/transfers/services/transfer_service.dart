import '../../../core/utils/money_format.dart';
import '../../../network/api_endpoints.dart';
import '../../../network/dio_client.dart';
import '../../warehouse/services/warehouse_service.dart';
import '../../../models/catalog_models.dart';

class StockTransferRow {
  StockTransferRow({
    required this.id,
    required this.transferNumber,
    required this.status,
    required this.sourceName,
    required this.destinationName,
  });

  factory StockTransferRow.fromJson(Map<String, dynamic> json) {
    final source = json['sourceWarehouse'];
    final dest = json['destinationWarehouse'];
    return StockTransferRow(
      id: json['id']?.toString() ?? '',
      transferNumber: json['transferNumber']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      sourceName: source is Map
          ? source['name']?.toString() ?? ''
          : json['sourceWarehouseName']?.toString() ?? '',
      destinationName: dest is Map
          ? dest['name']?.toString() ?? ''
          : json['destinationWarehouseName']?.toString() ?? '',
    );
  }

  final String id;
  final String transferNumber;
  final String status;
  final String sourceName;
  final String destinationName;
}

class TransferService {
  TransferService({required DioClient client}) : _client = client;

  final DioClient _client;

  Future<List<StockTransferRow>> fetchTransfers() async {
    final response = await _client.get(
      ApiEndpoints.stockTransfers,
      query: {'limit': 100},
    );
    final rows =
        (response['data']?['transfers'] as List?)?.cast<Map<String, dynamic>>() ??
            [];
    return rows.map(StockTransferRow.fromJson).toList();
  }

  Future<List<WarehouseRow>> fetchWarehouses() async {
    final response = await _client.get(ApiEndpoints.warehouses);
    final rows =
        (response['data']?['warehouses'] as List?)?.cast<Map<String, dynamic>>() ??
            [];
    return rows.map(WarehouseRow.fromJson).toList();
  }

  Future<List<CatalogProduct>> fetchProducts() async {
    final response = await _client.get(
      ApiEndpoints.products,
      query: {'limit': 100, 'status': 'ACTIVE'},
    );
    final rows =
        (response['data']?['products'] as List?)?.cast<Map<String, dynamic>>() ??
            [];
    return rows.map(CatalogProduct.fromJson).toList();
  }

  /// Create DRAFT then complete atomically (same as React “Transfer now”).
  Future<void> transferNow({
    required String sourceWarehouseId,
    required String destinationWarehouseId,
    required String productId,
    required double quantity,
  }) async {
    final created = await _client.post(
      ApiEndpoints.stockTransfers,
      body: {
        'sourceWarehouseId': sourceWarehouseId,
        'destinationWarehouseId': destinationWarehouseId,
        'items': [
          {'productId': productId, 'quantity': quantity},
        ],
      },
    );
    final transfer = created['data']?['transfer'];
    final id = transfer is Map ? transfer['id']?.toString() : null;
    if (id == null || id.isEmpty) {
      throw Exception('Transfer created without an id');
    }
    await _client.post(ApiEndpoints.stockTransferComplete(id));
  }
}

// Re-export qty helper usage
double parseTransferQty(String text) => parseMoney(text);
