import '../core/utils/money_format.dart';

class ProductUnit {
  const ProductUnit(this.name, this.code);

  final String name;
  final String code;

  String get label => '$name ($code)';
}

const kProductUnits = <ProductUnit>[
  ProductUnit('Piece', 'PCS'),
  ProductUnit('Unit', 'UNIT'),
  ProductUnit('Kilogram', 'KG'),
  ProductUnit('Gram', 'G'),
  ProductUnit('Ton', 'TON'),
  ProductUnit('Liter', 'L'),
  ProductUnit('Milliliter', 'ML'),
  ProductUnit('Meter', 'M'),
  ProductUnit('Centimeter', 'CM'),
  ProductUnit('Kilometer', 'KM'),
  ProductUnit('Square Meter', 'M2'),
  ProductUnit('Cubic Meter', 'M3'),
  ProductUnit('Box', 'BOX'),
  ProductUnit('Carton', 'CTN'),
  ProductUnit('Pack', 'PACK'),
  ProductUnit('Pair', 'PAIR'),
  ProductUnit('Set', 'SET'),
  ProductUnit('Dozen', 'DOZ'),
  ProductUnit('Roll', 'ROLL'),
  ProductUnit('Bag', 'BAG'),
  ProductUnit('Bottle', 'BTL'),
  ProductUnit('Can', 'CAN'),
  ProductUnit('Bucket', 'BUCKET'),
  ProductUnit('Sack', 'SACK'),
];

const _legacyUnits = <String, String>{
  'LITER': 'L',
  'LITRE': 'L',
  'PIECE': 'PCS',
  'DOZEN': 'DOZ',
  'BOTTLE': 'BTL',
  'CARTON': 'CTN',
};

String normalizeProductUnit(String? value) {
  final raw = (value ?? 'PCS').trim();
  if (raw.isEmpty) return 'PCS';
  final mapped = _legacyUnits[raw.toUpperCase()];
  if (mapped != null) return mapped;
  for (final unit in kProductUnits) {
    if (unit.code.toLowerCase() == raw.toLowerCase() ||
        unit.name.toLowerCase() == raw.toLowerCase()) {
      return unit.code;
    }
  }
  return raw.toUpperCase();
}

String productUnitLabel(String? code) {
  final normalized = normalizeProductUnit(code);
  for (final unit in kProductUnits) {
    if (unit.code == normalized) return unit.label;
  }
  return normalized;
}

class CatalogProduct {
  CatalogProduct({
    required this.id,
    required this.name,
    required this.unit,
    required this.sellingPrice,
    required this.purchasePrice,
    this.brand = '',
    this.barcode = '',
    this.color = '',
    this.sku = '',
    this.status = 'ACTIVE',
  });

  factory CatalogProduct.fromJson(Map<String, dynamic> json) {
    return CatalogProduct(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      unit: normalizeProductUnit(json['unit']?.toString()),
      sellingPrice: parseMoney(json['sellingPrice']),
      purchasePrice: parseMoney(json['purchasePrice']),
      brand: json['brand']?.toString() ?? '',
      barcode: json['barcode']?.toString() ?? '',
      color: json['color']?.toString() ?? '',
      sku: json['sku']?.toString() ?? '',
      status: json['status']?.toString() ?? 'ACTIVE',
    );
  }

  final String id;
  final String name;
  final String unit;
  final double sellingPrice;
  final double purchasePrice;
  final String brand;
  final String barcode;
  final String color;
  final String sku;
  final String status;

  String get unitLabel => productUnitLabel(unit);

  bool matches(String query) {
    final needle = query.trim().toLowerCase();
    if (needle.isEmpty) return true;
    final hay =
        '$name $brand $color $barcode $sku'.toLowerCase();
    return hay.contains(needle);
  }
}
