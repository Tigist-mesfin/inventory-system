import '../core/utils/money_format.dart';
import 'server_list_models.dart';

class StockStoreQty {
  StockStoreQty({
    required this.warehouseId,
    required this.name,
    required this.quantity,
  });

  factory StockStoreQty.fromJson(Map<String, dynamic> json) {
    return StockStoreQty(
      warehouseId: json['warehouseId']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Store',
      quantity: parseServerNum(json['quantity']),
    );
  }

  final String warehouseId;
  final String name;
  final double quantity;
}

class StockItemRow {
  StockItemRow({
    required this.productId,
    required this.name,
    required this.sku,
    required this.unit,
    required this.brand,
    required this.size,
    required this.color,
    required this.sellingPrice,
    required this.purchasePrice,
    required this.quantity,
    required this.isLowStock,
    required this.stores,
    this.lastDeliveredAt,
  });

  factory StockItemRow.fromJson(Map<String, dynamic> json) {
    final product = json['product'] is Map
        ? Map<String, dynamic>.from(json['product'] as Map)
        : <String, dynamic>{};
    final stores = (json['stores'] as List?)
            ?.whereType<Map>()
            .map((row) => StockStoreQty.fromJson(Map<String, dynamic>.from(row)))
            .toList() ??
        const <StockStoreQty>[];
    return StockItemRow(
      productId: json['productId']?.toString() ?? product['id']?.toString() ?? '',
      name: product['name']?.toString() ??
          json['productName']?.toString() ??
          'Item',
      sku: product['sku']?.toString() ?? '',
      unit: product['unit']?.toString() ?? '',
      brand: product['brand']?.toString() ?? '',
      size: product['size']?.toString() ?? '',
      color: product['color']?.toString() ?? '',
      sellingPrice: parseServerNum(product['sellingPrice']),
      purchasePrice: parseServerNum(product['purchasePrice']),
      quantity: parseServerNum(json['quantity'] ?? json['available']),
      isLowStock: json['isLowStock'] == true,
      stores: stores,
      lastDeliveredAt: json['lastDeliveredAt']?.toString(),
    );
  }

  final String productId;
  final String name;
  final String sku;
  final String unit;
  final String brand;
  final String size;
  final String color;
  final double sellingPrice;
  final double purchasePrice;
  final double quantity;
  final bool isLowStock;
  final List<StockStoreQty> stores;
  final String? lastDeliveredAt;

  String get variantText =>
      [brand, size, color].where((v) => v.isNotEmpty).join(' · ');

  String get storesText {
    if (stores.isEmpty) return '—';
    return stores
        .map((s) => '${s.name}: ${qty(s.quantity)}')
        .join('; ');
  }

  double qtyInStore(String? warehouseId) {
    if (warehouseId == null || warehouseId.isEmpty) return quantity;
    for (final store in stores) {
      if (store.warehouseId == warehouseId) return store.quantity;
    }
    return 0;
  }

  String get deliveredText {
    final value = lastDeliveredAt;
    if (value == null || value.isEmpty) return '—';
    return value.length >= 10 ? value.substring(0, 10) : value;
  }
}

class UndeliveredStockRow {
  UndeliveredStockRow({
    required this.id,
    required this.productId,
    required this.productName,
    required this.unit,
    required this.quantity,
    required this.remainingQuantity,
    required this.party,
    required this.document,
    required this.date,
    required this.deliveryStatus,
  });

  factory UndeliveredStockRow.fromJson(Map<String, dynamic> json) {
    return UndeliveredStockRow(
      id: json['id']?.toString() ?? '',
      productId: json['productId']?.toString() ?? '',
      productName: json['productName']?.toString() ?? 'Item',
      unit: json['unit']?.toString() ?? '',
      quantity: parseServerNum(json['quantity']),
      remainingQuantity: parseServerNum(
        json['remainingQuantity'] ?? json['quantity'],
      ),
      party: json['party']?.toString() ?? '',
      document: json['document']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      deliveryStatus: json['deliveryStatus']?.toString() ?? 'NOT_DELIVERED',
    );
  }

  final String id;
  final String productId;
  final String productName;
  final String unit;
  final double quantity;
  final double remainingQuantity;
  final String party;
  final String document;
  final String date;
  final String deliveryStatus;

  String get dateText {
    if (date.isEmpty) return '—';
    return date.length >= 10 ? date.substring(0, 10) : date;
  }
}

class StockOverviewStore {
  StockOverviewStore({
    required this.warehouseId,
    required this.name,
    required this.itemCount,
    required this.quantity,
  });

  factory StockOverviewStore.fromJson(Map<String, dynamic> json) {
    return StockOverviewStore(
      warehouseId: json['warehouseId']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Store',
      itemCount: parseServerInt(json['itemCount']),
      quantity: parseServerNum(json['quantity']),
    );
  }

  final String warehouseId;
  final String name;
  final int itemCount;
  final double quantity;
}

class StockOverview {
  StockOverview({
    required this.stores,
    required this.lowStockCount,
    required this.undeliveredCount,
  });

  factory StockOverview.empty() => StockOverview(
        stores: const [],
        lowStockCount: 0,
        undeliveredCount: 0,
      );

  factory StockOverview.fromJson(Map<String, dynamic>? json) {
    final stores = (json?['stores'] as List?)
            ?.whereType<Map>()
            .map((row) => StockOverviewStore.fromJson(Map<String, dynamic>.from(row)))
            .toList() ??
        const <StockOverviewStore>[];
    return StockOverview(
      stores: stores,
      lowStockCount: parseServerInt(json?['lowStockCount']),
      undeliveredCount: parseServerInt(json?['undeliveredCount']),
    );
  }

  final List<StockOverviewStore> stores;
  final int lowStockCount;
  final int undeliveredCount;
}

class StockFilters {
  const StockFilters({
    this.search = '',
    this.warehouseId = '',
    this.from = '',
    this.to = '',
    this.lowStock = false,
  });

  final String search;
  final String warehouseId;
  final String from;
  final String to;
  final bool lowStock;

  StockFilters copyWith({
    String? search,
    String? warehouseId,
    String? from,
    String? to,
    bool? lowStock,
  }) {
    return StockFilters(
      search: search ?? this.search,
      warehouseId: warehouseId ?? this.warehouseId,
      from: from ?? this.from,
      to: to ?? this.to,
      lowStock: lowStock ?? this.lowStock,
    );
  }

  Map<String, dynamic> toQuery() {
    final query = <String, dynamic>{'limit': 500};
    if (warehouseId.isNotEmpty) query['warehouseId'] = warehouseId;
    if (from.isNotEmpty) query['from'] = from;
    if (to.isNotEmpty) query['to'] = to;
    if (lowStock) query['lowStock'] = true;
    return query;
  }
}

List<T> rankStockRows<T>(
  List<T> list,
  String search, {
  required String Function(T row) nameOf,
  required String Function(T row) hayOf,
}) {
  final term = search.trim().toLowerCase();
  if (term.isEmpty) return list;
  final starts = <T>[];
  final contains = <T>[];
  for (final row in list) {
    final name = nameOf(row).toLowerCase();
    final hay = hayOf(row).toLowerCase();
    if (name.startsWith(term)) {
      starts.add(row);
    } else if (hay.contains(term)) {
      contains.add(row);
    }
  }
  return [...starts, ...contains];
}
