import 'package:drift/drift.dart';

import '../../../database/app_database.dart';
import '../../../network/api_endpoints.dart';
import '../../../network/dio_client.dart';

class CacheService {
  CacheService({
    required AppDatabase db,
    required DioClient client,
  })  : _db = db,
        _client = client;

  final AppDatabase _db;
  final DioClient _client;

  Future<void> refreshAll() async {
    await refreshProducts();
    await refreshWarehouses();
    await refreshSuppliers();
    await refreshCustomers();
    await refreshPaymentMethods();
    await refreshInventory();
    await _db.setMeta('last_cache_sync', DateTime.now().toIso8601String());
  }

  Future<void> refreshProducts() async {
    final allProducts = <Map<String, dynamic>>[];
    var page = 1;
    var totalPages = 1;
    while (page <= totalPages && page <= 10) {
      final response = await _client.get(
        ApiEndpoints.products,
        query: {'limit': 100, 'status': 'ACTIVE', 'page': page},
      );
      final products =
          (response['data']?['products'] as List?)?.cast<Map<String, dynamic>>() ??
              [];
      allProducts.addAll(products);
      final meta = response['meta'] as Map<String, dynamic>?;
      totalPages = (meta?['totalPages'] as num?)?.toInt() ?? 1;
      page += 1;
    }
    final now = DateTime.now();
    await _db.delete(_db.productsCache).go();
    for (final item in allProducts) {
      await _db.into(_db.productsCache).insertOnConflictUpdate(
            ProductsCacheCompanion.insert(
              id: item['id'].toString(),
              name: item['name']?.toString() ?? '',
              sku: Value(item['sku']?.toString()),
              unit: item['unit']?.toString() ?? 'PCS',
              purchasePrice: Value(_num(item['purchasePrice'])),
              sellingPrice: Value(_num(item['sellingPrice'])),
              brand: Value(item['brand']?.toString()),
              syncedAt: now,
            ),
          );
    }
  }

  Future<void> refreshWarehouses() async {
    final response = await _client.get(ApiEndpoints.warehouses);
    final rows =
        (response['data']?['warehouses'] as List?)?.cast<Map<String, dynamic>>() ??
            [];
    final now = DateTime.now();
    await _db.delete(_db.warehousesCache).go();
    for (final item in rows) {
      await _db.into(_db.warehousesCache).insertOnConflictUpdate(
            WarehousesCacheCompanion.insert(
              id: item['id'].toString(),
              name: item['name']?.toString() ?? '',
              code: Value(item['code']?.toString()),
              syncedAt: now,
            ),
          );
    }
  }

  Future<void> refreshSuppliers() async {
    final response = await _client.get(
      ApiEndpoints.suppliers,
      query: {'status': 'ACTIVE'},
    );
    final rows =
        (response['data']?['suppliers'] as List?)?.cast<Map<String, dynamic>>() ??
            [];
    final now = DateTime.now();
    await _db.delete(_db.suppliersCache).go();
    for (final item in rows) {
      await _db.into(_db.suppliersCache).insertOnConflictUpdate(
            SuppliersCacheCompanion.insert(
              id: item['id'].toString(),
              name: item['name']?.toString() ?? '',
              syncedAt: now,
            ),
          );
    }
  }

  Future<void> refreshCustomers() async {
    final response = await _client.get(
      ApiEndpoints.customers,
      query: {'status': 'ACTIVE', 'limit': 500},
    );
    final rows =
        (response['data']?['customers'] as List?)?.cast<Map<String, dynamic>>() ??
            [];
    final now = DateTime.now();
    await _db.delete(_db.customersCache).go();
    for (final item in rows) {
      await _db.into(_db.customersCache).insertOnConflictUpdate(
            CustomersCacheCompanion.insert(
              id: item['id'].toString(),
              name: item['name']?.toString() ?? '',
              phone: Value(item['phone']?.toString()),
              syncedAt: now,
            ),
          );
    }
  }

  Future<void> refreshPaymentMethods() async {
    final response = await _client.get(
      ApiEndpoints.paymentMethods,
      query: {'status': 'ACTIVE'},
    );
    final rows = (response['data']?['paymentMethods'] as List?)
            ?.cast<Map<String, dynamic>>() ??
        [];
    final now = DateTime.now();
    await _db.delete(_db.paymentMethodsCache).go();
    for (final item in rows) {
      await _db.into(_db.paymentMethodsCache).insertOnConflictUpdate(
            PaymentMethodsCacheCompanion.insert(
              id: item['id'].toString(),
              name: item['name']?.toString() ?? '',
              syncedAt: now,
            ),
          );
    }
  }

