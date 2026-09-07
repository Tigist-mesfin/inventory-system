import '../../../models/catalog_models.dart';
import '../../../network/api_endpoints.dart';
import '../../../network/dio_client.dart';

class CatalogService {
  CatalogService({required DioClient client}) : _client = client;

  final DioClient _client;

  Future<List<CatalogProduct>> fetchProducts({String search = ''}) async {
    final query = <String, dynamic>{
      'limit': 100,
      'status': 'ACTIVE',
      'page': 1,
    };
    if (search.trim().isNotEmpty) query['search'] = search.trim();
    final response = await _client.get(ApiEndpoints.products, query: query);
    final rows =
        (response['data']?['products'] as List?)?.cast<Map<String, dynamic>>() ??
            [];
    return rows.map(CatalogProduct.fromJson).toList();
  }

  Future<void> createProduct({
    required String name,
    required String unit,
    String brand = '',
    String serialNumber = '',
    String color = '',
    double sellingPrice = 0,
  }) async {
    await _client.post(
      ApiEndpoints.products,
      body: {
        'name': name,
        'unit': unit,
        if (brand.isNotEmpty) 'brand': brand,
        if (serialNumber.isNotEmpty) 'serialNumber': serialNumber,
        if (color.isNotEmpty) 'color': color,
        'sellingPrice': sellingPrice,
      },
    );
  }

  Future<void> updateProduct({
    required String id,
    required String name,
    required String unit,
    String brand = '',
    String serialNumber = '',
    String color = '',
    double sellingPrice = 0,
  }) async {
    await _client.patch(
      ApiEndpoints.productById(id),
      body: {
        'name': name,
        'unit': unit,
        'brand': brand.isEmpty ? null : brand,
        'serialNumber': serialNumber.isEmpty ? null : serialNumber,
        'color': color.isEmpty ? null : color,
        'sellingPrice': sellingPrice,
      },
    );
  }

  Future<void> deleteProduct(String id) async {
    await _client.delete(ApiEndpoints.productById(id));
  }
}