  Future<void> refreshInventory() async {
    final response = await _client.get(
      ApiEndpoints.inventoryByItem,
      query: {'limit': 500},
    );
    final rows =
        (response['data']?['items'] as List?)?.cast<Map<String, dynamic>>() ??
            [];
    final now = DateTime.now();
    await _db.delete(_db.inventoryCache).go();
    for (final row in rows) {
      final productId = row['productId']?.toString();
      if (productId == null) continue;
      final stores = (row['stores'] as List?)?.cast<Map<String, dynamic>>() ??
          [];
      if (stores.isEmpty && row['warehouseId'] != null) {
        await _insertInventory(
          productId: productId,
          warehouseId: row['warehouseId'].toString(),
          quantity: _num(row['quantity']),
          available: _num(row['available'] ?? row['quantity']),
          syncedAt: now,
        );
        continue;
      }
      for (final store in stores) {
        final warehouseId = store['warehouseId']?.toString();
        if (warehouseId == null) continue;
        await _insertInventory(
          productId: productId,
          warehouseId: warehouseId,
          quantity: _num(store['quantity']),
          available: _num(store['available'] ?? store['quantity']),
          syncedAt: now,
        );
      }
    }
  }

  Future<void> _insertInventory({
    required String productId,
    required String warehouseId,
    required double quantity,
    required double available,
    required DateTime syncedAt,
  }) async {
    await _db.into(_db.inventoryCache).insertOnConflictUpdate(
          InventoryCacheCompanion.insert(
            productId: productId,
            warehouseId: warehouseId,
            quantity: Value(quantity),
            available: Value(available),
            syncedAt: syncedAt,
          ),
        );
  }

  Future<List<ProductsCacheData>> getProducts({String search = ''}) {
    final query = _db.select(_db.productsCache)
      ..orderBy([(t) => OrderingTerm.asc(t.name)]);
    if (search.isNotEmpty) {
      query.where((t) => t.name.like('%$search%'));
    }
    return query.get();
  }

  Future<List<WarehousesCacheData>> getWarehouses() =>
      _db.select(_db.warehousesCache).get();

  Future<List<SuppliersCacheData>> getSuppliers() =>
      _db.select(_db.suppliersCache).get();

  Future<List<PaymentMethodsCacheData>> getPaymentMethods() =>
      _db.select(_db.paymentMethodsCache).get();

  Future<List<CustomersCacheData>> getCustomers() =>
      _db.select(_db.customersCache).get();

  Future<String?> resolveWarehouseId(String name) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return null;
    final warehouses = await getWarehouses();
    for (final warehouse in warehouses) {
      if (warehouse.name.toLowerCase() == trimmed.toLowerCase()) {
        return warehouse.id;
      }
    }
    return 'local:${trimmed.toLowerCase().replaceAll(RegExp(r'\s+'), '-')}';
  }

  Future<double> stockFor(String productId, String warehouseId) async {
    if (warehouseId.startsWith('local:')) {
      final rows = await (_db.select(_db.inventoryCache)
            ..where((t) => t.productId.equals(productId)))
          .get();
      return rows.fold<double>(0, (sum, row) => sum + row.available);
    }
    final row = await (_db.select(_db.inventoryCache)
          ..where(
            (t) =>
                t.productId.equals(productId) &
                t.warehouseId.equals(warehouseId),
          ))
        .getSingleOrNull();
    return row?.available ?? 0;
  }

  Future<void> adjustLocalStock({
    required String productId,
    required String warehouseId,
    required double delta,
  }) async {
    final row = await (_db.select(_db.inventoryCache)
          ..where(
            (t) =>
                t.productId.equals(productId) &
                t.warehouseId.equals(warehouseId),
          ))
        .getSingleOrNull();
    if (row == null) return;
    final nextQty = (row.quantity + delta).clamp(0, double.infinity);
    final nextAvail = (row.available + delta).clamp(0, double.infinity);
    await (_db.update(_db.inventoryCache)
          ..where(
            (t) =>
                t.productId.equals(productId) &
                t.warehouseId.equals(warehouseId),
          ))
        .write(
      InventoryCacheCompanion(
        quantity: Value(nextQty.toDouble()),
        available: Value(nextAvail.toDouble()),
        syncedAt: Value(DateTime.now()),
      ),
    );
  }

  double _num(dynamic value) {
    if (value == null) return 0;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString()) ?? 0;
  }
}
