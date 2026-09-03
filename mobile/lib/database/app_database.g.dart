// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $ProductsCacheTable extends ProductsCache
    with TableInfo<$ProductsCacheTable, ProductsCacheData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ProductsCacheTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _skuMeta = const VerificationMeta('sku');
  @override
  late final GeneratedColumn<String> sku = GeneratedColumn<String>(
    'sku',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _unitMeta = const VerificationMeta('unit');
  @override
  late final GeneratedColumn<String> unit = GeneratedColumn<String>(
    'unit',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _purchasePriceMeta = const VerificationMeta(
    'purchasePrice',
  );
  @override
  late final GeneratedColumn<double> purchasePrice = GeneratedColumn<double>(
    'purchase_price',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _sellingPriceMeta = const VerificationMeta(
    'sellingPrice',
  );
  @override
  late final GeneratedColumn<double> sellingPrice = GeneratedColumn<double>(
    'selling_price',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _brandMeta = const VerificationMeta('brand');
  @override
  late final GeneratedColumn<String> brand = GeneratedColumn<String>(
    'brand',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _syncedAtMeta = const VerificationMeta(
    'syncedAt',
  );
  @override
  late final GeneratedColumn<DateTime> syncedAt = GeneratedColumn<DateTime>(
    'synced_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    name,
    sku,
    unit,
    purchasePrice,
    sellingPrice,
    brand,
    syncedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'products_cache';
  @override
  VerificationContext validateIntegrity(
    Insertable<ProductsCacheData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('sku')) {
      context.handle(
        _skuMeta,
        sku.isAcceptableOrUnknown(data['sku']!, _skuMeta),
      );
    }
    if (data.containsKey('unit')) {
      context.handle(
        _unitMeta,
        unit.isAcceptableOrUnknown(data['unit']!, _unitMeta),
      );
    } else if (isInserting) {
      context.missing(_unitMeta);
    }
    if (data.containsKey('purchase_price')) {
      context.handle(
        _purchasePriceMeta,
        purchasePrice.isAcceptableOrUnknown(
          data['purchase_price']!,
          _purchasePriceMeta,
        ),
      );
    }
    if (data.containsKey('selling_price')) {
      context.handle(
        _sellingPriceMeta,
        sellingPrice.isAcceptableOrUnknown(
          data['selling_price']!,
          _sellingPriceMeta,
        ),
      );
    }
    if (data.containsKey('brand')) {
      context.handle(
        _brandMeta,
        brand.isAcceptableOrUnknown(data['brand']!, _brandMeta),
      );
    }
    if (data.containsKey('synced_at')) {
      context.handle(
        _syncedAtMeta,
        syncedAt.isAcceptableOrUnknown(data['synced_at']!, _syncedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_syncedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  ProductsCacheData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ProductsCacheData(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      sku: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}sku'],
      ),
      unit: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}unit'],
      )!,
      purchasePrice: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}purchase_price'],
      )!,
      sellingPrice: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}selling_price'],
      )!,
      brand: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}brand'],
      ),
      syncedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}synced_at'],
      )!,
    );
  }

  @override
  $ProductsCacheTable createAlias(String alias) {
    return $ProductsCacheTable(attachedDatabase, alias);
  }
}

class ProductsCacheData extends DataClass
    implements Insertable<ProductsCacheData> {
  final String id;
  final String name;
  final String? sku;
  final String unit;
  final double purchasePrice;
  final double sellingPrice;
  final String? brand;
  final DateTime syncedAt;
  const ProductsCacheData({
    required this.id,
    required this.name,
    this.sku,
    required this.unit,
    required this.purchasePrice,
    required this.sellingPrice,
    this.brand,
    required this.syncedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['name'] = Variable<String>(name);
    if (!nullToAbsent || sku != null) {
      map['sku'] = Variable<String>(sku);
    }
    map['unit'] = Variable<String>(unit);
    map['purchase_price'] = Variable<double>(purchasePrice);
    map['selling_price'] = Variable<double>(sellingPrice);
    if (!nullToAbsent || brand != null) {
      map['brand'] = Variable<String>(brand);
    }
    map['synced_at'] = Variable<DateTime>(syncedAt);
    return map;
  }

  ProductsCacheCompanion toCompanion(bool nullToAbsent) {
    return ProductsCacheCompanion(
      id: Value(id),
      name: Value(name),
      sku: sku == null && nullToAbsent ? const Value.absent() : Value(sku),
      unit: Value(unit),
      purchasePrice: Value(purchasePrice),
      sellingPrice: Value(sellingPrice),
      brand: brand == null && nullToAbsent
          ? const Value.absent()
          : Value(brand),
      syncedAt: Value(syncedAt),
    );
  }

  factory ProductsCacheData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ProductsCacheData(
      id: serializer.fromJson<String>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      sku: serializer.fromJson<String?>(json['sku']),
      unit: serializer.fromJson<String>(json['unit']),
      purchasePrice: serializer.fromJson<double>(json['purchasePrice']),
      sellingPrice: serializer.fromJson<double>(json['sellingPrice']),
      brand: serializer.fromJson<String?>(json['brand']),
      syncedAt: serializer.fromJson<DateTime>(json['syncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'name': serializer.toJson<String>(name),
      'sku': serializer.toJson<String?>(sku),
      'unit': serializer.toJson<String>(unit),
      'purchasePrice': serializer.toJson<double>(purchasePrice),
      'sellingPrice': serializer.toJson<double>(sellingPrice),
      'brand': serializer.toJson<String?>(brand),
      'syncedAt': serializer.toJson<DateTime>(syncedAt),
    };
  }

  ProductsCacheData copyWith({
    String? id,
    String? name,
    Value<String?> sku = const Value.absent(),
    String? unit,
    double? purchasePrice,
    double? sellingPrice,
    Value<String?> brand = const Value.absent(),
    DateTime? syncedAt,
  }) => ProductsCacheData(
    id: id ?? this.id,
    name: name ?? this.name,
    sku: sku.present ? sku.value : this.sku,
    unit: unit ?? this.unit,
    purchasePrice: purchasePrice ?? this.purchasePrice,
    sellingPrice: sellingPrice ?? this.sellingPrice,
    brand: brand.present ? brand.value : this.brand,
    syncedAt: syncedAt ?? this.syncedAt,
  );
  ProductsCacheData copyWithCompanion(ProductsCacheCompanion data) {
    return ProductsCacheData(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      sku: data.sku.present ? data.sku.value : this.sku,
      unit: data.unit.present ? data.unit.value : this.unit,
      purchasePrice: data.purchasePrice.present
          ? data.purchasePrice.value
          : this.purchasePrice,
      sellingPrice: data.sellingPrice.present
          ? data.sellingPrice.value
          : this.sellingPrice,
      brand: data.brand.present ? data.brand.value : this.brand,
      syncedAt: data.syncedAt.present ? data.syncedAt.value : this.syncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ProductsCacheData(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('sku: $sku, ')
          ..write('unit: $unit, ')
          ..write('purchasePrice: $purchasePrice, ')
          ..write('sellingPrice: $sellingPrice, ')
          ..write('brand: $brand, ')
          ..write('syncedAt: $syncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    name,
    sku,
    unit,
    purchasePrice,
    sellingPrice,
    brand,
    syncedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ProductsCacheData &&
          other.id == this.id &&
          other.name == this.name &&
          other.sku == this.sku &&
          other.unit == this.unit &&
          other.purchasePrice == this.purchasePrice &&
          other.sellingPrice == this.sellingPrice &&
          other.brand == this.brand &&
          other.syncedAt == this.syncedAt);
}

class ProductsCacheCompanion extends UpdateCompanion<ProductsCacheData> {
  final Value<String> id;
  final Value<String> name;
  final Value<String?> sku;
  final Value<String> unit;
  final Value<double> purchasePrice;
  final Value<double> sellingPrice;
  final Value<String?> brand;
  final Value<DateTime> syncedAt;
  final Value<int> rowid;
  const ProductsCacheCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.sku = const Value.absent(),
    this.unit = const Value.absent(),
    this.purchasePrice = const Value.absent(),
    this.sellingPrice = const Value.absent(),
    this.brand = const Value.absent(),
    this.syncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  ProductsCacheCompanion.insert({
    required String id,
    required String name,
    this.sku = const Value.absent(),
    required String unit,
    this.purchasePrice = const Value.absent(),
    this.sellingPrice = const Value.absent(),
    this.brand = const Value.absent(),
    required DateTime syncedAt,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       name = Value(name),
       unit = Value(unit),
       syncedAt = Value(syncedAt);
  static Insertable<ProductsCacheData> custom({
    Expression<String>? id,
    Expression<String>? name,
    Expression<String>? sku,
    Expression<String>? unit,
    Expression<double>? purchasePrice,
    Expression<double>? sellingPrice,
    Expression<String>? brand,
    Expression<DateTime>? syncedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (sku != null) 'sku': sku,
      if (unit != null) 'unit': unit,
      if (purchasePrice != null) 'purchase_price': purchasePrice,
      if (sellingPrice != null) 'selling_price': sellingPrice,
      if (brand != null) 'brand': brand,
      if (syncedAt != null) 'synced_at': syncedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  ProductsCacheCompanion copyWith({
    Value<String>? id,
    Value<String>? name,
    Value<String?>? sku,
    Value<String>? unit,
    Value<double>? purchasePrice,
    Value<double>? sellingPrice,
    Value<String?>? brand,
    Value<DateTime>? syncedAt,
    Value<int>? rowid,
  }) {
    return ProductsCacheCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      sku: sku ?? this.sku,
      unit: unit ?? this.unit,
      purchasePrice: purchasePrice ?? this.purchasePrice,
      sellingPrice: sellingPrice ?? this.sellingPrice,
      brand: brand ?? this.brand,
      syncedAt: syncedAt ?? this.syncedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (sku.present) {
      map['sku'] = Variable<String>(sku.value);
    }
    if (unit.present) {
      map['unit'] = Variable<String>(unit.value);
    }
    if (purchasePrice.present) {
      map['purchase_price'] = Variable<double>(purchasePrice.value);
    }
    if (sellingPrice.present) {
      map['selling_price'] = Variable<double>(sellingPrice.value);
    }
    if (brand.present) {
      map['brand'] = Variable<String>(brand.value);
    }
    if (syncedAt.present) {
      map['synced_at'] = Variable<DateTime>(syncedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ProductsCacheCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('sku: $sku, ')
          ..write('unit: $unit, ')
          ..write('purchasePrice: $purchasePrice, ')
          ..write('sellingPrice: $sellingPrice, ')
          ..write('brand: $brand, ')
          ..write('syncedAt: $syncedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $WarehousesCacheTable extends WarehousesCache
    with TableInfo<$WarehousesCacheTable, WarehousesCacheData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $WarehousesCacheTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _codeMeta = const VerificationMeta('code');
  @override
  late final GeneratedColumn<String> code = GeneratedColumn<String>(
    'code',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _syncedAtMeta = const VerificationMeta(
    'syncedAt',
  );
  @override
  late final GeneratedColumn<DateTime> syncedAt = GeneratedColumn<DateTime>(
    'synced_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [id, name, code, syncedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'warehouses_cache';
  @override
  VerificationContext validateIntegrity(
    Insertable<WarehousesCacheData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('code')) {
      context.handle(
        _codeMeta,
        code.isAcceptableOrUnknown(data['code']!, _codeMeta),
      );
    }
    if (data.containsKey('synced_at')) {
      context.handle(
        _syncedAtMeta,
        syncedAt.isAcceptableOrUnknown(data['synced_at']!, _syncedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_syncedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  WarehousesCacheData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return WarehousesCacheData(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      code: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}code'],
      ),
      syncedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}synced_at'],
      )!,
    );
  }

  @override
  $WarehousesCacheTable createAlias(String alias) {
    return $WarehousesCacheTable(attachedDatabase, alias);
  }
}

class WarehousesCacheData extends DataClass
    implements Insertable<WarehousesCacheData> {
  final String id;
  final String name;
  final String? code;
  final DateTime syncedAt;
  const WarehousesCacheData({
    required this.id,
    required this.name,
    this.code,
    required this.syncedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['name'] = Variable<String>(name);
    if (!nullToAbsent || code != null) {
      map['code'] = Variable<String>(code);
    }
    map['synced_at'] = Variable<DateTime>(syncedAt);
    return map;
  }

  WarehousesCacheCompanion toCompanion(bool nullToAbsent) {
    return WarehousesCacheCompanion(
      id: Value(id),
      name: Value(name),
      code: code == null && nullToAbsent ? const Value.absent() : Value(code),
      syncedAt: Value(syncedAt),
    );
  }

  factory WarehousesCacheData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return WarehousesCacheData(
      id: serializer.fromJson<String>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      code: serializer.fromJson<String?>(json['code']),
      syncedAt: serializer.fromJson<DateTime>(json['syncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'name': serializer.toJson<String>(name),
      'code': serializer.toJson<String?>(code),
      'syncedAt': serializer.toJson<DateTime>(syncedAt),
    };
  }

  WarehousesCacheData copyWith({
    String? id,
    String? name,
    Value<String?> code = const Value.absent(),
    DateTime? syncedAt,
  }) => WarehousesCacheData(
    id: id ?? this.id,
    name: name ?? this.name,
    code: code.present ? code.value : this.code,
    syncedAt: syncedAt ?? this.syncedAt,
  );
  WarehousesCacheData copyWithCompanion(WarehousesCacheCompanion data) {
    return WarehousesCacheData(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      code: data.code.present ? data.code.value : this.code,
      syncedAt: data.syncedAt.present ? data.syncedAt.value : this.syncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('WarehousesCacheData(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('code: $code, ')
          ..write('syncedAt: $syncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, name, code, syncedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is WarehousesCacheData &&
          other.id == this.id &&
          other.name == this.name &&
          other.code == this.code &&
          other.syncedAt == this.syncedAt);
}

class WarehousesCacheCompanion extends UpdateCompanion<WarehousesCacheData> {
  final Value<String> id;
  final Value<String> name;
  final Value<String?> code;
  final Value<DateTime> syncedAt;
  final Value<int> rowid;
  const WarehousesCacheCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.code = const Value.absent(),
    this.syncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  WarehousesCacheCompanion.insert({
    required String id,
    required String name,
    this.code = const Value.absent(),
    required DateTime syncedAt,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       name = Value(name),
       syncedAt = Value(syncedAt);
  static Insertable<WarehousesCacheData> custom({
    Expression<String>? id,
    Expression<String>? name,
    Expression<String>? code,
    Expression<DateTime>? syncedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (code != null) 'code': code,
      if (syncedAt != null) 'synced_at': syncedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  WarehousesCacheCompanion copyWith({
    Value<String>? id,
    Value<String>? name,
    Value<String?>? code,
    Value<DateTime>? syncedAt,
    Value<int>? rowid,
  }) {
    return WarehousesCacheCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      code: code ?? this.code,
      syncedAt: syncedAt ?? this.syncedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (code.present) {
      map['code'] = Variable<String>(code.value);
    }
    if (syncedAt.present) {
      map['synced_at'] = Variable<DateTime>(syncedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('WarehousesCacheCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('code: $code, ')
          ..write('syncedAt: $syncedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $SuppliersCacheTable extends SuppliersCache
    with TableInfo<$SuppliersCacheTable, SuppliersCacheData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SuppliersCacheTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _syncedAtMeta = const VerificationMeta(
    'syncedAt',
  );
  @override
  late final GeneratedColumn<DateTime> syncedAt = GeneratedColumn<DateTime>(
    'synced_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [id, name, syncedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'suppliers_cache';
  @override
  VerificationContext validateIntegrity(
    Insertable<SuppliersCacheData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('synced_at')) {
      context.handle(
        _syncedAtMeta,
        syncedAt.isAcceptableOrUnknown(data['synced_at']!, _syncedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_syncedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  SuppliersCacheData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SuppliersCacheData(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      syncedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}synced_at'],
      )!,
    );
  }

  @override
  $SuppliersCacheTable createAlias(String alias) {
    return $SuppliersCacheTable(attachedDatabase, alias);
  }
}

class SuppliersCacheData extends DataClass
    implements Insertable<SuppliersCacheData> {
  final String id;
  final String name;
  final DateTime syncedAt;
  const SuppliersCacheData({
    required this.id,
    required this.name,
    required this.syncedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['name'] = Variable<String>(name);
    map['synced_at'] = Variable<DateTime>(syncedAt);
    return map;
  }

  SuppliersCacheCompanion toCompanion(bool nullToAbsent) {
    return SuppliersCacheCompanion(
      id: Value(id),
      name: Value(name),
      syncedAt: Value(syncedAt),
    );
  }

  factory SuppliersCacheData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SuppliersCacheData(
      id: serializer.fromJson<String>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      syncedAt: serializer.fromJson<DateTime>(json['syncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'name': serializer.toJson<String>(name),
      'syncedAt': serializer.toJson<DateTime>(syncedAt),
    };
  }

  SuppliersCacheData copyWith({String? id, String? name, DateTime? syncedAt}) =>
      SuppliersCacheData(
        id: id ?? this.id,
        name: name ?? this.name,
        syncedAt: syncedAt ?? this.syncedAt,
      );
  SuppliersCacheData copyWithCompanion(SuppliersCacheCompanion data) {
    return SuppliersCacheData(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      syncedAt: data.syncedAt.present ? data.syncedAt.value : this.syncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SuppliersCacheData(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('syncedAt: $syncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, name, syncedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SuppliersCacheData &&
          other.id == this.id &&
          other.name == this.name &&
          other.syncedAt == this.syncedAt);
}

class SuppliersCacheCompanion extends UpdateCompanion<SuppliersCacheData> {
  final Value<String> id;
  final Value<String> name;
  final Value<DateTime> syncedAt;
  final Value<int> rowid;
  const SuppliersCacheCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.syncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  SuppliersCacheCompanion.insert({
    required String id,
    required String name,
    required DateTime syncedAt,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       name = Value(name),
       syncedAt = Value(syncedAt);
  static Insertable<SuppliersCacheData> custom({
    Expression<String>? id,
    Expression<String>? name,
    Expression<DateTime>? syncedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (syncedAt != null) 'synced_at': syncedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  SuppliersCacheCompanion copyWith({
    Value<String>? id,
    Value<String>? name,
    Value<DateTime>? syncedAt,
    Value<int>? rowid,
  }) {
    return SuppliersCacheCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      syncedAt: syncedAt ?? this.syncedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (syncedAt.present) {
      map['synced_at'] = Variable<DateTime>(syncedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SuppliersCacheCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('syncedAt: $syncedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $PaymentMethodsCacheTable extends PaymentMethodsCache
    with TableInfo<$PaymentMethodsCacheTable, PaymentMethodsCacheData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PaymentMethodsCacheTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _syncedAtMeta = const VerificationMeta(
    'syncedAt',
  );
  @override
  late final GeneratedColumn<DateTime> syncedAt = GeneratedColumn<DateTime>(
    'synced_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [id, name, syncedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'payment_methods_cache';
  @override
  VerificationContext validateIntegrity(
    Insertable<PaymentMethodsCacheData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('synced_at')) {
      context.handle(
        _syncedAtMeta,
        syncedAt.isAcceptableOrUnknown(data['synced_at']!, _syncedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_syncedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  PaymentMethodsCacheData map(
    Map<String, dynamic> data, {
    String? tablePrefix,
  }) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return PaymentMethodsCacheData(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      syncedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}synced_at'],
      )!,
    );
  }

  @override
  $PaymentMethodsCacheTable createAlias(String alias) {
    return $PaymentMethodsCacheTable(attachedDatabase, alias);
  }
}

class PaymentMethodsCacheData extends DataClass
    implements Insertable<PaymentMethodsCacheData> {
  final String id;
  final String name;
  final DateTime syncedAt;
  const PaymentMethodsCacheData({
    required this.id,
    required this.name,
    required this.syncedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['name'] = Variable<String>(name);
    map['synced_at'] = Variable<DateTime>(syncedAt);
    return map;
  }

  PaymentMethodsCacheCompanion toCompanion(bool nullToAbsent) {
    return PaymentMethodsCacheCompanion(
      id: Value(id),
      name: Value(name),
      syncedAt: Value(syncedAt),
    );
  }

  factory PaymentMethodsCacheData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return PaymentMethodsCacheData(
      id: serializer.fromJson<String>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      syncedAt: serializer.fromJson<DateTime>(json['syncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'name': serializer.toJson<String>(name),
      'syncedAt': serializer.toJson<DateTime>(syncedAt),
    };
  }

  PaymentMethodsCacheData copyWith({
    String? id,
    String? name,
    DateTime? syncedAt,
  }) => PaymentMethodsCacheData(
    id: id ?? this.id,
    name: name ?? this.name,
    syncedAt: syncedAt ?? this.syncedAt,
  );
  PaymentMethodsCacheData copyWithCompanion(PaymentMethodsCacheCompanion data) {
    return PaymentMethodsCacheData(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      syncedAt: data.syncedAt.present ? data.syncedAt.value : this.syncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('PaymentMethodsCacheData(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('syncedAt: $syncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, name, syncedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PaymentMethodsCacheData &&
          other.id == this.id &&
          other.name == this.name &&
          other.syncedAt == this.syncedAt);
}

class PaymentMethodsCacheCompanion
    extends UpdateCompanion<PaymentMethodsCacheData> {
  final Value<String> id;
  final Value<String> name;
  final Value<DateTime> syncedAt;
  final Value<int> rowid;
  const PaymentMethodsCacheCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.syncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  PaymentMethodsCacheCompanion.insert({
    required String id,
    required String name,
    required DateTime syncedAt,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       name = Value(name),
       syncedAt = Value(syncedAt);
  static Insertable<PaymentMethodsCacheData> custom({
    Expression<String>? id,
    Expression<String>? name,
    Expression<DateTime>? syncedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (syncedAt != null) 'synced_at': syncedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  PaymentMethodsCacheCompanion copyWith({
    Value<String>? id,
    Value<String>? name,
    Value<DateTime>? syncedAt,
    Value<int>? rowid,
  }) {
    return PaymentMethodsCacheCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      syncedAt: syncedAt ?? this.syncedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (syncedAt.present) {
      map['synced_at'] = Variable<DateTime>(syncedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PaymentMethodsCacheCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('syncedAt: $syncedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CustomersCacheTable extends CustomersCache
    with TableInfo<$CustomersCacheTable, CustomersCacheData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CustomersCacheTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _phoneMeta = const VerificationMeta('phone');
  @override
  late final GeneratedColumn<String> phone = GeneratedColumn<String>(
    'phone',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _syncedAtMeta = const VerificationMeta(
    'syncedAt',
  );
  @override
  late final GeneratedColumn<DateTime> syncedAt = GeneratedColumn<DateTime>(
    'synced_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [id, name, phone, syncedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'customers_cache';
  @override
  VerificationContext validateIntegrity(
    Insertable<CustomersCacheData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('phone')) {
      context.handle(
        _phoneMeta,
        phone.isAcceptableOrUnknown(data['phone']!, _phoneMeta),
      );
    }
    if (data.containsKey('synced_at')) {
      context.handle(
        _syncedAtMeta,
        syncedAt.isAcceptableOrUnknown(data['synced_at']!, _syncedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_syncedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CustomersCacheData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CustomersCacheData(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      phone: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}phone'],
      ),
      syncedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}synced_at'],
      )!,
    );
  }

  @override
  $CustomersCacheTable createAlias(String alias) {
    return $CustomersCacheTable(attachedDatabase, alias);
  }
}

class CustomersCacheData extends DataClass
    implements Insertable<CustomersCacheData> {
  final String id;
  final String name;
  final String? phone;
  final DateTime syncedAt;
  const CustomersCacheData({
    required this.id,
    required this.name,
    this.phone,
    required this.syncedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['name'] = Variable<String>(name);
    if (!nullToAbsent || phone != null) {
      map['phone'] = Variable<String>(phone);
    }
    map['synced_at'] = Variable<DateTime>(syncedAt);
    return map;
  }

  CustomersCacheCompanion toCompanion(bool nullToAbsent) {
    return CustomersCacheCompanion(
      id: Value(id),
      name: Value(name),
      phone: phone == null && nullToAbsent
          ? const Value.absent()
          : Value(phone),
      syncedAt: Value(syncedAt),
    );
  }

  factory CustomersCacheData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CustomersCacheData(
      id: serializer.fromJson<String>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      phone: serializer.fromJson<String?>(json['phone']),
      syncedAt: serializer.fromJson<DateTime>(json['syncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'name': serializer.toJson<String>(name),
      'phone': serializer.toJson<String?>(phone),
      'syncedAt': serializer.toJson<DateTime>(syncedAt),
    };
  }

  CustomersCacheData copyWith({
    String? id,
    String? name,
    Value<String?> phone = const Value.absent(),
    DateTime? syncedAt,
  }) => CustomersCacheData(
    id: id ?? this.id,
    name: name ?? this.name,
    phone: phone.present ? phone.value : this.phone,
    syncedAt: syncedAt ?? this.syncedAt,
  );
  CustomersCacheData copyWithCompanion(CustomersCacheCompanion data) {
    return CustomersCacheData(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      phone: data.phone.present ? data.phone.value : this.phone,
      syncedAt: data.syncedAt.present ? data.syncedAt.value : this.syncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CustomersCacheData(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('phone: $phone, ')
          ..write('syncedAt: $syncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, name, phone, syncedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CustomersCacheData &&
          other.id == this.id &&
          other.name == this.name &&
          other.phone == this.phone &&
          other.syncedAt == this.syncedAt);
}

class CustomersCacheCompanion extends UpdateCompanion<CustomersCacheData> {
  final Value<String> id;
  final Value<String> name;
  final Value<String?> phone;
  final Value<DateTime> syncedAt;
  final Value<int> rowid;
  const CustomersCacheCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.phone = const Value.absent(),
    this.syncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CustomersCacheCompanion.insert({
    required String id,
    required String name,
    this.phone = const Value.absent(),
    required DateTime syncedAt,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       name = Value(name),
       syncedAt = Value(syncedAt);
  static Insertable<CustomersCacheData> custom({
    Expression<String>? id,
    Expression<String>? name,
    Expression<String>? phone,
    Expression<DateTime>? syncedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (phone != null) 'phone': phone,
      if (syncedAt != null) 'synced_at': syncedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CustomersCacheCompanion copyWith({
    Value<String>? id,
    Value<String>? name,
    Value<String?>? phone,
    Value<DateTime>? syncedAt,
    Value<int>? rowid,
  }) {
    return CustomersCacheCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      syncedAt: syncedAt ?? this.syncedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (phone.present) {
      map['phone'] = Variable<String>(phone.value);
    }
    if (syncedAt.present) {
      map['synced_at'] = Variable<DateTime>(syncedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CustomersCacheCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('phone: $phone, ')
          ..write('syncedAt: $syncedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $InventoryCacheTable extends InventoryCache
    with TableInfo<$InventoryCacheTable, InventoryCacheData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $InventoryCacheTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _productIdMeta = const VerificationMeta(
    'productId',
  );
  @override
  late final GeneratedColumn<String> productId = GeneratedColumn<String>(
    'product_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _warehouseIdMeta = const VerificationMeta(
    'warehouseId',
  );
  @override
  late final GeneratedColumn<String> warehouseId = GeneratedColumn<String>(
    'warehouse_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _quantityMeta = const VerificationMeta(
    'quantity',
  );
  @override
  late final GeneratedColumn<double> quantity = GeneratedColumn<double>(
    'quantity',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _availableMeta = const VerificationMeta(
    'available',
  );
  @override
  late final GeneratedColumn<double> available = GeneratedColumn<double>(
    'available',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _syncedAtMeta = const VerificationMeta(
    'syncedAt',
  );
  @override
  late final GeneratedColumn<DateTime> syncedAt = GeneratedColumn<DateTime>(
    'synced_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    productId,
    warehouseId,
    quantity,
    available,
    syncedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'inventory_cache';
  @override
  VerificationContext validateIntegrity(
    Insertable<InventoryCacheData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('product_id')) {
      context.handle(
        _productIdMeta,
        productId.isAcceptableOrUnknown(data['product_id']!, _productIdMeta),
      );
    } else if (isInserting) {
      context.missing(_productIdMeta);
    }
    if (data.containsKey('warehouse_id')) {
      context.handle(
        _warehouseIdMeta,
        warehouseId.isAcceptableOrUnknown(
          data['warehouse_id']!,
          _warehouseIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_warehouseIdMeta);
    }
    if (data.containsKey('quantity')) {
      context.handle(
        _quantityMeta,
        quantity.isAcceptableOrUnknown(data['quantity']!, _quantityMeta),
      );
    }
    if (data.containsKey('available')) {
      context.handle(
        _availableMeta,
        available.isAcceptableOrUnknown(data['available']!, _availableMeta),
      );
    }
    if (data.containsKey('synced_at')) {
      context.handle(
        _syncedAtMeta,
        syncedAt.isAcceptableOrUnknown(data['synced_at']!, _syncedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_syncedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {productId, warehouseId};
  @override
  InventoryCacheData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return InventoryCacheData(
      productId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}product_id'],
      )!,
      warehouseId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}warehouse_id'],
      )!,
      quantity: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}quantity'],
      )!,
      available: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}available'],
      )!,
      syncedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}synced_at'],
      )!,
    );
  }

  @override
  $InventoryCacheTable createAlias(String alias) {
    return $InventoryCacheTable(attachedDatabase, alias);
  }
}

class InventoryCacheData extends DataClass
    implements Insertable<InventoryCacheData> {
  final String productId;
  final String warehouseId;
  final double quantity;
  final double available;
  final DateTime syncedAt;
  const InventoryCacheData({
    required this.productId,
    required this.warehouseId,
    required this.quantity,
    required this.available,
    required this.syncedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['product_id'] = Variable<String>(productId);
    map['warehouse_id'] = Variable<String>(warehouseId);
    map['quantity'] = Variable<double>(quantity);
    map['available'] = Variable<double>(available);
    map['synced_at'] = Variable<DateTime>(syncedAt);
    return map;
  }

  InventoryCacheCompanion toCompanion(bool nullToAbsent) {
    return InventoryCacheCompanion(
      productId: Value(productId),
      warehouseId: Value(warehouseId),
      quantity: Value(quantity),
      available: Value(available),
      syncedAt: Value(syncedAt),
    );
  }

  factory InventoryCacheData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return InventoryCacheData(
      productId: serializer.fromJson<String>(json['productId']),
      warehouseId: serializer.fromJson<String>(json['warehouseId']),
      quantity: serializer.fromJson<double>(json['quantity']),
      available: serializer.fromJson<double>(json['available']),
      syncedAt: serializer.fromJson<DateTime>(json['syncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'productId': serializer.toJson<String>(productId),
      'warehouseId': serializer.toJson<String>(warehouseId),
      'quantity': serializer.toJson<double>(quantity),
      'available': serializer.toJson<double>(available),
      'syncedAt': serializer.toJson<DateTime>(syncedAt),
    };
  }

  InventoryCacheData copyWith({
    String? productId,
    String? warehouseId,
    double? quantity,
    double? available,
    DateTime? syncedAt,
  }) => InventoryCacheData(
    productId: productId ?? this.productId,
    warehouseId: warehouseId ?? this.warehouseId,
    quantity: quantity ?? this.quantity,
    available: available ?? this.available,
    syncedAt: syncedAt ?? this.syncedAt,
  );
  InventoryCacheData copyWithCompanion(InventoryCacheCompanion data) {
    return InventoryCacheData(
      productId: data.productId.present ? data.productId.value : this.productId,
      warehouseId: data.warehouseId.present
          ? data.warehouseId.value
          : this.warehouseId,
      quantity: data.quantity.present ? data.quantity.value : this.quantity,
      available: data.available.present ? data.available.value : this.available,
      syncedAt: data.syncedAt.present ? data.syncedAt.value : this.syncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('InventoryCacheData(')
          ..write('productId: $productId, ')
          ..write('warehouseId: $warehouseId, ')
          ..write('quantity: $quantity, ')
          ..write('available: $available, ')
          ..write('syncedAt: $syncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(productId, warehouseId, quantity, available, syncedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is InventoryCacheData &&
          other.productId == this.productId &&
          other.warehouseId == this.warehouseId &&
          other.quantity == this.quantity &&
          other.available == this.available &&
          other.syncedAt == this.syncedAt);
}

class InventoryCacheCompanion extends UpdateCompanion<InventoryCacheData> {
  final Value<String> productId;
  final Value<String> warehouseId;
  final Value<double> quantity;
  final Value<double> available;
  final Value<DateTime> syncedAt;
  final Value<int> rowid;
  const InventoryCacheCompanion({
    this.productId = const Value.absent(),
    this.warehouseId = const Value.absent(),
    this.quantity = const Value.absent(),
    this.available = const Value.absent(),
    this.syncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  InventoryCacheCompanion.insert({
    required String productId,
    required String warehouseId,
    this.quantity = const Value.absent(),
    this.available = const Value.absent(),
    required DateTime syncedAt,
    this.rowid = const Value.absent(),
  }) : productId = Value(productId),
       warehouseId = Value(warehouseId),
       syncedAt = Value(syncedAt);
  static Insertable<InventoryCacheData> custom({
    Expression<String>? productId,
    Expression<String>? warehouseId,
    Expression<double>? quantity,
    Expression<double>? available,
    Expression<DateTime>? syncedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (productId != null) 'product_id': productId,
      if (warehouseId != null) 'warehouse_id': warehouseId,
      if (quantity != null) 'quantity': quantity,
      if (available != null) 'available': available,
      if (syncedAt != null) 'synced_at': syncedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  InventoryCacheCompanion copyWith({
    Value<String>? productId,
    Value<String>? warehouseId,
    Value<double>? quantity,
    Value<double>? available,
    Value<DateTime>? syncedAt,
    Value<int>? rowid,
  }) {
    return InventoryCacheCompanion(
      productId: productId ?? this.productId,
      warehouseId: warehouseId ?? this.warehouseId,
      quantity: quantity ?? this.quantity,
      available: available ?? this.available,
      syncedAt: syncedAt ?? this.syncedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (productId.present) {
      map['product_id'] = Variable<String>(productId.value);
    }
    if (warehouseId.present) {
      map['warehouse_id'] = Variable<String>(warehouseId.value);
    }
    if (quantity.present) {
      map['quantity'] = Variable<double>(quantity.value);
    }
    if (available.present) {
      map['available'] = Variable<double>(available.value);
    }
    if (syncedAt.present) {
      map['synced_at'] = Variable<DateTime>(syncedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('InventoryCacheCompanion(')
          ..write('productId: $productId, ')
          ..write('warehouseId: $warehouseId, ')
          ..write('quantity: $quantity, ')
          ..write('available: $available, ')
          ..write('syncedAt: $syncedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $LocalPurchasesTable extends LocalPurchases
    with TableInfo<$LocalPurchasesTable, LocalPurchase> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $LocalPurchasesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _clientTransactionIdMeta =
      const VerificationMeta('clientTransactionId');
  @override
  late final GeneratedColumn<String> clientTransactionId =
      GeneratedColumn<String>(
        'client_transaction_id',
        aliasedName,
        false,
        type: DriftSqlType.string,
        requiredDuringInsert: true,
      );
  static const VerificationMeta _supplierIdMeta = const VerificationMeta(
    'supplierId',
  );
  @override
  late final GeneratedColumn<String> supplierId = GeneratedColumn<String>(
    'supplier_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _walkInNameMeta = const VerificationMeta(
    'walkInName',
  );
  @override
  late final GeneratedColumn<String> walkInName = GeneratedColumn<String>(
    'walk_in_name',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _paymentMethodMeta = const VerificationMeta(
    'paymentMethod',
  );
  @override
  late final GeneratedColumn<String> paymentMethod = GeneratedColumn<String>(
    'payment_method',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _paidAmountMeta = const VerificationMeta(
    'paidAmount',
  );
  @override
  late final GeneratedColumn<double> paidAmount = GeneratedColumn<double>(
    'paid_amount',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _sourceModeMeta = const VerificationMeta(
    'sourceMode',
  );
  @override
  late final GeneratedColumn<String> sourceMode = GeneratedColumn<String>(
    'source_mode',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('OFFLINE'),
  );
  static const VerificationMeta _syncStatusMeta = const VerificationMeta(
    'syncStatus',
  );
  @override
  late final GeneratedColumn<String> syncStatus = GeneratedColumn<String>(
    'sync_status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('pending'),
  );
  static const VerificationMeta _syncAttemptsMeta = const VerificationMeta(
    'syncAttempts',
  );
  @override
  late final GeneratedColumn<int> syncAttempts = GeneratedColumn<int>(
    'sync_attempts',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _lastSyncErrorMeta = const VerificationMeta(
    'lastSyncError',
  );
  @override
  late final GeneratedColumn<String> lastSyncError = GeneratedColumn<String>(
    'last_sync_error',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _serverIdMeta = const VerificationMeta(
    'serverId',
  );
  @override
  late final GeneratedColumn<String> serverId = GeneratedColumn<String>(
    'server_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _orderNumberMeta = const VerificationMeta(
    'orderNumber',
  );
  @override
  late final GeneratedColumn<String> orderNumber = GeneratedColumn<String>(
    'order_number',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    clientTransactionId,
    supplierId,
    walkInName,
    paymentMethod,
    paidAmount,
    sourceMode,
    syncStatus,
    syncAttempts,
    lastSyncError,
    serverId,
    orderNumber,
    createdAt,
    updatedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'local_purchases';
  @override
  VerificationContext validateIntegrity(
    Insertable<LocalPurchase> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('client_transaction_id')) {
      context.handle(
        _clientTransactionIdMeta,
        clientTransactionId.isAcceptableOrUnknown(
          data['client_transaction_id']!,
          _clientTransactionIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_clientTransactionIdMeta);
    }
    if (data.containsKey('supplier_id')) {
      context.handle(
        _supplierIdMeta,
        supplierId.isAcceptableOrUnknown(data['supplier_id']!, _supplierIdMeta),
      );
    }
    if (data.containsKey('walk_in_name')) {
      context.handle(
        _walkInNameMeta,
        walkInName.isAcceptableOrUnknown(
          data['walk_in_name']!,
          _walkInNameMeta,
        ),
      );
    }
    if (data.containsKey('payment_method')) {
      context.handle(
        _paymentMethodMeta,
        paymentMethod.isAcceptableOrUnknown(
          data['payment_method']!,
          _paymentMethodMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_paymentMethodMeta);
    }
    if (data.containsKey('paid_amount')) {
      context.handle(
        _paidAmountMeta,
        paidAmount.isAcceptableOrUnknown(data['paid_amount']!, _paidAmountMeta),
      );
    }
    if (data.containsKey('source_mode')) {
      context.handle(
        _sourceModeMeta,
        sourceMode.isAcceptableOrUnknown(data['source_mode']!, _sourceModeMeta),
      );
    }
    if (data.containsKey('sync_status')) {
      context.handle(
        _syncStatusMeta,
        syncStatus.isAcceptableOrUnknown(data['sync_status']!, _syncStatusMeta),
      );
    }
    if (data.containsKey('sync_attempts')) {
      context.handle(
        _syncAttemptsMeta,
        syncAttempts.isAcceptableOrUnknown(
          data['sync_attempts']!,
          _syncAttemptsMeta,
        ),
      );
    }
    if (data.containsKey('last_sync_error')) {
      context.handle(
        _lastSyncErrorMeta,
        lastSyncError.isAcceptableOrUnknown(
          data['last_sync_error']!,
          _lastSyncErrorMeta,
        ),
      );
    }
    if (data.containsKey('server_id')) {
      context.handle(
        _serverIdMeta,
        serverId.isAcceptableOrUnknown(data['server_id']!, _serverIdMeta),
      );
    }
    if (data.containsKey('order_number')) {
      context.handle(
        _orderNumberMeta,
        orderNumber.isAcceptableOrUnknown(
          data['order_number']!,
          _orderNumberMeta,
        ),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {clientTransactionId};
  @override
  LocalPurchase map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return LocalPurchase(
      clientTransactionId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}client_transaction_id'],
      )!,
      supplierId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}supplier_id'],
      ),
      walkInName: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}walk_in_name'],
      ),
      paymentMethod: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payment_method'],
      )!,
      paidAmount: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}paid_amount'],
      )!,
      sourceMode: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}source_mode'],
      )!,
      syncStatus: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}sync_status'],
      )!,
      syncAttempts: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}sync_attempts'],
      )!,
      lastSyncError: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}last_sync_error'],
      ),
      serverId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}server_id'],
      ),
      orderNumber: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}order_number'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}created_at'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}updated_at'],
      )!,
    );
  }

  @override
  $LocalPurchasesTable createAlias(String alias) {
    return $LocalPurchasesTable(attachedDatabase, alias);
  }
}

class LocalPurchase extends DataClass implements Insertable<LocalPurchase> {
  final String clientTransactionId;
  final String? supplierId;
  final String? walkInName;
  final String paymentMethod;
  final double paidAmount;
  final String sourceMode;
  final String syncStatus;
  final int syncAttempts;
  final String? lastSyncError;
  final String? serverId;
  final String? orderNumber;
  final DateTime createdAt;
  final DateTime updatedAt;
  const LocalPurchase({
    required this.clientTransactionId,
    this.supplierId,
    this.walkInName,
    required this.paymentMethod,
    required this.paidAmount,
    required this.sourceMode,
    required this.syncStatus,
    required this.syncAttempts,
    this.lastSyncError,
    this.serverId,
    this.orderNumber,
    required this.createdAt,
    required this.updatedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['client_transaction_id'] = Variable<String>(clientTransactionId);
    if (!nullToAbsent || supplierId != null) {
      map['supplier_id'] = Variable<String>(supplierId);
    }
    if (!nullToAbsent || walkInName != null) {
      map['walk_in_name'] = Variable<String>(walkInName);
    }
    map['payment_method'] = Variable<String>(paymentMethod);
    map['paid_amount'] = Variable<double>(paidAmount);
    map['source_mode'] = Variable<String>(sourceMode);
    map['sync_status'] = Variable<String>(syncStatus);
    map['sync_attempts'] = Variable<int>(syncAttempts);
    if (!nullToAbsent || lastSyncError != null) {
      map['last_sync_error'] = Variable<String>(lastSyncError);
    }
    if (!nullToAbsent || serverId != null) {
      map['server_id'] = Variable<String>(serverId);
    }
    if (!nullToAbsent || orderNumber != null) {
      map['order_number'] = Variable<String>(orderNumber);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  LocalPurchasesCompanion toCompanion(bool nullToAbsent) {
    return LocalPurchasesCompanion(
      clientTransactionId: Value(clientTransactionId),
      supplierId: supplierId == null && nullToAbsent
          ? const Value.absent()
          : Value(supplierId),
      walkInName: walkInName == null && nullToAbsent
          ? const Value.absent()
          : Value(walkInName),
      paymentMethod: Value(paymentMethod),
      paidAmount: Value(paidAmount),
      sourceMode: Value(sourceMode),
      syncStatus: Value(syncStatus),
      syncAttempts: Value(syncAttempts),
      lastSyncError: lastSyncError == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncError),
      serverId: serverId == null && nullToAbsent
          ? const Value.absent()
          : Value(serverId),
      orderNumber: orderNumber == null && nullToAbsent
          ? const Value.absent()
          : Value(orderNumber),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory LocalPurchase.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return LocalPurchase(
      clientTransactionId: serializer.fromJson<String>(
        json['clientTransactionId'],
      ),
      supplierId: serializer.fromJson<String?>(json['supplierId']),
      walkInName: serializer.fromJson<String?>(json['walkInName']),
      paymentMethod: serializer.fromJson<String>(json['paymentMethod']),
      paidAmount: serializer.fromJson<double>(json['paidAmount']),
      sourceMode: serializer.fromJson<String>(json['sourceMode']),
      syncStatus: serializer.fromJson<String>(json['syncStatus']),
      syncAttempts: serializer.fromJson<int>(json['syncAttempts']),
      lastSyncError: serializer.fromJson<String?>(json['lastSyncError']),
      serverId: serializer.fromJson<String?>(json['serverId']),
      orderNumber: serializer.fromJson<String?>(json['orderNumber']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'clientTransactionId': serializer.toJson<String>(clientTransactionId),
      'supplierId': serializer.toJson<String?>(supplierId),
      'walkInName': serializer.toJson<String?>(walkInName),
      'paymentMethod': serializer.toJson<String>(paymentMethod),
      'paidAmount': serializer.toJson<double>(paidAmount),
      'sourceMode': serializer.toJson<String>(sourceMode),
      'syncStatus': serializer.toJson<String>(syncStatus),
      'syncAttempts': serializer.toJson<int>(syncAttempts),
      'lastSyncError': serializer.toJson<String?>(lastSyncError),
      'serverId': serializer.toJson<String?>(serverId),
      'orderNumber': serializer.toJson<String?>(orderNumber),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  LocalPurchase copyWith({
    String? clientTransactionId,
    Value<String?> supplierId = const Value.absent(),
    Value<String?> walkInName = const Value.absent(),
    String? paymentMethod,
    double? paidAmount,
    String? sourceMode,
    String? syncStatus,
    int? syncAttempts,
    Value<String?> lastSyncError = const Value.absent(),
    Value<String?> serverId = const Value.absent(),
    Value<String?> orderNumber = const Value.absent(),
    DateTime? createdAt,
    DateTime? updatedAt,
  }) => LocalPurchase(
    clientTransactionId: clientTransactionId ?? this.clientTransactionId,
    supplierId: supplierId.present ? supplierId.value : this.supplierId,
    walkInName: walkInName.present ? walkInName.value : this.walkInName,
    paymentMethod: paymentMethod ?? this.paymentMethod,
    paidAmount: paidAmount ?? this.paidAmount,
    sourceMode: sourceMode ?? this.sourceMode,
    syncStatus: syncStatus ?? this.syncStatus,
    syncAttempts: syncAttempts ?? this.syncAttempts,
    lastSyncError: lastSyncError.present
        ? lastSyncError.value
        : this.lastSyncError,
    serverId: serverId.present ? serverId.value : this.serverId,
    orderNumber: orderNumber.present ? orderNumber.value : this.orderNumber,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
  );
  LocalPurchase copyWithCompanion(LocalPurchasesCompanion data) {
    return LocalPurchase(
      clientTransactionId: data.clientTransactionId.present
          ? data.clientTransactionId.value
          : this.clientTransactionId,
      supplierId: data.supplierId.present
          ? data.supplierId.value
          : this.supplierId,
      walkInName: data.walkInName.present
          ? data.walkInName.value
          : this.walkInName,
      paymentMethod: data.paymentMethod.present
          ? data.paymentMethod.value
          : this.paymentMethod,
      paidAmount: data.paidAmount.present
          ? data.paidAmount.value
          : this.paidAmount,
      sourceMode: data.sourceMode.present
          ? data.sourceMode.value
          : this.sourceMode,
      syncStatus: data.syncStatus.present
          ? data.syncStatus.value
          : this.syncStatus,
      syncAttempts: data.syncAttempts.present
          ? data.syncAttempts.value
          : this.syncAttempts,
      lastSyncError: data.lastSyncError.present
          ? data.lastSyncError.value
          : this.lastSyncError,
      serverId: data.serverId.present ? data.serverId.value : this.serverId,
      orderNumber: data.orderNumber.present
          ? data.orderNumber.value
          : this.orderNumber,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('LocalPurchase(')
          ..write('clientTransactionId: $clientTransactionId, ')
          ..write('supplierId: $supplierId, ')
          ..write('walkInName: $walkInName, ')
          ..write('paymentMethod: $paymentMethod, ')
          ..write('paidAmount: $paidAmount, ')
          ..write('sourceMode: $sourceMode, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('syncAttempts: $syncAttempts, ')
          ..write('lastSyncError: $lastSyncError, ')
          ..write('serverId: $serverId, ')
          ..write('orderNumber: $orderNumber, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    clientTransactionId,
    supplierId,
    walkInName,
    paymentMethod,
    paidAmount,
    sourceMode,
    syncStatus,
    syncAttempts,
    lastSyncError,
    serverId,
    orderNumber,
    createdAt,
    updatedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is LocalPurchase &&
          other.clientTransactionId == this.clientTransactionId &&
          other.supplierId == this.supplierId &&
          other.walkInName == this.walkInName &&
          other.paymentMethod == this.paymentMethod &&
          other.paidAmount == this.paidAmount &&
          other.sourceMode == this.sourceMode &&
          other.syncStatus == this.syncStatus &&
          other.syncAttempts == this.syncAttempts &&
          other.lastSyncError == this.lastSyncError &&
          other.serverId == this.serverId &&
          other.orderNumber == this.orderNumber &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class LocalPurchasesCompanion extends UpdateCompanion<LocalPurchase> {
  final Value<String> clientTransactionId;
  final Value<String?> supplierId;
  final Value<String?> walkInName;
  final Value<String> paymentMethod;
  final Value<double> paidAmount;
  final Value<String> sourceMode;
  final Value<String> syncStatus;
  final Value<int> syncAttempts;
  final Value<String?> lastSyncError;
  final Value<String?> serverId;
  final Value<String?> orderNumber;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  final Value<int> rowid;
  const LocalPurchasesCompanion({
    this.clientTransactionId = const Value.absent(),
    this.supplierId = const Value.absent(),
    this.walkInName = const Value.absent(),
    this.paymentMethod = const Value.absent(),
    this.paidAmount = const Value.absent(),
    this.sourceMode = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.syncAttempts = const Value.absent(),
    this.lastSyncError = const Value.absent(),
    this.serverId = const Value.absent(),
    this.orderNumber = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  LocalPurchasesCompanion.insert({
    required String clientTransactionId,
    this.supplierId = const Value.absent(),
    this.walkInName = const Value.absent(),
    required String paymentMethod,
    this.paidAmount = const Value.absent(),
    this.sourceMode = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.syncAttempts = const Value.absent(),
    this.lastSyncError = const Value.absent(),
    this.serverId = const Value.absent(),
    this.orderNumber = const Value.absent(),
    required DateTime createdAt,
    required DateTime updatedAt,
    this.rowid = const Value.absent(),
  }) : clientTransactionId = Value(clientTransactionId),
       paymentMethod = Value(paymentMethod),
       createdAt = Value(createdAt),
       updatedAt = Value(updatedAt);
  static Insertable<LocalPurchase> custom({
    Expression<String>? clientTransactionId,
    Expression<String>? supplierId,
    Expression<String>? walkInName,
    Expression<String>? paymentMethod,
    Expression<double>? paidAmount,
    Expression<String>? sourceMode,
    Expression<String>? syncStatus,
    Expression<int>? syncAttempts,
    Expression<String>? lastSyncError,
    Expression<String>? serverId,
    Expression<String>? orderNumber,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (clientTransactionId != null)
        'client_transaction_id': clientTransactionId,
      if (supplierId != null) 'supplier_id': supplierId,
      if (walkInName != null) 'walk_in_name': walkInName,
      if (paymentMethod != null) 'payment_method': paymentMethod,
      if (paidAmount != null) 'paid_amount': paidAmount,
      if (sourceMode != null) 'source_mode': sourceMode,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (syncAttempts != null) 'sync_attempts': syncAttempts,
      if (lastSyncError != null) 'last_sync_error': lastSyncError,
      if (serverId != null) 'server_id': serverId,
      if (orderNumber != null) 'order_number': orderNumber,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  LocalPurchasesCompanion copyWith({
    Value<String>? clientTransactionId,
    Value<String?>? supplierId,
    Value<String?>? walkInName,
    Value<String>? paymentMethod,
    Value<double>? paidAmount,
    Value<String>? sourceMode,
    Value<String>? syncStatus,
    Value<int>? syncAttempts,
    Value<String?>? lastSyncError,
    Value<String?>? serverId,
    Value<String?>? orderNumber,
    Value<DateTime>? createdAt,
    Value<DateTime>? updatedAt,
    Value<int>? rowid,
  }) {
    return LocalPurchasesCompanion(
      clientTransactionId: clientTransactionId ?? this.clientTransactionId,
      supplierId: supplierId ?? this.supplierId,
      walkInName: walkInName ?? this.walkInName,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      paidAmount: paidAmount ?? this.paidAmount,
      sourceMode: sourceMode ?? this.sourceMode,
      syncStatus: syncStatus ?? this.syncStatus,
      syncAttempts: syncAttempts ?? this.syncAttempts,
      lastSyncError: lastSyncError ?? this.lastSyncError,
      serverId: serverId ?? this.serverId,
      orderNumber: orderNumber ?? this.orderNumber,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (clientTransactionId.present) {
      map['client_transaction_id'] = Variable<String>(
        clientTransactionId.value,
      );
    }
    if (supplierId.present) {
      map['supplier_id'] = Variable<String>(supplierId.value);
    }
    if (walkInName.present) {
      map['walk_in_name'] = Variable<String>(walkInName.value);
    }
    if (paymentMethod.present) {
      map['payment_method'] = Variable<String>(paymentMethod.value);
    }
    if (paidAmount.present) {
      map['paid_amount'] = Variable<double>(paidAmount.value);
    }
    if (sourceMode.present) {
      map['source_mode'] = Variable<String>(sourceMode.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<String>(syncStatus.value);
    }
    if (syncAttempts.present) {
      map['sync_attempts'] = Variable<int>(syncAttempts.value);
    }
    if (lastSyncError.present) {
      map['last_sync_error'] = Variable<String>(lastSyncError.value);
    }
    if (serverId.present) {
      map['server_id'] = Variable<String>(serverId.value);
    }
    if (orderNumber.present) {
      map['order_number'] = Variable<String>(orderNumber.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('LocalPurchasesCompanion(')
          ..write('clientTransactionId: $clientTransactionId, ')
          ..write('supplierId: $supplierId, ')
          ..write('walkInName: $walkInName, ')
          ..write('paymentMethod: $paymentMethod, ')
          ..write('paidAmount: $paidAmount, ')
          ..write('sourceMode: $sourceMode, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('syncAttempts: $syncAttempts, ')
          ..write('lastSyncError: $lastSyncError, ')
          ..write('serverId: $serverId, ')
          ..write('orderNumber: $orderNumber, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $LocalPurchaseItemsTable extends LocalPurchaseItems
    with TableInfo<$LocalPurchaseItemsTable, LocalPurchaseItem> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $LocalPurchaseItemsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _clientTransactionIdMeta =
      const VerificationMeta('clientTransactionId');
  @override
  late final GeneratedColumn<String> clientTransactionId =
      GeneratedColumn<String>(
        'client_transaction_id',
        aliasedName,
        false,
        type: DriftSqlType.string,
        requiredDuringInsert: true,
        defaultConstraints: GeneratedColumn.constraintIsAlways(
          'REFERENCES local_purchases (client_transaction_id)',
        ),
      );
  static const VerificationMeta _productIdMeta = const VerificationMeta(
    'productId',
  );
  @override
  late final GeneratedColumn<String> productId = GeneratedColumn<String>(
    'product_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _productNameMeta = const VerificationMeta(
    'productName',
  );
  @override
  late final GeneratedColumn<String> productName = GeneratedColumn<String>(
    'product_name',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _quantityMeta = const VerificationMeta(
    'quantity',
  );
  @override
  late final GeneratedColumn<double> quantity = GeneratedColumn<double>(
    'quantity',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _unitPriceMeta = const VerificationMeta(
    'unitPrice',
  );
  @override
  late final GeneratedColumn<double> unitPrice = GeneratedColumn<double>(
    'unit_price',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    clientTransactionId,
    productId,
    productName,
    quantity,
    unitPrice,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'local_purchase_items';
  @override
  VerificationContext validateIntegrity(
    Insertable<LocalPurchaseItem> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('client_transaction_id')) {
      context.handle(
        _clientTransactionIdMeta,
        clientTransactionId.isAcceptableOrUnknown(
          data['client_transaction_id']!,
          _clientTransactionIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_clientTransactionIdMeta);
    }
    if (data.containsKey('product_id')) {
      context.handle(
        _productIdMeta,
        productId.isAcceptableOrUnknown(data['product_id']!, _productIdMeta),
      );
    } else if (isInserting) {
      context.missing(_productIdMeta);
    }
    if (data.containsKey('product_name')) {
      context.handle(
        _productNameMeta,
        productName.isAcceptableOrUnknown(
          data['product_name']!,
          _productNameMeta,
        ),
      );
    }
    if (data.containsKey('quantity')) {
      context.handle(
        _quantityMeta,
        quantity.isAcceptableOrUnknown(data['quantity']!, _quantityMeta),
      );
    } else if (isInserting) {
      context.missing(_quantityMeta);
    }
    if (data.containsKey('unit_price')) {
      context.handle(
        _unitPriceMeta,
        unitPrice.isAcceptableOrUnknown(data['unit_price']!, _unitPriceMeta),
      );
    } else if (isInserting) {
      context.missing(_unitPriceMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  LocalPurchaseItem map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return LocalPurchaseItem(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      clientTransactionId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}client_transaction_id'],
      )!,
      productId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}product_id'],
      )!,
      productName: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}product_name'],
      ),
      quantity: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}quantity'],
      )!,
      unitPrice: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}unit_price'],
      )!,
    );
  }

  @override
  $LocalPurchaseItemsTable createAlias(String alias) {
    return $LocalPurchaseItemsTable(attachedDatabase, alias);
  }
}

class LocalPurchaseItem extends DataClass
    implements Insertable<LocalPurchaseItem> {
  final int id;
  final String clientTransactionId;
  final String productId;
  final String? productName;
  final double quantity;
  final double unitPrice;
  const LocalPurchaseItem({
    required this.id,
    required this.clientTransactionId,
    required this.productId,
    this.productName,
    required this.quantity,
    required this.unitPrice,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['client_transaction_id'] = Variable<String>(clientTransactionId);
    map['product_id'] = Variable<String>(productId);
    if (!nullToAbsent || productName != null) {
      map['product_name'] = Variable<String>(productName);
    }
    map['quantity'] = Variable<double>(quantity);
    map['unit_price'] = Variable<double>(unitPrice);
    return map;
  }

  LocalPurchaseItemsCompanion toCompanion(bool nullToAbsent) {
    return LocalPurchaseItemsCompanion(
      id: Value(id),
      clientTransactionId: Value(clientTransactionId),
      productId: Value(productId),
      productName: productName == null && nullToAbsent
          ? const Value.absent()
          : Value(productName),
      quantity: Value(quantity),
      unitPrice: Value(unitPrice),
    );
  }

  factory LocalPurchaseItem.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return LocalPurchaseItem(
      id: serializer.fromJson<int>(json['id']),
      clientTransactionId: serializer.fromJson<String>(
        json['clientTransactionId'],
      ),
      productId: serializer.fromJson<String>(json['productId']),
      productName: serializer.fromJson<String?>(json['productName']),
      quantity: serializer.fromJson<double>(json['quantity']),
      unitPrice: serializer.fromJson<double>(json['unitPrice']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'clientTransactionId': serializer.toJson<String>(clientTransactionId),
      'productId': serializer.toJson<String>(productId),
      'productName': serializer.toJson<String?>(productName),
      'quantity': serializer.toJson<double>(quantity),
      'unitPrice': serializer.toJson<double>(unitPrice),
    };
  }

  LocalPurchaseItem copyWith({
    int? id,
    String? clientTransactionId,
    String? productId,
    Value<String?> productName = const Value.absent(),
    double? quantity,
    double? unitPrice,
  }) => LocalPurchaseItem(
    id: id ?? this.id,
    clientTransactionId: clientTransactionId ?? this.clientTransactionId,
    productId: productId ?? this.productId,
    productName: productName.present ? productName.value : this.productName,
    quantity: quantity ?? this.quantity,
    unitPrice: unitPrice ?? this.unitPrice,
  );
  LocalPurchaseItem copyWithCompanion(LocalPurchaseItemsCompanion data) {
    return LocalPurchaseItem(
      id: data.id.present ? data.id.value : this.id,
      clientTransactionId: data.clientTransactionId.present
          ? data.clientTransactionId.value
          : this.clientTransactionId,
      productId: data.productId.present ? data.productId.value : this.productId,
      productName: data.productName.present
          ? data.productName.value
          : this.productName,
      quantity: data.quantity.present ? data.quantity.value : this.quantity,
      unitPrice: data.unitPrice.present ? data.unitPrice.value : this.unitPrice,
    );
  }

  @override
  String toString() {
    return (StringBuffer('LocalPurchaseItem(')
          ..write('id: $id, ')
          ..write('clientTransactionId: $clientTransactionId, ')
          ..write('productId: $productId, ')
          ..write('productName: $productName, ')
          ..write('quantity: $quantity, ')
          ..write('unitPrice: $unitPrice')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    clientTransactionId,
    productId,
    productName,
    quantity,
    unitPrice,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is LocalPurchaseItem &&
          other.id == this.id &&
          other.clientTransactionId == this.clientTransactionId &&
          other.productId == this.productId &&
          other.productName == this.productName &&
          other.quantity == this.quantity &&
          other.unitPrice == this.unitPrice);
}

class LocalPurchaseItemsCompanion extends UpdateCompanion<LocalPurchaseItem> {
  final Value<int> id;
  final Value<String> clientTransactionId;
  final Value<String> productId;
  final Value<String?> productName;
  final Value<double> quantity;
  final Value<double> unitPrice;
  const LocalPurchaseItemsCompanion({
    this.id = const Value.absent(),
    this.clientTransactionId = const Value.absent(),
    this.productId = const Value.absent(),
    this.productName = const Value.absent(),
    this.quantity = const Value.absent(),
    this.unitPrice = const Value.absent(),
  });
  LocalPurchaseItemsCompanion.insert({
    this.id = const Value.absent(),
    required String clientTransactionId,
    required String productId,
    this.productName = const Value.absent(),
    required double quantity,
    required double unitPrice,
  }) : clientTransactionId = Value(clientTransactionId),
       productId = Value(productId),
       quantity = Value(quantity),
       unitPrice = Value(unitPrice);
  static Insertable<LocalPurchaseItem> custom({
    Expression<int>? id,
    Expression<String>? clientTransactionId,
    Expression<String>? productId,
    Expression<String>? productName,
    Expression<double>? quantity,
    Expression<double>? unitPrice,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (clientTransactionId != null)
        'client_transaction_id': clientTransactionId,
      if (productId != null) 'product_id': productId,
      if (productName != null) 'product_name': productName,
      if (quantity != null) 'quantity': quantity,
      if (unitPrice != null) 'unit_price': unitPrice,
    });
  }

  LocalPurchaseItemsCompanion copyWith({
    Value<int>? id,
    Value<String>? clientTransactionId,
    Value<String>? productId,
    Value<String?>? productName,
    Value<double>? quantity,
    Value<double>? unitPrice,
  }) {
    return LocalPurchaseItemsCompanion(
      id: id ?? this.id,
      clientTransactionId: clientTransactionId ?? this.clientTransactionId,
      productId: productId ?? this.productId,
      productName: productName ?? this.productName,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice ?? this.unitPrice,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (clientTransactionId.present) {
      map['client_transaction_id'] = Variable<String>(
        clientTransactionId.value,
      );
    }
    if (productId.present) {
      map['product_id'] = Variable<String>(productId.value);
    }
    if (productName.present) {
      map['product_name'] = Variable<String>(productName.value);
    }
    if (quantity.present) {
      map['quantity'] = Variable<double>(quantity.value);
    }
    if (unitPrice.present) {
      map['unit_price'] = Variable<double>(unitPrice.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('LocalPurchaseItemsCompanion(')
          ..write('id: $id, ')
          ..write('clientTransactionId: $clientTransactionId, ')
          ..write('productId: $productId, ')
          ..write('productName: $productName, ')
          ..write('quantity: $quantity, ')
          ..write('unitPrice: $unitPrice')
          ..write(')'))
        .toString();
  }
}

class $LocalSalesTable extends LocalSales
    with TableInfo<$LocalSalesTable, LocalSale> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $LocalSalesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _clientTransactionIdMeta =
      const VerificationMeta('clientTransactionId');
  @override
  late final GeneratedColumn<String> clientTransactionId =
      GeneratedColumn<String>(
        'client_transaction_id',
        aliasedName,
        false,
        type: DriftSqlType.string,
        requiredDuringInsert: true,
      );
  static const VerificationMeta _warehouseIdMeta = const VerificationMeta(
    'warehouseId',
  );
  @override
  late final GeneratedColumn<String> warehouseId = GeneratedColumn<String>(
    'warehouse_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _warehouseNameMeta = const VerificationMeta(
    'warehouseName',
  );
  @override
  late final GeneratedColumn<String> warehouseName = GeneratedColumn<String>(
    'warehouse_name',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _customerIdMeta = const VerificationMeta(
    'customerId',
  );
  @override
  late final GeneratedColumn<String> customerId = GeneratedColumn<String>(
    'customer_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _customerNameMeta = const VerificationMeta(
    'customerName',
  );
  @override
  late final GeneratedColumn<String> customerName = GeneratedColumn<String>(
    'customer_name',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _paymentMethodMeta = const VerificationMeta(
    'paymentMethod',
  );
  @override
  late final GeneratedColumn<String> paymentMethod = GeneratedColumn<String>(
    'payment_method',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _paidAmountMeta = const VerificationMeta(
    'paidAmount',
  );
  @override
  late final GeneratedColumn<double> paidAmount = GeneratedColumn<double>(
    'paid_amount',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _sourceModeMeta = const VerificationMeta(
    'sourceMode',
  );
  @override
  late final GeneratedColumn<String> sourceMode = GeneratedColumn<String>(
    'source_mode',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('OFFLINE'),
  );
  static const VerificationMeta _syncStatusMeta = const VerificationMeta(
    'syncStatus',
  );
  @override
  late final GeneratedColumn<String> syncStatus = GeneratedColumn<String>(
    'sync_status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('pending'),
  );
  static const VerificationMeta _syncAttemptsMeta = const VerificationMeta(
    'syncAttempts',
  );
  @override
  late final GeneratedColumn<int> syncAttempts = GeneratedColumn<int>(
    'sync_attempts',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _lastSyncErrorMeta = const VerificationMeta(
    'lastSyncError',
  );
  @override
  late final GeneratedColumn<String> lastSyncError = GeneratedColumn<String>(
    'last_sync_error',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _serverIdMeta = const VerificationMeta(
    'serverId',
  );
  @override
  late final GeneratedColumn<String> serverId = GeneratedColumn<String>(
    'server_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _invoiceNumberMeta = const VerificationMeta(
    'invoiceNumber',
  );
  @override
  late final GeneratedColumn<String> invoiceNumber = GeneratedColumn<String>(
    'invoice_number',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    clientTransactionId,
    warehouseId,
    warehouseName,
    customerId,
    customerName,
    paymentMethod,
    paidAmount,
    sourceMode,
    syncStatus,
    syncAttempts,
    lastSyncError,
    serverId,
    invoiceNumber,
    createdAt,
    updatedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'local_sales';
  @override
  VerificationContext validateIntegrity(
    Insertable<LocalSale> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('client_transaction_id')) {
      context.handle(
        _clientTransactionIdMeta,
        clientTransactionId.isAcceptableOrUnknown(
          data['client_transaction_id']!,
          _clientTransactionIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_clientTransactionIdMeta);
    }
    if (data.containsKey('warehouse_id')) {
      context.handle(
        _warehouseIdMeta,
        warehouseId.isAcceptableOrUnknown(
          data['warehouse_id']!,
          _warehouseIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_warehouseIdMeta);
    }
    if (data.containsKey('warehouse_name')) {
      context.handle(
        _warehouseNameMeta,
        warehouseName.isAcceptableOrUnknown(
          data['warehouse_name']!,
          _warehouseNameMeta,
        ),
      );
    }
    if (data.containsKey('customer_id')) {
      context.handle(
        _customerIdMeta,
        customerId.isAcceptableOrUnknown(data['customer_id']!, _customerIdMeta),
      );
    }
    if (data.containsKey('customer_name')) {
      context.handle(
        _customerNameMeta,
        customerName.isAcceptableOrUnknown(
          data['customer_name']!,
          _customerNameMeta,
        ),
      );
    }
    if (data.containsKey('payment_method')) {
      context.handle(
        _paymentMethodMeta,
        paymentMethod.isAcceptableOrUnknown(
          data['payment_method']!,
          _paymentMethodMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_paymentMethodMeta);
    }
    if (data.containsKey('paid_amount')) {
      context.handle(
        _paidAmountMeta,
        paidAmount.isAcceptableOrUnknown(data['paid_amount']!, _paidAmountMeta),
      );
    }
    if (data.containsKey('source_mode')) {
      context.handle(
        _sourceModeMeta,
        sourceMode.isAcceptableOrUnknown(data['source_mode']!, _sourceModeMeta),
      );
    }
    if (data.containsKey('sync_status')) {
      context.handle(
        _syncStatusMeta,
        syncStatus.isAcceptableOrUnknown(data['sync_status']!, _syncStatusMeta),
      );
    }
    if (data.containsKey('sync_attempts')) {
      context.handle(
        _syncAttemptsMeta,
        syncAttempts.isAcceptableOrUnknown(
          data['sync_attempts']!,
          _syncAttemptsMeta,
        ),
      );
    }
    if (data.containsKey('last_sync_error')) {
      context.handle(
        _lastSyncErrorMeta,
        lastSyncError.isAcceptableOrUnknown(
          data['last_sync_error']!,
          _lastSyncErrorMeta,
        ),
      );
    }
    if (data.containsKey('server_id')) {
      context.handle(
        _serverIdMeta,
        serverId.isAcceptableOrUnknown(data['server_id']!, _serverIdMeta),
      );
    }
    if (data.containsKey('invoice_number')) {
      context.handle(
        _invoiceNumberMeta,
        invoiceNumber.isAcceptableOrUnknown(
          data['invoice_number']!,
          _invoiceNumberMeta,
        ),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {clientTransactionId};
  @override
  LocalSale map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return LocalSale(
      clientTransactionId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}client_transaction_id'],
      )!,
      warehouseId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}warehouse_id'],
      )!,
      warehouseName: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}warehouse_name'],
      ),
      customerId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}customer_id'],
      ),
      customerName: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}customer_name'],
      ),
      paymentMethod: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payment_method'],
      )!,
      paidAmount: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}paid_amount'],
      )!,
      sourceMode: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}source_mode'],
      )!,
      syncStatus: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}sync_status'],
      )!,
      syncAttempts: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}sync_attempts'],
      )!,
      lastSyncError: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}last_sync_error'],
      ),
      serverId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}server_id'],
      ),
      invoiceNumber: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}invoice_number'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}created_at'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}updated_at'],
      )!,
    );
  }

  @override
  $LocalSalesTable createAlias(String alias) {
    return $LocalSalesTable(attachedDatabase, alias);
  }
}

class LocalSale extends DataClass implements Insertable<LocalSale> {
  final String clientTransactionId;
  final String warehouseId;
  final String? warehouseName;
  final String? customerId;
  final String? customerName;
  final String paymentMethod;
  final double paidAmount;
  final String sourceMode;
  final String syncStatus;
  final int syncAttempts;
  final String? lastSyncError;
  final String? serverId;
  final String? invoiceNumber;
  final DateTime createdAt;
  final DateTime updatedAt;
  const LocalSale({
    required this.clientTransactionId,
    required this.warehouseId,
    this.warehouseName,
    this.customerId,
    this.customerName,
    required this.paymentMethod,
    required this.paidAmount,
    required this.sourceMode,
    required this.syncStatus,
    required this.syncAttempts,
    this.lastSyncError,
    this.serverId,
    this.invoiceNumber,
    required this.createdAt,
    required this.updatedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['client_transaction_id'] = Variable<String>(clientTransactionId);
    map['warehouse_id'] = Variable<String>(warehouseId);
    if (!nullToAbsent || warehouseName != null) {
      map['warehouse_name'] = Variable<String>(warehouseName);
    }
    if (!nullToAbsent || customerId != null) {
      map['customer_id'] = Variable<String>(customerId);
    }
    if (!nullToAbsent || customerName != null) {
      map['customer_name'] = Variable<String>(customerName);
    }
    map['payment_method'] = Variable<String>(paymentMethod);
    map['paid_amount'] = Variable<double>(paidAmount);
    map['source_mode'] = Variable<String>(sourceMode);
    map['sync_status'] = Variable<String>(syncStatus);
    map['sync_attempts'] = Variable<int>(syncAttempts);
    if (!nullToAbsent || lastSyncError != null) {
      map['last_sync_error'] = Variable<String>(lastSyncError);
    }
    if (!nullToAbsent || serverId != null) {
      map['server_id'] = Variable<String>(serverId);
    }
    if (!nullToAbsent || invoiceNumber != null) {
      map['invoice_number'] = Variable<String>(invoiceNumber);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  LocalSalesCompanion toCompanion(bool nullToAbsent) {
    return LocalSalesCompanion(
      clientTransactionId: Value(clientTransactionId),
      warehouseId: Value(warehouseId),
      warehouseName: warehouseName == null && nullToAbsent
          ? const Value.absent()
          : Value(warehouseName),
      customerId: customerId == null && nullToAbsent
          ? const Value.absent()
          : Value(customerId),
      customerName: customerName == null && nullToAbsent
          ? const Value.absent()
          : Value(customerName),
      paymentMethod: Value(paymentMethod),
      paidAmount: Value(paidAmount),
      sourceMode: Value(sourceMode),
      syncStatus: Value(syncStatus),
      syncAttempts: Value(syncAttempts),
      lastSyncError: lastSyncError == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncError),
      serverId: serverId == null && nullToAbsent
          ? const Value.absent()
          : Value(serverId),
      invoiceNumber: invoiceNumber == null && nullToAbsent
          ? const Value.absent()
          : Value(invoiceNumber),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory LocalSale.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return LocalSale(
      clientTransactionId: serializer.fromJson<String>(
        json['clientTransactionId'],
      ),
      warehouseId: serializer.fromJson<String>(json['warehouseId']),
      warehouseName: serializer.fromJson<String?>(json['warehouseName']),
      customerId: serializer.fromJson<String?>(json['customerId']),
      customerName: serializer.fromJson<String?>(json['customerName']),
      paymentMethod: serializer.fromJson<String>(json['paymentMethod']),
      paidAmount: serializer.fromJson<double>(json['paidAmount']),
      sourceMode: serializer.fromJson<String>(json['sourceMode']),
      syncStatus: serializer.fromJson<String>(json['syncStatus']),
      syncAttempts: serializer.fromJson<int>(json['syncAttempts']),
      lastSyncError: serializer.fromJson<String?>(json['lastSyncError']),
      serverId: serializer.fromJson<String?>(json['serverId']),
      invoiceNumber: serializer.fromJson<String?>(json['invoiceNumber']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'clientTransactionId': serializer.toJson<String>(clientTransactionId),
      'warehouseId': serializer.toJson<String>(warehouseId),
      'warehouseName': serializer.toJson<String?>(warehouseName),
      'customerId': serializer.toJson<String?>(customerId),
      'customerName': serializer.toJson<String?>(customerName),
      'paymentMethod': serializer.toJson<String>(paymentMethod),
      'paidAmount': serializer.toJson<double>(paidAmount),
      'sourceMode': serializer.toJson<String>(sourceMode),
      'syncStatus': serializer.toJson<String>(syncStatus),
      'syncAttempts': serializer.toJson<int>(syncAttempts),
      'lastSyncError': serializer.toJson<String?>(lastSyncError),
      'serverId': serializer.toJson<String?>(serverId),
      'invoiceNumber': serializer.toJson<String?>(invoiceNumber),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  LocalSale copyWith({
    String? clientTransactionId,
    String? warehouseId,
    Value<String?> warehouseName = const Value.absent(),
    Value<String?> customerId = const Value.absent(),
    Value<String?> customerName = const Value.absent(),
    String? paymentMethod,
    double? paidAmount,
    String? sourceMode,
    String? syncStatus,
    int? syncAttempts,
    Value<String?> lastSyncError = const Value.absent(),
    Value<String?> serverId = const Value.absent(),
    Value<String?> invoiceNumber = const Value.absent(),
    DateTime? createdAt,
    DateTime? updatedAt,
  }) => LocalSale(
    clientTransactionId: clientTransactionId ?? this.clientTransactionId,
    warehouseId: warehouseId ?? this.warehouseId,
    warehouseName: warehouseName.present
        ? warehouseName.value
        : this.warehouseName,
    customerId: customerId.present ? customerId.value : this.customerId,
    customerName: customerName.present ? customerName.value : this.customerName,
    paymentMethod: paymentMethod ?? this.paymentMethod,
    paidAmount: paidAmount ?? this.paidAmount,
    sourceMode: sourceMode ?? this.sourceMode,
    syncStatus: syncStatus ?? this.syncStatus,
    syncAttempts: syncAttempts ?? this.syncAttempts,
    lastSyncError: lastSyncError.present
        ? lastSyncError.value
        : this.lastSyncError,
    serverId: serverId.present ? serverId.value : this.serverId,
    invoiceNumber: invoiceNumber.present
        ? invoiceNumber.value
        : this.invoiceNumber,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
  );
  LocalSale copyWithCompanion(LocalSalesCompanion data) {
    return LocalSale(
      clientTransactionId: data.clientTransactionId.present
          ? data.clientTransactionId.value
          : this.clientTransactionId,
      warehouseId: data.warehouseId.present
          ? data.warehouseId.value
          : this.warehouseId,
      warehouseName: data.warehouseName.present
          ? data.warehouseName.value
          : this.warehouseName,
      customerId: data.customerId.present
          ? data.customerId.value
          : this.customerId,
      customerName: data.customerName.present
          ? data.customerName.value
          : this.customerName,
      paymentMethod: data.paymentMethod.present
          ? data.paymentMethod.value
          : this.paymentMethod,
      paidAmount: data.paidAmount.present
          ? data.paidAmount.value
          : this.paidAmount,
      sourceMode: data.sourceMode.present
          ? data.sourceMode.value
          : this.sourceMode,
      syncStatus: data.syncStatus.present
          ? data.syncStatus.value
          : this.syncStatus,
      syncAttempts: data.syncAttempts.present
          ? data.syncAttempts.value
          : this.syncAttempts,
      lastSyncError: data.lastSyncError.present
          ? data.lastSyncError.value
          : this.lastSyncError,
      serverId: data.serverId.present ? data.serverId.value : this.serverId,
      invoiceNumber: data.invoiceNumber.present
          ? data.invoiceNumber.value
          : this.invoiceNumber,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('LocalSale(')
          ..write('clientTransactionId: $clientTransactionId, ')
          ..write('warehouseId: $warehouseId, ')
          ..write('warehouseName: $warehouseName, ')
          ..write('customerId: $customerId, ')
          ..write('customerName: $customerName, ')
          ..write('paymentMethod: $paymentMethod, ')
          ..write('paidAmount: $paidAmount, ')
          ..write('sourceMode: $sourceMode, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('syncAttempts: $syncAttempts, ')
          ..write('lastSyncError: $lastSyncError, ')
          ..write('serverId: $serverId, ')
          ..write('invoiceNumber: $invoiceNumber, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    clientTransactionId,
    warehouseId,
    warehouseName,
    customerId,
    customerName,
    paymentMethod,
    paidAmount,
    sourceMode,
    syncStatus,
    syncAttempts,
    lastSyncError,
    serverId,
    invoiceNumber,
    createdAt,
    updatedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is LocalSale &&
          other.clientTransactionId == this.clientTransactionId &&
          other.warehouseId == this.warehouseId &&
          other.warehouseName == this.warehouseName &&
          other.customerId == this.customerId &&
          other.customerName == this.customerName &&
          other.paymentMethod == this.paymentMethod &&
          other.paidAmount == this.paidAmount &&
          other.sourceMode == this.sourceMode &&
          other.syncStatus == this.syncStatus &&
          other.syncAttempts == this.syncAttempts &&
          other.lastSyncError == this.lastSyncError &&
          other.serverId == this.serverId &&
          other.invoiceNumber == this.invoiceNumber &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class LocalSalesCompanion extends UpdateCompanion<LocalSale> {
  final Value<String> clientTransactionId;
  final Value<String> warehouseId;
  final Value<String?> warehouseName;
  final Value<String?> customerId;
  final Value<String?> customerName;
  final Value<String> paymentMethod;
  final Value<double> paidAmount;
  final Value<String> sourceMode;
  final Value<String> syncStatus;
  final Value<int> syncAttempts;
  final Value<String?> lastSyncError;
  final Value<String?> serverId;
  final Value<String?> invoiceNumber;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  final Value<int> rowid;
  const LocalSalesCompanion({
    this.clientTransactionId = const Value.absent(),
    this.warehouseId = const Value.absent(),
    this.warehouseName = const Value.absent(),
    this.customerId = const Value.absent(),
    this.customerName = const Value.absent(),
    this.paymentMethod = const Value.absent(),
    this.paidAmount = const Value.absent(),
    this.sourceMode = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.syncAttempts = const Value.absent(),
    this.lastSyncError = const Value.absent(),
    this.serverId = const Value.absent(),
    this.invoiceNumber = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  LocalSalesCompanion.insert({
    required String clientTransactionId,
    required String warehouseId,
    this.warehouseName = const Value.absent(),
    this.customerId = const Value.absent(),
    this.customerName = const Value.absent(),
    required String paymentMethod,
    this.paidAmount = const Value.absent(),
    this.sourceMode = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.syncAttempts = const Value.absent(),
    this.lastSyncError = const Value.absent(),
    this.serverId = const Value.absent(),
    this.invoiceNumber = const Value.absent(),
    required DateTime createdAt,
    required DateTime updatedAt,
    this.rowid = const Value.absent(),
  }) : clientTransactionId = Value(clientTransactionId),
       warehouseId = Value(warehouseId),
       paymentMethod = Value(paymentMethod),
       createdAt = Value(createdAt),
       updatedAt = Value(updatedAt);
  static Insertable<LocalSale> custom({
    Expression<String>? clientTransactionId,
    Expression<String>? warehouseId,
    Expression<String>? warehouseName,
    Expression<String>? customerId,
    Expression<String>? customerName,
    Expression<String>? paymentMethod,
    Expression<double>? paidAmount,
    Expression<String>? sourceMode,
    Expression<String>? syncStatus,
    Expression<int>? syncAttempts,
    Expression<String>? lastSyncError,
    Expression<String>? serverId,
    Expression<String>? invoiceNumber,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (clientTransactionId != null)
        'client_transaction_id': clientTransactionId,
      if (warehouseId != null) 'warehouse_id': warehouseId,
      if (warehouseName != null) 'warehouse_name': warehouseName,
      if (customerId != null) 'customer_id': customerId,
      if (customerName != null) 'customer_name': customerName,
      if (paymentMethod != null) 'payment_method': paymentMethod,
      if (paidAmount != null) 'paid_amount': paidAmount,
      if (sourceMode != null) 'source_mode': sourceMode,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (syncAttempts != null) 'sync_attempts': syncAttempts,
      if (lastSyncError != null) 'last_sync_error': lastSyncError,
      if (serverId != null) 'server_id': serverId,
      if (invoiceNumber != null) 'invoice_number': invoiceNumber,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  LocalSalesCompanion copyWith({
    Value<String>? clientTransactionId,
    Value<String>? warehouseId,
    Value<String?>? warehouseName,
    Value<String?>? customerId,
    Value<String?>? customerName,
    Value<String>? paymentMethod,
    Value<double>? paidAmount,
    Value<String>? sourceMode,
    Value<String>? syncStatus,
    Value<int>? syncAttempts,
    Value<String?>? lastSyncError,
    Value<String?>? serverId,
    Value<String?>? invoiceNumber,
    Value<DateTime>? createdAt,
    Value<DateTime>? updatedAt,
    Value<int>? rowid,
  }) {
    return LocalSalesCompanion(
      clientTransactionId: clientTransactionId ?? this.clientTransactionId,
      warehouseId: warehouseId ?? this.warehouseId,
      warehouseName: warehouseName ?? this.warehouseName,
      customerId: customerId ?? this.customerId,
      customerName: customerName ?? this.customerName,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      paidAmount: paidAmount ?? this.paidAmount,
      sourceMode: sourceMode ?? this.sourceMode,
      syncStatus: syncStatus ?? this.syncStatus,
      syncAttempts: syncAttempts ?? this.syncAttempts,
      lastSyncError: lastSyncError ?? this.lastSyncError,
      serverId: serverId ?? this.serverId,
      invoiceNumber: invoiceNumber ?? this.invoiceNumber,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (clientTransactionId.present) {
      map['client_transaction_id'] = Variable<String>(
        clientTransactionId.value,
      );
    }
    if (warehouseId.present) {
      map['warehouse_id'] = Variable<String>(warehouseId.value);
    }
    if (warehouseName.present) {
      map['warehouse_name'] = Variable<String>(warehouseName.value);
    }
    if (customerId.present) {
      map['customer_id'] = Variable<String>(customerId.value);
    }
    if (customerName.present) {
      map['customer_name'] = Variable<String>(customerName.value);
    }
    if (paymentMethod.present) {
      map['payment_method'] = Variable<String>(paymentMethod.value);
    }
    if (paidAmount.present) {
      map['paid_amount'] = Variable<double>(paidAmount.value);
    }
    if (sourceMode.present) {
      map['source_mode'] = Variable<String>(sourceMode.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<String>(syncStatus.value);
    }
    if (syncAttempts.present) {
      map['sync_attempts'] = Variable<int>(syncAttempts.value);
    }
    if (lastSyncError.present) {
      map['last_sync_error'] = Variable<String>(lastSyncError.value);
    }
    if (serverId.present) {
      map['server_id'] = Variable<String>(serverId.value);
    }
    if (invoiceNumber.present) {
      map['invoice_number'] = Variable<String>(invoiceNumber.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('LocalSalesCompanion(')
          ..write('clientTransactionId: $clientTransactionId, ')
          ..write('warehouseId: $warehouseId, ')
          ..write('warehouseName: $warehouseName, ')
          ..write('customerId: $customerId, ')
          ..write('customerName: $customerName, ')
          ..write('paymentMethod: $paymentMethod, ')
          ..write('paidAmount: $paidAmount, ')
          ..write('sourceMode: $sourceMode, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('syncAttempts: $syncAttempts, ')
          ..write('lastSyncError: $lastSyncError, ')
          ..write('serverId: $serverId, ')
          ..write('invoiceNumber: $invoiceNumber, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $LocalSaleItemsTable extends LocalSaleItems
    with TableInfo<$LocalSaleItemsTable, LocalSaleItem> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $LocalSaleItemsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _clientTransactionIdMeta =
      const VerificationMeta('clientTransactionId');
  @override
  late final GeneratedColumn<String> clientTransactionId =
      GeneratedColumn<String>(
        'client_transaction_id',
        aliasedName,
        false,
        type: DriftSqlType.string,
        requiredDuringInsert: true,
        defaultConstraints: GeneratedColumn.constraintIsAlways(
          'REFERENCES local_sales (client_transaction_id)',
        ),
      );
  static const VerificationMeta _productIdMeta = const VerificationMeta(
    'productId',
  );
  @override
  late final GeneratedColumn<String> productId = GeneratedColumn<String>(
    'product_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _productNameMeta = const VerificationMeta(
    'productName',
  );
  @override
  late final GeneratedColumn<String> productName = GeneratedColumn<String>(
    'product_name',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _quantityMeta = const VerificationMeta(
    'quantity',
  );
  @override
  late final GeneratedColumn<double> quantity = GeneratedColumn<double>(
    'quantity',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _unitPriceMeta = const VerificationMeta(
    'unitPrice',
  );
  @override
  late final GeneratedColumn<double> unitPrice = GeneratedColumn<double>(
    'unit_price',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    clientTransactionId,
    productId,
    productName,
    quantity,
    unitPrice,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'local_sale_items';
  @override
  VerificationContext validateIntegrity(
    Insertable<LocalSaleItem> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('client_transaction_id')) {
      context.handle(
        _clientTransactionIdMeta,
        clientTransactionId.isAcceptableOrUnknown(
          data['client_transaction_id']!,
          _clientTransactionIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_clientTransactionIdMeta);
    }
    if (data.containsKey('product_id')) {
      context.handle(
        _productIdMeta,
        productId.isAcceptableOrUnknown(data['product_id']!, _productIdMeta),
      );
    } else if (isInserting) {
      context.missing(_productIdMeta);
    }
    if (data.containsKey('product_name')) {
      context.handle(
        _productNameMeta,
        productName.isAcceptableOrUnknown(
          data['product_name']!,
          _productNameMeta,
        ),
      );
    }
    if (data.containsKey('quantity')) {
      context.handle(
        _quantityMeta,
        quantity.isAcceptableOrUnknown(data['quantity']!, _quantityMeta),
      );
    } else if (isInserting) {
      context.missing(_quantityMeta);
    }
    if (data.containsKey('unit_price')) {
      context.handle(
        _unitPriceMeta,
        unitPrice.isAcceptableOrUnknown(data['unit_price']!, _unitPriceMeta),
      );
    } else if (isInserting) {
      context.missing(_unitPriceMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  LocalSaleItem map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return LocalSaleItem(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      clientTransactionId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}client_transaction_id'],
      )!,
      productId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}product_id'],
      )!,
      productName: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}product_name'],
      ),
      quantity: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}quantity'],
      )!,
      unitPrice: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}unit_price'],
      )!,
    );
  }

  @override
  $LocalSaleItemsTable createAlias(String alias) {
    return $LocalSaleItemsTable(attachedDatabase, alias);
  }
}

class LocalSaleItem extends DataClass implements Insertable<LocalSaleItem> {
  final int id;
  final String clientTransactionId;
  final String productId;
  final String? productName;
  final double quantity;
  final double unitPrice;
  const LocalSaleItem({
    required this.id,
    required this.clientTransactionId,
    required this.productId,
    this.productName,
    required this.quantity,
    required this.unitPrice,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['client_transaction_id'] = Variable<String>(clientTransactionId);
    map['product_id'] = Variable<String>(productId);
    if (!nullToAbsent || productName != null) {
      map['product_name'] = Variable<String>(productName);
    }
    map['quantity'] = Variable<double>(quantity);
    map['unit_price'] = Variable<double>(unitPrice);
    return map;
  }

  LocalSaleItemsCompanion toCompanion(bool nullToAbsent) {
    return LocalSaleItemsCompanion(
      id: Value(id),
      clientTransactionId: Value(clientTransactionId),
      productId: Value(productId),
      productName: productName == null && nullToAbsent
          ? const Value.absent()
          : Value(productName),
      quantity: Value(quantity),
      unitPrice: Value(unitPrice),
    );
  }

  factory LocalSaleItem.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return LocalSaleItem(
      id: serializer.fromJson<int>(json['id']),
      clientTransactionId: serializer.fromJson<String>(
        json['clientTransactionId'],
      ),
      productId: serializer.fromJson<String>(json['productId']),
      productName: serializer.fromJson<String?>(json['productName']),
      quantity: serializer.fromJson<double>(json['quantity']),
      unitPrice: serializer.fromJson<double>(json['unitPrice']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'clientTransactionId': serializer.toJson<String>(clientTransactionId),
      'productId': serializer.toJson<String>(productId),
      'productName': serializer.toJson<String?>(productName),
      'quantity': serializer.toJson<double>(quantity),
      'unitPrice': serializer.toJson<double>(unitPrice),
    };
  }

  LocalSaleItem copyWith({
    int? id,
    String? clientTransactionId,
    String? productId,
    Value<String?> productName = const Value.absent(),
    double? quantity,
    double? unitPrice,
  }) => LocalSaleItem(
    id: id ?? this.id,
    clientTransactionId: clientTransactionId ?? this.clientTransactionId,
    productId: productId ?? this.productId,
    productName: productName.present ? productName.value : this.productName,
    quantity: quantity ?? this.quantity,
    unitPrice: unitPrice ?? this.unitPrice,
  );
  LocalSaleItem copyWithCompanion(LocalSaleItemsCompanion data) {
    return LocalSaleItem(
      id: data.id.present ? data.id.value : this.id,
      clientTransactionId: data.clientTransactionId.present
          ? data.clientTransactionId.value
          : this.clientTransactionId,
      productId: data.productId.present ? data.productId.value : this.productId,
      productName: data.productName.present
          ? data.productName.value
          : this.productName,
      quantity: data.quantity.present ? data.quantity.value : this.quantity,
      unitPrice: data.unitPrice.present ? data.unitPrice.value : this.unitPrice,
    );
  }

  @override
  String toString() {
    return (StringBuffer('LocalSaleItem(')
          ..write('id: $id, ')
          ..write('clientTransactionId: $clientTransactionId, ')
          ..write('productId: $productId, ')
          ..write('productName: $productName, ')
          ..write('quantity: $quantity, ')
          ..write('unitPrice: $unitPrice')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    clientTransactionId,
    productId,
    productName,
    quantity,
    unitPrice,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is LocalSaleItem &&
          other.id == this.id &&
          other.clientTransactionId == this.clientTransactionId &&
          other.productId == this.productId &&
          other.productName == this.productName &&
          other.quantity == this.quantity &&
          other.unitPrice == this.unitPrice);
}

class LocalSaleItemsCompanion extends UpdateCompanion<LocalSaleItem> {
  final Value<int> id;
  final Value<String> clientTransactionId;
  final Value<String> productId;
  final Value<String?> productName;
  final Value<double> quantity;
  final Value<double> unitPrice;
  const LocalSaleItemsCompanion({
    this.id = const Value.absent(),
    this.clientTransactionId = const Value.absent(),
    this.productId = const Value.absent(),
    this.productName = const Value.absent(),
    this.quantity = const Value.absent(),
    this.unitPrice = const Value.absent(),
  });
  LocalSaleItemsCompanion.insert({
    this.id = const Value.absent(),
    required String clientTransactionId,
    required String productId,
    this.productName = const Value.absent(),
    required double quantity,
    required double unitPrice,
  }) : clientTransactionId = Value(clientTransactionId),
       productId = Value(productId),
       quantity = Value(quantity),
       unitPrice = Value(unitPrice);
  static Insertable<LocalSaleItem> custom({
    Expression<int>? id,
    Expression<String>? clientTransactionId,
    Expression<String>? productId,
    Expression<String>? productName,
    Expression<double>? quantity,
    Expression<double>? unitPrice,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (clientTransactionId != null)
        'client_transaction_id': clientTransactionId,
      if (productId != null) 'product_id': productId,
      if (productName != null) 'product_name': productName,
      if (quantity != null) 'quantity': quantity,
      if (unitPrice != null) 'unit_price': unitPrice,
    });
  }

  LocalSaleItemsCompanion copyWith({
    Value<int>? id,
    Value<String>? clientTransactionId,
    Value<String>? productId,
    Value<String?>? productName,
    Value<double>? quantity,
    Value<double>? unitPrice,
  }) {
    return LocalSaleItemsCompanion(
      id: id ?? this.id,
      clientTransactionId: clientTransactionId ?? this.clientTransactionId,
      productId: productId ?? this.productId,
      productName: productName ?? this.productName,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice ?? this.unitPrice,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (clientTransactionId.present) {
      map['client_transaction_id'] = Variable<String>(
        clientTransactionId.value,
      );
    }
    if (productId.present) {
      map['product_id'] = Variable<String>(productId.value);
    }
    if (productName.present) {
      map['product_name'] = Variable<String>(productName.value);
    }
    if (quantity.present) {
      map['quantity'] = Variable<double>(quantity.value);
    }
    if (unitPrice.present) {
      map['unit_price'] = Variable<double>(unitPrice.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('LocalSaleItemsCompanion(')
          ..write('id: $id, ')
          ..write('clientTransactionId: $clientTransactionId, ')
          ..write('productId: $productId, ')
          ..write('productName: $productName, ')
          ..write('quantity: $quantity, ')
          ..write('unitPrice: $unitPrice')
          ..write(')'))
        .toString();
  }
}

class $SyncMetadataTable extends SyncMetadata
    with TableInfo<$SyncMetadataTable, SyncMetadataData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SyncMetadataTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _keyMeta = const VerificationMeta('key');
  @override
  late final GeneratedColumn<String> key = GeneratedColumn<String>(
    'key',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _valueMeta = const VerificationMeta('value');
  @override
  late final GeneratedColumn<String> value = GeneratedColumn<String>(
    'value',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [key, value];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'sync_metadata';
  @override
  VerificationContext validateIntegrity(
    Insertable<SyncMetadataData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('key')) {
      context.handle(
        _keyMeta,
        key.isAcceptableOrUnknown(data['key']!, _keyMeta),
      );
    } else if (isInserting) {
      context.missing(_keyMeta);
    }
    if (data.containsKey('value')) {
      context.handle(
        _valueMeta,
        value.isAcceptableOrUnknown(data['value']!, _valueMeta),
      );
    } else if (isInserting) {
      context.missing(_valueMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {key};
  @override
  SyncMetadataData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SyncMetadataData(
      key: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}key'],
      )!,
      value: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}value'],
      )!,
    );
  }

  @override
  $SyncMetadataTable createAlias(String alias) {
    return $SyncMetadataTable(attachedDatabase, alias);
  }
}

class SyncMetadataData extends DataClass
    implements Insertable<SyncMetadataData> {
  final String key;
  final String value;
  const SyncMetadataData({required this.key, required this.value});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['key'] = Variable<String>(key);
    map['value'] = Variable<String>(value);
    return map;
  }

  SyncMetadataCompanion toCompanion(bool nullToAbsent) {
    return SyncMetadataCompanion(key: Value(key), value: Value(value));
  }

  factory SyncMetadataData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SyncMetadataData(
      key: serializer.fromJson<String>(json['key']),
      value: serializer.fromJson<String>(json['value']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'key': serializer.toJson<String>(key),
      'value': serializer.toJson<String>(value),
    };
  }

  SyncMetadataData copyWith({String? key, String? value}) =>
      SyncMetadataData(key: key ?? this.key, value: value ?? this.value);
  SyncMetadataData copyWithCompanion(SyncMetadataCompanion data) {
    return SyncMetadataData(
      key: data.key.present ? data.key.value : this.key,
      value: data.value.present ? data.value.value : this.value,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SyncMetadataData(')
          ..write('key: $key, ')
          ..write('value: $value')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(key, value);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SyncMetadataData &&
          other.key == this.key &&
          other.value == this.value);
}

class SyncMetadataCompanion extends UpdateCompanion<SyncMetadataData> {
  final Value<String> key;
  final Value<String> value;
  final Value<int> rowid;
  const SyncMetadataCompanion({
    this.key = const Value.absent(),
    this.value = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  SyncMetadataCompanion.insert({
    required String key,
    required String value,
    this.rowid = const Value.absent(),
  }) : key = Value(key),
       value = Value(value);
  static Insertable<SyncMetadataData> custom({
    Expression<String>? key,
    Expression<String>? value,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (key != null) 'key': key,
      if (value != null) 'value': value,
      if (rowid != null) 'rowid': rowid,
    });
  }

  SyncMetadataCompanion copyWith({
    Value<String>? key,
    Value<String>? value,
    Value<int>? rowid,
  }) {
    return SyncMetadataCompanion(
      key: key ?? this.key,
      value: value ?? this.value,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (key.present) {
      map['key'] = Variable<String>(key.value);
    }
    if (value.present) {
      map['value'] = Variable<String>(value.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SyncMetadataCompanion(')
          ..write('key: $key, ')
          ..write('value: $value, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $ProductsCacheTable productsCache = $ProductsCacheTable(this);
  late final $WarehousesCacheTable warehousesCache = $WarehousesCacheTable(
    this,
  );
  late final $SuppliersCacheTable suppliersCache = $SuppliersCacheTable(this);
  late final $PaymentMethodsCacheTable paymentMethodsCache =
      $PaymentMethodsCacheTable(this);
  late final $CustomersCacheTable customersCache = $CustomersCacheTable(this);
  late final $InventoryCacheTable inventoryCache = $InventoryCacheTable(this);
  late final $LocalPurchasesTable localPurchases = $LocalPurchasesTable(this);
  late final $LocalPurchaseItemsTable localPurchaseItems =
      $LocalPurchaseItemsTable(this);
  late final $LocalSalesTable localSales = $LocalSalesTable(this);
  late final $LocalSaleItemsTable localSaleItems = $LocalSaleItemsTable(this);
  late final $SyncMetadataTable syncMetadata = $SyncMetadataTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    productsCache,
    warehousesCache,
    suppliersCache,
    paymentMethodsCache,
    customersCache,
    inventoryCache,
    localPurchases,
    localPurchaseItems,
    localSales,
    localSaleItems,
    syncMetadata,
  ];
}

typedef $$ProductsCacheTableCreateCompanionBuilder =
    ProductsCacheCompanion Function({
      required String id,
      required String name,
      Value<String?> sku,
      required String unit,
      Value<double> purchasePrice,
      Value<double> sellingPrice,
      Value<String?> brand,
      required DateTime syncedAt,
      Value<int> rowid,
    });
typedef $$ProductsCacheTableUpdateCompanionBuilder =
    ProductsCacheCompanion Function({
      Value<String> id,
      Value<String> name,
      Value<String?> sku,
      Value<String> unit,
      Value<double> purchasePrice,
      Value<double> sellingPrice,
      Value<String?> brand,
      Value<DateTime> syncedAt,
      Value<int> rowid,
    });

class $$ProductsCacheTableFilterComposer
    extends Composer<_$AppDatabase, $ProductsCacheTable> {
  $$ProductsCacheTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get sku => $composableBuilder(
    column: $table.sku,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get unit => $composableBuilder(
    column: $table.unit,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get purchasePrice => $composableBuilder(
    column: $table.purchasePrice,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get sellingPrice => $composableBuilder(
    column: $table.sellingPrice,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get brand => $composableBuilder(
    column: $table.brand,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get syncedAt => $composableBuilder(
    column: $table.syncedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$ProductsCacheTableOrderingComposer
    extends Composer<_$AppDatabase, $ProductsCacheTable> {
  $$ProductsCacheTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get sku => $composableBuilder(
    column: $table.sku,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get unit => $composableBuilder(
    column: $table.unit,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get purchasePrice => $composableBuilder(
    column: $table.purchasePrice,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get sellingPrice => $composableBuilder(
    column: $table.sellingPrice,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get brand => $composableBuilder(
    column: $table.brand,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get syncedAt => $composableBuilder(
    column: $table.syncedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$ProductsCacheTableAnnotationComposer
    extends Composer<_$AppDatabase, $ProductsCacheTable> {
  $$ProductsCacheTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get sku =>
      $composableBuilder(column: $table.sku, builder: (column) => column);

  GeneratedColumn<String> get unit =>
      $composableBuilder(column: $table.unit, builder: (column) => column);

  GeneratedColumn<double> get purchasePrice => $composableBuilder(
    column: $table.purchasePrice,
    builder: (column) => column,
  );

  GeneratedColumn<double> get sellingPrice => $composableBuilder(
    column: $table.sellingPrice,
    builder: (column) => column,
  );

  GeneratedColumn<String> get brand =>
      $composableBuilder(column: $table.brand, builder: (column) => column);

  GeneratedColumn<DateTime> get syncedAt =>
      $composableBuilder(column: $table.syncedAt, builder: (column) => column);
}

class $$ProductsCacheTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $ProductsCacheTable,
          ProductsCacheData,
          $$ProductsCacheTableFilterComposer,
          $$ProductsCacheTableOrderingComposer,
          $$ProductsCacheTableAnnotationComposer,
          $$ProductsCacheTableCreateCompanionBuilder,
          $$ProductsCacheTableUpdateCompanionBuilder,
          (
            ProductsCacheData,
            BaseReferences<
              _$AppDatabase,
              $ProductsCacheTable,
              ProductsCacheData
            >,
          ),
          ProductsCacheData,
          PrefetchHooks Function()
        > {
  $$ProductsCacheTableTableManager(_$AppDatabase db, $ProductsCacheTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ProductsCacheTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ProductsCacheTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ProductsCacheTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String?> sku = const Value.absent(),
                Value<String> unit = const Value.absent(),
                Value<double> purchasePrice = const Value.absent(),
                Value<double> sellingPrice = const Value.absent(),
                Value<String?> brand = const Value.absent(),
                Value<DateTime> syncedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => ProductsCacheCompanion(
                id: id,
                name: name,
                sku: sku,
                unit: unit,
                purchasePrice: purchasePrice,
                sellingPrice: sellingPrice,
                brand: brand,
                syncedAt: syncedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String name,
                Value<String?> sku = const Value.absent(),
                required String unit,
                Value<double> purchasePrice = const Value.absent(),
                Value<double> sellingPrice = const Value.absent(),
                Value<String?> brand = const Value.absent(),
                required DateTime syncedAt,
                Value<int> rowid = const Value.absent(),
              }) => ProductsCacheCompanion.insert(
                id: id,
                name: name,
                sku: sku,
                unit: unit,
                purchasePrice: purchasePrice,
                sellingPrice: sellingPrice,
                brand: brand,
                syncedAt: syncedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$ProductsCacheTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $ProductsCacheTable,
      ProductsCacheData,
      $$ProductsCacheTableFilterComposer,
      $$ProductsCacheTableOrderingComposer,
      $$ProductsCacheTableAnnotationComposer,
      $$ProductsCacheTableCreateCompanionBuilder,
      $$ProductsCacheTableUpdateCompanionBuilder,
      (
        ProductsCacheData,
        BaseReferences<_$AppDatabase, $ProductsCacheTable, ProductsCacheData>,
      ),
      ProductsCacheData,
      PrefetchHooks Function()
    >;
typedef $$WarehousesCacheTableCreateCompanionBuilder =
    WarehousesCacheCompanion Function({
      required String id,
      required String name,
      Value<String?> code,
      required DateTime syncedAt,
      Value<int> rowid,
    });
typedef $$WarehousesCacheTableUpdateCompanionBuilder =
    WarehousesCacheCompanion Function({
      Value<String> id,
      Value<String> name,
      Value<String?> code,
      Value<DateTime> syncedAt,
      Value<int> rowid,
    });

class $$WarehousesCacheTableFilterComposer
    extends Composer<_$AppDatabase, $WarehousesCacheTable> {
  $$WarehousesCacheTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get code => $composableBuilder(
    column: $table.code,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get syncedAt => $composableBuilder(
    column: $table.syncedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$WarehousesCacheTableOrderingComposer
    extends Composer<_$AppDatabase, $WarehousesCacheTable> {
  $$WarehousesCacheTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get code => $composableBuilder(
    column: $table.code,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get syncedAt => $composableBuilder(
    column: $table.syncedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$WarehousesCacheTableAnnotationComposer
    extends Composer<_$AppDatabase, $WarehousesCacheTable> {
  $$WarehousesCacheTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get code =>
      $composableBuilder(column: $table.code, builder: (column) => column);

  GeneratedColumn<DateTime> get syncedAt =>
      $composableBuilder(column: $table.syncedAt, builder: (column) => column);
}

class $$WarehousesCacheTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $WarehousesCacheTable,
          WarehousesCacheData,
          $$WarehousesCacheTableFilterComposer,
          $$WarehousesCacheTableOrderingComposer,
          $$WarehousesCacheTableAnnotationComposer,
          $$WarehousesCacheTableCreateCompanionBuilder,
          $$WarehousesCacheTableUpdateCompanionBuilder,
          (
            WarehousesCacheData,
            BaseReferences<
              _$AppDatabase,
              $WarehousesCacheTable,
              WarehousesCacheData
            >,
          ),
          WarehousesCacheData,
          PrefetchHooks Function()
        > {
  $$WarehousesCacheTableTableManager(
    _$AppDatabase db,
    $WarehousesCacheTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$WarehousesCacheTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$WarehousesCacheTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$WarehousesCacheTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String?> code = const Value.absent(),
                Value<DateTime> syncedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => WarehousesCacheCompanion(
                id: id,
                name: name,
                code: code,
                syncedAt: syncedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String name,
                Value<String?> code = const Value.absent(),
                required DateTime syncedAt,
                Value<int> rowid = const Value.absent(),
              }) => WarehousesCacheCompanion.insert(
                id: id,
                name: name,
                code: code,
                syncedAt: syncedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$WarehousesCacheTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $WarehousesCacheTable,
      WarehousesCacheData,
      $$WarehousesCacheTableFilterComposer,
      $$WarehousesCacheTableOrderingComposer,
      $$WarehousesCacheTableAnnotationComposer,
      $$WarehousesCacheTableCreateCompanionBuilder,
      $$WarehousesCacheTableUpdateCompanionBuilder,
      (
        WarehousesCacheData,
        BaseReferences<
          _$AppDatabase,
          $WarehousesCacheTable,
          WarehousesCacheData
        >,
      ),
      WarehousesCacheData,
      PrefetchHooks Function()
    >;
typedef $$SuppliersCacheTableCreateCompanionBuilder =
    SuppliersCacheCompanion Function({
      required String id,
      required String name,
      required DateTime syncedAt,
      Value<int> rowid,
    });
typedef $$SuppliersCacheTableUpdateCompanionBuilder =
    SuppliersCacheCompanion Function({
      Value<String> id,
      Value<String> name,
      Value<DateTime> syncedAt,
      Value<int> rowid,
    });

class $$SuppliersCacheTableFilterComposer
    extends Composer<_$AppDatabase, $SuppliersCacheTable> {
  $$SuppliersCacheTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get syncedAt => $composableBuilder(
    column: $table.syncedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$SuppliersCacheTableOrderingComposer
    extends Composer<_$AppDatabase, $SuppliersCacheTable> {
  $$SuppliersCacheTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get syncedAt => $composableBuilder(
    column: $table.syncedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$SuppliersCacheTableAnnotationComposer
    extends Composer<_$AppDatabase, $SuppliersCacheTable> {
  $$SuppliersCacheTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<DateTime> get syncedAt =>
      $composableBuilder(column: $table.syncedAt, builder: (column) => column);
}

class $$SuppliersCacheTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $SuppliersCacheTable,
          SuppliersCacheData,
          $$SuppliersCacheTableFilterComposer,
          $$SuppliersCacheTableOrderingComposer,
          $$SuppliersCacheTableAnnotationComposer,
          $$SuppliersCacheTableCreateCompanionBuilder,
          $$SuppliersCacheTableUpdateCompanionBuilder,
          (
            SuppliersCacheData,
            BaseReferences<
              _$AppDatabase,
              $SuppliersCacheTable,
              SuppliersCacheData
            >,
          ),
          SuppliersCacheData,
          PrefetchHooks Function()
        > {
  $$SuppliersCacheTableTableManager(
    _$AppDatabase db,
    $SuppliersCacheTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SuppliersCacheTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SuppliersCacheTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SuppliersCacheTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<DateTime> syncedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => SuppliersCacheCompanion(
                id: id,
                name: name,
                syncedAt: syncedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String name,
                required DateTime syncedAt,
                Value<int> rowid = const Value.absent(),
              }) => SuppliersCacheCompanion.insert(
                id: id,
                name: name,
                syncedAt: syncedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$SuppliersCacheTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $SuppliersCacheTable,
      SuppliersCacheData,
      $$SuppliersCacheTableFilterComposer,
      $$SuppliersCacheTableOrderingComposer,
      $$SuppliersCacheTableAnnotationComposer,
      $$SuppliersCacheTableCreateCompanionBuilder,
      $$SuppliersCacheTableUpdateCompanionBuilder,
      (
        SuppliersCacheData,
        BaseReferences<_$AppDatabase, $SuppliersCacheTable, SuppliersCacheData>,
      ),
      SuppliersCacheData,
      PrefetchHooks Function()
    >;
typedef $$PaymentMethodsCacheTableCreateCompanionBuilder =
    PaymentMethodsCacheCompanion Function({
      required String id,
      required String name,
      required DateTime syncedAt,
      Value<int> rowid,
    });
typedef $$PaymentMethodsCacheTableUpdateCompanionBuilder =
    PaymentMethodsCacheCompanion Function({
      Value<String> id,
      Value<String> name,
      Value<DateTime> syncedAt,
      Value<int> rowid,
    });

class $$PaymentMethodsCacheTableFilterComposer
    extends Composer<_$AppDatabase, $PaymentMethodsCacheTable> {
  $$PaymentMethodsCacheTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get syncedAt => $composableBuilder(
    column: $table.syncedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$PaymentMethodsCacheTableOrderingComposer
    extends Composer<_$AppDatabase, $PaymentMethodsCacheTable> {
  $$PaymentMethodsCacheTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get syncedAt => $composableBuilder(
    column: $table.syncedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$PaymentMethodsCacheTableAnnotationComposer
    extends Composer<_$AppDatabase, $PaymentMethodsCacheTable> {
  $$PaymentMethodsCacheTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<DateTime> get syncedAt =>
      $composableBuilder(column: $table.syncedAt, builder: (column) => column);
}

class $$PaymentMethodsCacheTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $PaymentMethodsCacheTable,
          PaymentMethodsCacheData,
          $$PaymentMethodsCacheTableFilterComposer,
          $$PaymentMethodsCacheTableOrderingComposer,
          $$PaymentMethodsCacheTableAnnotationComposer,
          $$PaymentMethodsCacheTableCreateCompanionBuilder,
          $$PaymentMethodsCacheTableUpdateCompanionBuilder,
          (
            PaymentMethodsCacheData,
            BaseReferences<
              _$AppDatabase,
              $PaymentMethodsCacheTable,
              PaymentMethodsCacheData
            >,
          ),
          PaymentMethodsCacheData,
          PrefetchHooks Function()
        > {
  $$PaymentMethodsCacheTableTableManager(
    _$AppDatabase db,
    $PaymentMethodsCacheTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PaymentMethodsCacheTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PaymentMethodsCacheTableOrderingComposer(
                $db: db,
                $table: table,
              ),
          createComputedFieldComposer: () =>
              $$PaymentMethodsCacheTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<DateTime> syncedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => PaymentMethodsCacheCompanion(
                id: id,
                name: name,
                syncedAt: syncedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String name,
                required DateTime syncedAt,
                Value<int> rowid = const Value.absent(),
              }) => PaymentMethodsCacheCompanion.insert(
                id: id,
                name: name,
                syncedAt: syncedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$PaymentMethodsCacheTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $PaymentMethodsCacheTable,
      PaymentMethodsCacheData,
      $$PaymentMethodsCacheTableFilterComposer,
      $$PaymentMethodsCacheTableOrderingComposer,
      $$PaymentMethodsCacheTableAnnotationComposer,
      $$PaymentMethodsCacheTableCreateCompanionBuilder,
      $$PaymentMethodsCacheTableUpdateCompanionBuilder,
      (
        PaymentMethodsCacheData,
        BaseReferences<
          _$AppDatabase,
          $PaymentMethodsCacheTable,
          PaymentMethodsCacheData
        >,
      ),
      PaymentMethodsCacheData,
      PrefetchHooks Function()
    >;
typedef $$CustomersCacheTableCreateCompanionBuilder =
    CustomersCacheCompanion Function({
      required String id,
      required String name,
      Value<String?> phone,
      required DateTime syncedAt,
      Value<int> rowid,
    });
typedef $$CustomersCacheTableUpdateCompanionBuilder =
    CustomersCacheCompanion Function({
      Value<String> id,
      Value<String> name,
      Value<String?> phone,
      Value<DateTime> syncedAt,
      Value<int> rowid,
    });

class $$CustomersCacheTableFilterComposer
    extends Composer<_$AppDatabase, $CustomersCacheTable> {
  $$CustomersCacheTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get phone => $composableBuilder(
    column: $table.phone,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get syncedAt => $composableBuilder(
    column: $table.syncedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CustomersCacheTableOrderingComposer
    extends Composer<_$AppDatabase, $CustomersCacheTable> {
  $$CustomersCacheTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get phone => $composableBuilder(
    column: $table.phone,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get syncedAt => $composableBuilder(
    column: $table.syncedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CustomersCacheTableAnnotationComposer
    extends Composer<_$AppDatabase, $CustomersCacheTable> {
  $$CustomersCacheTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get phone =>
      $composableBuilder(column: $table.phone, builder: (column) => column);

  GeneratedColumn<DateTime> get syncedAt =>
      $composableBuilder(column: $table.syncedAt, builder: (column) => column);
}

class $$CustomersCacheTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CustomersCacheTable,
          CustomersCacheData,
          $$CustomersCacheTableFilterComposer,
          $$CustomersCacheTableOrderingComposer,
          $$CustomersCacheTableAnnotationComposer,
          $$CustomersCacheTableCreateCompanionBuilder,
          $$CustomersCacheTableUpdateCompanionBuilder,
          (
            CustomersCacheData,
            BaseReferences<
              _$AppDatabase,
              $CustomersCacheTable,
              CustomersCacheData
            >,
          ),
          CustomersCacheData,
          PrefetchHooks Function()
        > {
  $$CustomersCacheTableTableManager(
    _$AppDatabase db,
    $CustomersCacheTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CustomersCacheTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CustomersCacheTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CustomersCacheTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String?> phone = const Value.absent(),
                Value<DateTime> syncedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CustomersCacheCompanion(
                id: id,
                name: name,
                phone: phone,
                syncedAt: syncedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String name,
                Value<String?> phone = const Value.absent(),
                required DateTime syncedAt,
                Value<int> rowid = const Value.absent(),
              }) => CustomersCacheCompanion.insert(
                id: id,
                name: name,
                phone: phone,
                syncedAt: syncedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CustomersCacheTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CustomersCacheTable,
      CustomersCacheData,
      $$CustomersCacheTableFilterComposer,
      $$CustomersCacheTableOrderingComposer,
      $$CustomersCacheTableAnnotationComposer,
      $$CustomersCacheTableCreateCompanionBuilder,
      $$CustomersCacheTableUpdateCompanionBuilder,
      (
        CustomersCacheData,
        BaseReferences<_$AppDatabase, $CustomersCacheTable, CustomersCacheData>,
      ),
      CustomersCacheData,
      PrefetchHooks Function()
    >;
typedef $$InventoryCacheTableCreateCompanionBuilder =
    InventoryCacheCompanion Function({
      required String productId,
      required String warehouseId,
      Value<double> quantity,
      Value<double> available,
      required DateTime syncedAt,
      Value<int> rowid,
    });
typedef $$InventoryCacheTableUpdateCompanionBuilder =
    InventoryCacheCompanion Function({
      Value<String> productId,
      Value<String> warehouseId,
      Value<double> quantity,
      Value<double> available,
      Value<DateTime> syncedAt,
      Value<int> rowid,
    });

class $$InventoryCacheTableFilterComposer
    extends Composer<_$AppDatabase, $InventoryCacheTable> {
  $$InventoryCacheTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get productId => $composableBuilder(
    column: $table.productId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get warehouseId => $composableBuilder(
    column: $table.warehouseId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get quantity => $composableBuilder(
    column: $table.quantity,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get available => $composableBuilder(
    column: $table.available,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get syncedAt => $composableBuilder(
    column: $table.syncedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$InventoryCacheTableOrderingComposer
    extends Composer<_$AppDatabase, $InventoryCacheTable> {
  $$InventoryCacheTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get productId => $composableBuilder(
    column: $table.productId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get warehouseId => $composableBuilder(
    column: $table.warehouseId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get quantity => $composableBuilder(
    column: $table.quantity,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get available => $composableBuilder(
    column: $table.available,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get syncedAt => $composableBuilder(
    column: $table.syncedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$InventoryCacheTableAnnotationComposer
    extends Composer<_$AppDatabase, $InventoryCacheTable> {
  $$InventoryCacheTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get productId =>
      $composableBuilder(column: $table.productId, builder: (column) => column);

  GeneratedColumn<String> get warehouseId => $composableBuilder(
    column: $table.warehouseId,
    builder: (column) => column,
  );

  GeneratedColumn<double> get quantity =>
      $composableBuilder(column: $table.quantity, builder: (column) => column);

  GeneratedColumn<double> get available =>
      $composableBuilder(column: $table.available, builder: (column) => column);

  GeneratedColumn<DateTime> get syncedAt =>
      $composableBuilder(column: $table.syncedAt, builder: (column) => column);
}

class $$InventoryCacheTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $InventoryCacheTable,
          InventoryCacheData,
          $$InventoryCacheTableFilterComposer,
          $$InventoryCacheTableOrderingComposer,
          $$InventoryCacheTableAnnotationComposer,
          $$InventoryCacheTableCreateCompanionBuilder,
          $$InventoryCacheTableUpdateCompanionBuilder,
          (
            InventoryCacheData,
            BaseReferences<
              _$AppDatabase,
              $InventoryCacheTable,
              InventoryCacheData
            >,
          ),
          InventoryCacheData,
          PrefetchHooks Function()
        > {
  $$InventoryCacheTableTableManager(
    _$AppDatabase db,
    $InventoryCacheTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$InventoryCacheTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$InventoryCacheTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$InventoryCacheTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> productId = const Value.absent(),
                Value<String> warehouseId = const Value.absent(),
                Value<double> quantity = const Value.absent(),
                Value<double> available = const Value.absent(),
                Value<DateTime> syncedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => InventoryCacheCompanion(
                productId: productId,
                warehouseId: warehouseId,
                quantity: quantity,
                available: available,
                syncedAt: syncedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String productId,
                required String warehouseId,
                Value<double> quantity = const Value.absent(),
                Value<double> available = const Value.absent(),
                required DateTime syncedAt,
                Value<int> rowid = const Value.absent(),
              }) => InventoryCacheCompanion.insert(
                productId: productId,
                warehouseId: warehouseId,
                quantity: quantity,
                available: available,
                syncedAt: syncedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$InventoryCacheTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $InventoryCacheTable,
      InventoryCacheData,
      $$InventoryCacheTableFilterComposer,
      $$InventoryCacheTableOrderingComposer,
      $$InventoryCacheTableAnnotationComposer,
      $$InventoryCacheTableCreateCompanionBuilder,
      $$InventoryCacheTableUpdateCompanionBuilder,
      (
        InventoryCacheData,
        BaseReferences<_$AppDatabase, $InventoryCacheTable, InventoryCacheData>,
      ),
      InventoryCacheData,
      PrefetchHooks Function()
    >;
typedef $$LocalPurchasesTableCreateCompanionBuilder =
    LocalPurchasesCompanion Function({
      required String clientTransactionId,
      Value<String?> supplierId,
      Value<String?> walkInName,
      required String paymentMethod,
      Value<double> paidAmount,
      Value<String> sourceMode,
      Value<String> syncStatus,
      Value<int> syncAttempts,
      Value<String?> lastSyncError,
      Value<String?> serverId,
      Value<String?> orderNumber,
      required DateTime createdAt,
      required DateTime updatedAt,
      Value<int> rowid,
    });
typedef $$LocalPurchasesTableUpdateCompanionBuilder =
    LocalPurchasesCompanion Function({
      Value<String> clientTransactionId,
      Value<String?> supplierId,
      Value<String?> walkInName,
      Value<String> paymentMethod,
      Value<double> paidAmount,
      Value<String> sourceMode,
      Value<String> syncStatus,
      Value<int> syncAttempts,
      Value<String?> lastSyncError,
      Value<String?> serverId,
      Value<String?> orderNumber,
      Value<DateTime> createdAt,
      Value<DateTime> updatedAt,
      Value<int> rowid,
    });

final class $$LocalPurchasesTableReferences
    extends BaseReferences<_$AppDatabase, $LocalPurchasesTable, LocalPurchase> {
  $$LocalPurchasesTableReferences(
    super.$_db,
    super.$_table,
    super.$_typedResult,
  );

  static MultiTypedResultKey<$LocalPurchaseItemsTable, List<LocalPurchaseItem>>
  _localPurchaseItemsRefsTable(
    _$AppDatabase db,
  ) => MultiTypedResultKey.fromTable(
    db.localPurchaseItems,
    aliasName:
        'local_purchases__client_transaction_id__local_purchase_items__client_transaction_id',
  );

  $$LocalPurchaseItemsTableProcessedTableManager get localPurchaseItemsRefs {
    final manager =
        $$LocalPurchaseItemsTableTableManager(
          $_db,
          $_db.localPurchaseItems,
        ).filter(
          (f) => f.clientTransactionId.clientTransactionId.sqlEquals(
            $_itemColumn<String>('client_transaction_id')!,
          ),
        );

    final cache = $_typedResult.readTableOrNull(
      _localPurchaseItemsRefsTable($_db),
    );
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }
}

class $$LocalPurchasesTableFilterComposer
    extends Composer<_$AppDatabase, $LocalPurchasesTable> {
  $$LocalPurchasesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get clientTransactionId => $composableBuilder(
    column: $table.clientTransactionId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get supplierId => $composableBuilder(
    column: $table.supplierId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get walkInName => $composableBuilder(
    column: $table.walkInName,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get paymentMethod => $composableBuilder(
    column: $table.paymentMethod,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get paidAmount => $composableBuilder(
    column: $table.paidAmount,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get sourceMode => $composableBuilder(
    column: $table.sourceMode,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get syncAttempts => $composableBuilder(
    column: $table.syncAttempts,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get lastSyncError => $composableBuilder(
    column: $table.lastSyncError,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get serverId => $composableBuilder(
    column: $table.serverId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get orderNumber => $composableBuilder(
    column: $table.orderNumber,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );

  Expression<bool> localPurchaseItemsRefs(
    Expression<bool> Function($$LocalPurchaseItemsTableFilterComposer f) f,
  ) {
    final $$LocalPurchaseItemsTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.clientTransactionId,
      referencedTable: $db.localPurchaseItems,
      getReferencedColumn: (t) => t.clientTransactionId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$LocalPurchaseItemsTableFilterComposer(
            $db: $db,
            $table: $db.localPurchaseItems,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$LocalPurchasesTableOrderingComposer
    extends Composer<_$AppDatabase, $LocalPurchasesTable> {
  $$LocalPurchasesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get clientTransactionId => $composableBuilder(
    column: $table.clientTransactionId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get supplierId => $composableBuilder(
    column: $table.supplierId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get walkInName => $composableBuilder(
    column: $table.walkInName,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get paymentMethod => $composableBuilder(
    column: $table.paymentMethod,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get paidAmount => $composableBuilder(
    column: $table.paidAmount,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get sourceMode => $composableBuilder(
    column: $table.sourceMode,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get syncAttempts => $composableBuilder(
    column: $table.syncAttempts,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get lastSyncError => $composableBuilder(
    column: $table.lastSyncError,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get serverId => $composableBuilder(
    column: $table.serverId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get orderNumber => $composableBuilder(
    column: $table.orderNumber,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$LocalPurchasesTableAnnotationComposer
    extends Composer<_$AppDatabase, $LocalPurchasesTable> {
  $$LocalPurchasesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get clientTransactionId => $composableBuilder(
    column: $table.clientTransactionId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get supplierId => $composableBuilder(
    column: $table.supplierId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get walkInName => $composableBuilder(
    column: $table.walkInName,
    builder: (column) => column,
  );

  GeneratedColumn<String> get paymentMethod => $composableBuilder(
    column: $table.paymentMethod,
    builder: (column) => column,
  );

  GeneratedColumn<double> get paidAmount => $composableBuilder(
    column: $table.paidAmount,
    builder: (column) => column,
  );

  GeneratedColumn<String> get sourceMode => $composableBuilder(
    column: $table.sourceMode,
    builder: (column) => column,
  );

  GeneratedColumn<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => column,
  );

  GeneratedColumn<int> get syncAttempts => $composableBuilder(
    column: $table.syncAttempts,
    builder: (column) => column,
  );

  GeneratedColumn<String> get lastSyncError => $composableBuilder(
    column: $table.lastSyncError,
    builder: (column) => column,
  );

  GeneratedColumn<String> get serverId =>
      $composableBuilder(column: $table.serverId, builder: (column) => column);

  GeneratedColumn<String> get orderNumber => $composableBuilder(
    column: $table.orderNumber,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  Expression<T> localPurchaseItemsRefs<T extends Object>(
    Expression<T> Function($$LocalPurchaseItemsTableAnnotationComposer a) f,
  ) {
    final $$LocalPurchaseItemsTableAnnotationComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.clientTransactionId,
          referencedTable: $db.localPurchaseItems,
          getReferencedColumn: (t) => t.clientTransactionId,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$LocalPurchaseItemsTableAnnotationComposer(
                $db: $db,
                $table: $db.localPurchaseItems,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return f(composer);
  }
}

class $$LocalPurchasesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $LocalPurchasesTable,
          LocalPurchase,
          $$LocalPurchasesTableFilterComposer,
          $$LocalPurchasesTableOrderingComposer,
          $$LocalPurchasesTableAnnotationComposer,
          $$LocalPurchasesTableCreateCompanionBuilder,
          $$LocalPurchasesTableUpdateCompanionBuilder,
          (LocalPurchase, $$LocalPurchasesTableReferences),
          LocalPurchase,
          PrefetchHooks Function({bool localPurchaseItemsRefs})
        > {
  $$LocalPurchasesTableTableManager(
    _$AppDatabase db,
    $LocalPurchasesTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$LocalPurchasesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$LocalPurchasesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$LocalPurchasesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> clientTransactionId = const Value.absent(),
                Value<String?> supplierId = const Value.absent(),
                Value<String?> walkInName = const Value.absent(),
                Value<String> paymentMethod = const Value.absent(),
                Value<double> paidAmount = const Value.absent(),
                Value<String> sourceMode = const Value.absent(),
                Value<String> syncStatus = const Value.absent(),
                Value<int> syncAttempts = const Value.absent(),
                Value<String?> lastSyncError = const Value.absent(),
                Value<String?> serverId = const Value.absent(),
                Value<String?> orderNumber = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<DateTime> updatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => LocalPurchasesCompanion(
                clientTransactionId: clientTransactionId,
                supplierId: supplierId,
                walkInName: walkInName,
                paymentMethod: paymentMethod,
                paidAmount: paidAmount,
                sourceMode: sourceMode,
                syncStatus: syncStatus,
                syncAttempts: syncAttempts,
                lastSyncError: lastSyncError,
                serverId: serverId,
                orderNumber: orderNumber,
                createdAt: createdAt,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String clientTransactionId,
                Value<String?> supplierId = const Value.absent(),
                Value<String?> walkInName = const Value.absent(),
                required String paymentMethod,
                Value<double> paidAmount = const Value.absent(),
                Value<String> sourceMode = const Value.absent(),
                Value<String> syncStatus = const Value.absent(),
                Value<int> syncAttempts = const Value.absent(),
                Value<String?> lastSyncError = const Value.absent(),
                Value<String?> serverId = const Value.absent(),
                Value<String?> orderNumber = const Value.absent(),
                required DateTime createdAt,
                required DateTime updatedAt,
                Value<int> rowid = const Value.absent(),
              }) => LocalPurchasesCompanion.insert(
                clientTransactionId: clientTransactionId,
                supplierId: supplierId,
                walkInName: walkInName,
                paymentMethod: paymentMethod,
                paidAmount: paidAmount,
                sourceMode: sourceMode,
                syncStatus: syncStatus,
                syncAttempts: syncAttempts,
                lastSyncError: lastSyncError,
                serverId: serverId,
                orderNumber: orderNumber,
                createdAt: createdAt,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$LocalPurchasesTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({localPurchaseItemsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (localPurchaseItemsRefs) db.localPurchaseItems,
              ],
              addJoins: null,
              getPrefetchedDataCallback: (items) async {
                return [
                  if (localPurchaseItemsRefs)
                    await $_getPrefetchedData<
                      LocalPurchase,
                      $LocalPurchasesTable,
                      LocalPurchaseItem
                    >(
                      currentTable: table,
                      referencedTable: $$LocalPurchasesTableReferences
                          ._localPurchaseItemsRefsTable(db),
                      managerFromTypedResult: (p0) =>
                          $$LocalPurchasesTableReferences(
                            db,
                            table,
                            p0,
                          ).localPurchaseItemsRefs,
                      referencedItemsForCurrentItem: (item, referencedItems) =>
                          referencedItems.where(
                            (e) =>
                                e.clientTransactionId ==
                                item.clientTransactionId,
                          ),
                      typedResults: items,
                    ),
                ];
              },
            );
          },
        ),
      );
}

typedef $$LocalPurchasesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $LocalPurchasesTable,
      LocalPurchase,
      $$LocalPurchasesTableFilterComposer,
      $$LocalPurchasesTableOrderingComposer,
      $$LocalPurchasesTableAnnotationComposer,
      $$LocalPurchasesTableCreateCompanionBuilder,
      $$LocalPurchasesTableUpdateCompanionBuilder,
      (LocalPurchase, $$LocalPurchasesTableReferences),
      LocalPurchase,
      PrefetchHooks Function({bool localPurchaseItemsRefs})
    >;
typedef $$LocalPurchaseItemsTableCreateCompanionBuilder =
    LocalPurchaseItemsCompanion Function({
      Value<int> id,
      required String clientTransactionId,
      required String productId,
      Value<String?> productName,
      required double quantity,
      required double unitPrice,
    });
typedef $$LocalPurchaseItemsTableUpdateCompanionBuilder =
    LocalPurchaseItemsCompanion Function({
      Value<int> id,
      Value<String> clientTransactionId,
      Value<String> productId,
      Value<String?> productName,
      Value<double> quantity,
      Value<double> unitPrice,
    });

final class $$LocalPurchaseItemsTableReferences
    extends
        BaseReferences<
          _$AppDatabase,
          $LocalPurchaseItemsTable,
          LocalPurchaseItem
        > {
  $$LocalPurchaseItemsTableReferences(
    super.$_db,
    super.$_table,
    super.$_typedResult,
  );

  static $LocalPurchasesTable _clientTransactionIdTable(
    _$AppDatabase db,
  ) => db.localPurchases.createAlias(
    'local_purchase_items__client_transaction_id__local_purchases__client_transaction_id',
  );

  $$LocalPurchasesTableProcessedTableManager get clientTransactionId {
    final $_column = $_itemColumn<String>('client_transaction_id')!;

    final manager = $$LocalPurchasesTableTableManager(
      $_db,
      $_db.localPurchases,
    ).filter((f) => f.clientTransactionId.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_clientTransactionIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }
}

class $$LocalPurchaseItemsTableFilterComposer
    extends Composer<_$AppDatabase, $LocalPurchaseItemsTable> {
  $$LocalPurchaseItemsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get productId => $composableBuilder(
    column: $table.productId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get productName => $composableBuilder(
    column: $table.productName,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get quantity => $composableBuilder(
    column: $table.quantity,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get unitPrice => $composableBuilder(
    column: $table.unitPrice,
    builder: (column) => ColumnFilters(column),
  );

  $$LocalPurchasesTableFilterComposer get clientTransactionId {
    final $$LocalPurchasesTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.clientTransactionId,
      referencedTable: $db.localPurchases,
      getReferencedColumn: (t) => t.clientTransactionId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$LocalPurchasesTableFilterComposer(
            $db: $db,
            $table: $db.localPurchases,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$LocalPurchaseItemsTableOrderingComposer
    extends Composer<_$AppDatabase, $LocalPurchaseItemsTable> {
  $$LocalPurchaseItemsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get productId => $composableBuilder(
    column: $table.productId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get productName => $composableBuilder(
    column: $table.productName,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get quantity => $composableBuilder(
    column: $table.quantity,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get unitPrice => $composableBuilder(
    column: $table.unitPrice,
    builder: (column) => ColumnOrderings(column),
  );

  $$LocalPurchasesTableOrderingComposer get clientTransactionId {
    final $$LocalPurchasesTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.clientTransactionId,
      referencedTable: $db.localPurchases,
      getReferencedColumn: (t) => t.clientTransactionId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$LocalPurchasesTableOrderingComposer(
            $db: $db,
            $table: $db.localPurchases,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$LocalPurchaseItemsTableAnnotationComposer
    extends Composer<_$AppDatabase, $LocalPurchaseItemsTable> {
  $$LocalPurchaseItemsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get productId =>
      $composableBuilder(column: $table.productId, builder: (column) => column);

  GeneratedColumn<String> get productName => $composableBuilder(
    column: $table.productName,
    builder: (column) => column,
  );

  GeneratedColumn<double> get quantity =>
      $composableBuilder(column: $table.quantity, builder: (column) => column);

  GeneratedColumn<double> get unitPrice =>
      $composableBuilder(column: $table.unitPrice, builder: (column) => column);

  $$LocalPurchasesTableAnnotationComposer get clientTransactionId {
    final $$LocalPurchasesTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.clientTransactionId,
      referencedTable: $db.localPurchases,
      getReferencedColumn: (t) => t.clientTransactionId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$LocalPurchasesTableAnnotationComposer(
            $db: $db,
            $table: $db.localPurchases,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$LocalPurchaseItemsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $LocalPurchaseItemsTable,
          LocalPurchaseItem,
          $$LocalPurchaseItemsTableFilterComposer,
          $$LocalPurchaseItemsTableOrderingComposer,
          $$LocalPurchaseItemsTableAnnotationComposer,
          $$LocalPurchaseItemsTableCreateCompanionBuilder,
          $$LocalPurchaseItemsTableUpdateCompanionBuilder,
          (LocalPurchaseItem, $$LocalPurchaseItemsTableReferences),
          LocalPurchaseItem,
          PrefetchHooks Function({bool clientTransactionId})
        > {
  $$LocalPurchaseItemsTableTableManager(
    _$AppDatabase db,
    $LocalPurchaseItemsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$LocalPurchaseItemsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$LocalPurchaseItemsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$LocalPurchaseItemsTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> clientTransactionId = const Value.absent(),
                Value<String> productId = const Value.absent(),
                Value<String?> productName = const Value.absent(),
                Value<double> quantity = const Value.absent(),
                Value<double> unitPrice = const Value.absent(),
              }) => LocalPurchaseItemsCompanion(
                id: id,
                clientTransactionId: clientTransactionId,
                productId: productId,
                productName: productName,
                quantity: quantity,
                unitPrice: unitPrice,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String clientTransactionId,
                required String productId,
                Value<String?> productName = const Value.absent(),
                required double quantity,
                required double unitPrice,
              }) => LocalPurchaseItemsCompanion.insert(
                id: id,
                clientTransactionId: clientTransactionId,
                productId: productId,
                productName: productName,
                quantity: quantity,
                unitPrice: unitPrice,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$LocalPurchaseItemsTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({clientTransactionId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins:
                  <
                    T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic
                    >
                  >(state) {
                    if (clientTransactionId) {
                      state =
                          state.withJoin(
                                currentTable: table,
                                currentColumn: table.clientTransactionId,
                                referencedTable:
                                    $$LocalPurchaseItemsTableReferences
                                        ._clientTransactionIdTable(db),
                                referencedColumn:
                                    $$LocalPurchaseItemsTableReferences
                                        ._clientTransactionIdTable(db)
                                        .clientTransactionId,
                              )
                              as T;
                    }

                    return state;
                  },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ),
      );
}

typedef $$LocalPurchaseItemsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $LocalPurchaseItemsTable,
      LocalPurchaseItem,
      $$LocalPurchaseItemsTableFilterComposer,
      $$LocalPurchaseItemsTableOrderingComposer,
      $$LocalPurchaseItemsTableAnnotationComposer,
      $$LocalPurchaseItemsTableCreateCompanionBuilder,
      $$LocalPurchaseItemsTableUpdateCompanionBuilder,
      (LocalPurchaseItem, $$LocalPurchaseItemsTableReferences),
      LocalPurchaseItem,
      PrefetchHooks Function({bool clientTransactionId})
    >;
typedef $$LocalSalesTableCreateCompanionBuilder =
    LocalSalesCompanion Function({
      required String clientTransactionId,
      required String warehouseId,
      Value<String?> warehouseName,
      Value<String?> customerId,
      Value<String?> customerName,
      required String paymentMethod,
      Value<double> paidAmount,
      Value<String> sourceMode,
      Value<String> syncStatus,
      Value<int> syncAttempts,
      Value<String?> lastSyncError,
      Value<String?> serverId,
      Value<String?> invoiceNumber,
      required DateTime createdAt,
      required DateTime updatedAt,
      Value<int> rowid,
    });
typedef $$LocalSalesTableUpdateCompanionBuilder =
    LocalSalesCompanion Function({
      Value<String> clientTransactionId,
      Value<String> warehouseId,
      Value<String?> warehouseName,
      Value<String?> customerId,
      Value<String?> customerName,
      Value<String> paymentMethod,
      Value<double> paidAmount,
      Value<String> sourceMode,
      Value<String> syncStatus,
      Value<int> syncAttempts,
      Value<String?> lastSyncError,
      Value<String?> serverId,
      Value<String?> invoiceNumber,
      Value<DateTime> createdAt,
      Value<DateTime> updatedAt,
      Value<int> rowid,
    });

final class $$LocalSalesTableReferences
    extends BaseReferences<_$AppDatabase, $LocalSalesTable, LocalSale> {
  $$LocalSalesTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static MultiTypedResultKey<$LocalSaleItemsTable, List<LocalSaleItem>>
  _localSaleItemsRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
    db.localSaleItems,
    aliasName:
        'local_sales__client_transaction_id__local_sale_items__client_transaction_id',
  );

  $$LocalSaleItemsTableProcessedTableManager get localSaleItemsRefs {
    final manager = $$LocalSaleItemsTableTableManager($_db, $_db.localSaleItems)
        .filter(
          (f) => f.clientTransactionId.clientTransactionId.sqlEquals(
            $_itemColumn<String>('client_transaction_id')!,
          ),
        );

    final cache = $_typedResult.readTableOrNull(_localSaleItemsRefsTable($_db));
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }
}

class $$LocalSalesTableFilterComposer
    extends Composer<_$AppDatabase, $LocalSalesTable> {
  $$LocalSalesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get clientTransactionId => $composableBuilder(
    column: $table.clientTransactionId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get warehouseId => $composableBuilder(
    column: $table.warehouseId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get warehouseName => $composableBuilder(
    column: $table.warehouseName,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get customerId => $composableBuilder(
    column: $table.customerId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get customerName => $composableBuilder(
    column: $table.customerName,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get paymentMethod => $composableBuilder(
    column: $table.paymentMethod,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get paidAmount => $composableBuilder(
    column: $table.paidAmount,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get sourceMode => $composableBuilder(
    column: $table.sourceMode,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get syncAttempts => $composableBuilder(
    column: $table.syncAttempts,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get lastSyncError => $composableBuilder(
    column: $table.lastSyncError,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get serverId => $composableBuilder(
    column: $table.serverId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get invoiceNumber => $composableBuilder(
    column: $table.invoiceNumber,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );

  Expression<bool> localSaleItemsRefs(
    Expression<bool> Function($$LocalSaleItemsTableFilterComposer f) f,
  ) {
    final $$LocalSaleItemsTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.clientTransactionId,
      referencedTable: $db.localSaleItems,
      getReferencedColumn: (t) => t.clientTransactionId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$LocalSaleItemsTableFilterComposer(
            $db: $db,
            $table: $db.localSaleItems,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$LocalSalesTableOrderingComposer
    extends Composer<_$AppDatabase, $LocalSalesTable> {
  $$LocalSalesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get clientTransactionId => $composableBuilder(
    column: $table.clientTransactionId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get warehouseId => $composableBuilder(
    column: $table.warehouseId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get warehouseName => $composableBuilder(
    column: $table.warehouseName,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get customerId => $composableBuilder(
    column: $table.customerId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get customerName => $composableBuilder(
    column: $table.customerName,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get paymentMethod => $composableBuilder(
    column: $table.paymentMethod,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get paidAmount => $composableBuilder(
    column: $table.paidAmount,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get sourceMode => $composableBuilder(
    column: $table.sourceMode,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get syncAttempts => $composableBuilder(
    column: $table.syncAttempts,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get lastSyncError => $composableBuilder(
    column: $table.lastSyncError,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get serverId => $composableBuilder(
    column: $table.serverId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get invoiceNumber => $composableBuilder(
    column: $table.invoiceNumber,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$LocalSalesTableAnnotationComposer
    extends Composer<_$AppDatabase, $LocalSalesTable> {
  $$LocalSalesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get clientTransactionId => $composableBuilder(
    column: $table.clientTransactionId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get warehouseId => $composableBuilder(
    column: $table.warehouseId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get warehouseName => $composableBuilder(
    column: $table.warehouseName,
    builder: (column) => column,
  );

  GeneratedColumn<String> get customerId => $composableBuilder(
    column: $table.customerId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get customerName => $composableBuilder(
    column: $table.customerName,
    builder: (column) => column,
  );

  GeneratedColumn<String> get paymentMethod => $composableBuilder(
    column: $table.paymentMethod,
    builder: (column) => column,
  );

  GeneratedColumn<double> get paidAmount => $composableBuilder(
    column: $table.paidAmount,
    builder: (column) => column,
  );

  GeneratedColumn<String> get sourceMode => $composableBuilder(
    column: $table.sourceMode,
    builder: (column) => column,
  );

  GeneratedColumn<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => column,
  );

  GeneratedColumn<int> get syncAttempts => $composableBuilder(
    column: $table.syncAttempts,
    builder: (column) => column,
  );

  GeneratedColumn<String> get lastSyncError => $composableBuilder(
    column: $table.lastSyncError,
    builder: (column) => column,
  );

  GeneratedColumn<String> get serverId =>
      $composableBuilder(column: $table.serverId, builder: (column) => column);

  GeneratedColumn<String> get invoiceNumber => $composableBuilder(
    column: $table.invoiceNumber,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  Expression<T> localSaleItemsRefs<T extends Object>(
    Expression<T> Function($$LocalSaleItemsTableAnnotationComposer a) f,
  ) {
    final $$LocalSaleItemsTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.clientTransactionId,
      referencedTable: $db.localSaleItems,
      getReferencedColumn: (t) => t.clientTransactionId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$LocalSaleItemsTableAnnotationComposer(
            $db: $db,
            $table: $db.localSaleItems,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$LocalSalesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $LocalSalesTable,
          LocalSale,
          $$LocalSalesTableFilterComposer,
          $$LocalSalesTableOrderingComposer,
          $$LocalSalesTableAnnotationComposer,
          $$LocalSalesTableCreateCompanionBuilder,
          $$LocalSalesTableUpdateCompanionBuilder,
          (LocalSale, $$LocalSalesTableReferences),
          LocalSale,
          PrefetchHooks Function({bool localSaleItemsRefs})
        > {
  $$LocalSalesTableTableManager(_$AppDatabase db, $LocalSalesTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$LocalSalesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$LocalSalesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$LocalSalesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> clientTransactionId = const Value.absent(),
                Value<String> warehouseId = const Value.absent(),
                Value<String?> warehouseName = const Value.absent(),
                Value<String?> customerId = const Value.absent(),
                Value<String?> customerName = const Value.absent(),
                Value<String> paymentMethod = const Value.absent(),
                Value<double> paidAmount = const Value.absent(),
                Value<String> sourceMode = const Value.absent(),
                Value<String> syncStatus = const Value.absent(),
                Value<int> syncAttempts = const Value.absent(),
                Value<String?> lastSyncError = const Value.absent(),
                Value<String?> serverId = const Value.absent(),
                Value<String?> invoiceNumber = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<DateTime> updatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => LocalSalesCompanion(
                clientTransactionId: clientTransactionId,
                warehouseId: warehouseId,
                warehouseName: warehouseName,
                customerId: customerId,
                customerName: customerName,
                paymentMethod: paymentMethod,
                paidAmount: paidAmount,
                sourceMode: sourceMode,
                syncStatus: syncStatus,
                syncAttempts: syncAttempts,
                lastSyncError: lastSyncError,
                serverId: serverId,
                invoiceNumber: invoiceNumber,
                createdAt: createdAt,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String clientTransactionId,
                required String warehouseId,
                Value<String?> warehouseName = const Value.absent(),
                Value<String?> customerId = const Value.absent(),
                Value<String?> customerName = const Value.absent(),
                required String paymentMethod,
                Value<double> paidAmount = const Value.absent(),
                Value<String> sourceMode = const Value.absent(),
                Value<String> syncStatus = const Value.absent(),
                Value<int> syncAttempts = const Value.absent(),
                Value<String?> lastSyncError = const Value.absent(),
                Value<String?> serverId = const Value.absent(),
                Value<String?> invoiceNumber = const Value.absent(),
                required DateTime createdAt,
                required DateTime updatedAt,
                Value<int> rowid = const Value.absent(),
              }) => LocalSalesCompanion.insert(
                clientTransactionId: clientTransactionId,
                warehouseId: warehouseId,
                warehouseName: warehouseName,
                customerId: customerId,
                customerName: customerName,
                paymentMethod: paymentMethod,
                paidAmount: paidAmount,
                sourceMode: sourceMode,
                syncStatus: syncStatus,
                syncAttempts: syncAttempts,
                lastSyncError: lastSyncError,
                serverId: serverId,
                invoiceNumber: invoiceNumber,
                createdAt: createdAt,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$LocalSalesTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({localSaleItemsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (localSaleItemsRefs) db.localSaleItems,
              ],
              addJoins: null,
              getPrefetchedDataCallback: (items) async {
                return [
                  if (localSaleItemsRefs)
                    await $_getPrefetchedData<
                      LocalSale,
                      $LocalSalesTable,
                      LocalSaleItem
                    >(
                      currentTable: table,
                      referencedTable: $$LocalSalesTableReferences
                          ._localSaleItemsRefsTable(db),
                      managerFromTypedResult: (p0) =>
                          $$LocalSalesTableReferences(
                            db,
                            table,
                            p0,
                          ).localSaleItemsRefs,
                      referencedItemsForCurrentItem: (item, referencedItems) =>
                          referencedItems.where(
                            (e) =>
                                e.clientTransactionId ==
                                item.clientTransactionId,
                          ),
                      typedResults: items,
                    ),
                ];
              },
            );
          },
        ),
      );
}

typedef $$LocalSalesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $LocalSalesTable,
      LocalSale,
      $$LocalSalesTableFilterComposer,
      $$LocalSalesTableOrderingComposer,
      $$LocalSalesTableAnnotationComposer,
      $$LocalSalesTableCreateCompanionBuilder,
      $$LocalSalesTableUpdateCompanionBuilder,
      (LocalSale, $$LocalSalesTableReferences),
      LocalSale,
      PrefetchHooks Function({bool localSaleItemsRefs})
    >;
typedef $$LocalSaleItemsTableCreateCompanionBuilder =
    LocalSaleItemsCompanion Function({
      Value<int> id,
      required String clientTransactionId,
      required String productId,
      Value<String?> productName,
      required double quantity,
      required double unitPrice,
    });
typedef $$LocalSaleItemsTableUpdateCompanionBuilder =
    LocalSaleItemsCompanion Function({
      Value<int> id,
      Value<String> clientTransactionId,
      Value<String> productId,
      Value<String?> productName,
      Value<double> quantity,
      Value<double> unitPrice,
    });

final class $$LocalSaleItemsTableReferences
    extends BaseReferences<_$AppDatabase, $LocalSaleItemsTable, LocalSaleItem> {
  $$LocalSaleItemsTableReferences(
    super.$_db,
    super.$_table,
    super.$_typedResult,
  );

  static $LocalSalesTable _clientTransactionIdTable(
    _$AppDatabase db,
  ) => db.localSales.createAlias(
    'local_sale_items__client_transaction_id__local_sales__client_transaction_id',
  );

  $$LocalSalesTableProcessedTableManager get clientTransactionId {
    final $_column = $_itemColumn<String>('client_transaction_id')!;

    final manager = $$LocalSalesTableTableManager(
      $_db,
      $_db.localSales,
    ).filter((f) => f.clientTransactionId.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_clientTransactionIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }
}

class $$LocalSaleItemsTableFilterComposer
    extends Composer<_$AppDatabase, $LocalSaleItemsTable> {
  $$LocalSaleItemsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get productId => $composableBuilder(
    column: $table.productId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get productName => $composableBuilder(
    column: $table.productName,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get quantity => $composableBuilder(
    column: $table.quantity,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get unitPrice => $composableBuilder(
    column: $table.unitPrice,
    builder: (column) => ColumnFilters(column),
  );

  $$LocalSalesTableFilterComposer get clientTransactionId {
    final $$LocalSalesTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.clientTransactionId,
      referencedTable: $db.localSales,
      getReferencedColumn: (t) => t.clientTransactionId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$LocalSalesTableFilterComposer(
            $db: $db,
            $table: $db.localSales,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$LocalSaleItemsTableOrderingComposer
    extends Composer<_$AppDatabase, $LocalSaleItemsTable> {
  $$LocalSaleItemsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get productId => $composableBuilder(
    column: $table.productId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get productName => $composableBuilder(
    column: $table.productName,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get quantity => $composableBuilder(
    column: $table.quantity,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get unitPrice => $composableBuilder(
    column: $table.unitPrice,
    builder: (column) => ColumnOrderings(column),
  );

  $$LocalSalesTableOrderingComposer get clientTransactionId {
    final $$LocalSalesTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.clientTransactionId,
      referencedTable: $db.localSales,
      getReferencedColumn: (t) => t.clientTransactionId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$LocalSalesTableOrderingComposer(
            $db: $db,
            $table: $db.localSales,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$LocalSaleItemsTableAnnotationComposer
    extends Composer<_$AppDatabase, $LocalSaleItemsTable> {
  $$LocalSaleItemsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get productId =>
      $composableBuilder(column: $table.productId, builder: (column) => column);

  GeneratedColumn<String> get productName => $composableBuilder(
    column: $table.productName,
    builder: (column) => column,
  );

  GeneratedColumn<double> get quantity =>
      $composableBuilder(column: $table.quantity, builder: (column) => column);

  GeneratedColumn<double> get unitPrice =>
      $composableBuilder(column: $table.unitPrice, builder: (column) => column);

  $$LocalSalesTableAnnotationComposer get clientTransactionId {
    final $$LocalSalesTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.clientTransactionId,
      referencedTable: $db.localSales,
      getReferencedColumn: (t) => t.clientTransactionId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$LocalSalesTableAnnotationComposer(
            $db: $db,
            $table: $db.localSales,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$LocalSaleItemsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $LocalSaleItemsTable,
          LocalSaleItem,
          $$LocalSaleItemsTableFilterComposer,
          $$LocalSaleItemsTableOrderingComposer,
          $$LocalSaleItemsTableAnnotationComposer,
          $$LocalSaleItemsTableCreateCompanionBuilder,
          $$LocalSaleItemsTableUpdateCompanionBuilder,
          (LocalSaleItem, $$LocalSaleItemsTableReferences),
          LocalSaleItem,
          PrefetchHooks Function({bool clientTransactionId})
        > {
  $$LocalSaleItemsTableTableManager(
    _$AppDatabase db,
    $LocalSaleItemsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$LocalSaleItemsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$LocalSaleItemsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$LocalSaleItemsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> clientTransactionId = const Value.absent(),
                Value<String> productId = const Value.absent(),
                Value<String?> productName = const Value.absent(),
                Value<double> quantity = const Value.absent(),
                Value<double> unitPrice = const Value.absent(),
              }) => LocalSaleItemsCompanion(
                id: id,
                clientTransactionId: clientTransactionId,
                productId: productId,
                productName: productName,
                quantity: quantity,
                unitPrice: unitPrice,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String clientTransactionId,
                required String productId,
                Value<String?> productName = const Value.absent(),
                required double quantity,
                required double unitPrice,
              }) => LocalSaleItemsCompanion.insert(
                id: id,
                clientTransactionId: clientTransactionId,
                productId: productId,
                productName: productName,
                quantity: quantity,
                unitPrice: unitPrice,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$LocalSaleItemsTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({clientTransactionId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins:
                  <
                    T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic
                    >
                  >(state) {
                    if (clientTransactionId) {
                      state =
                          state.withJoin(
                                currentTable: table,
                                currentColumn: table.clientTransactionId,
                                referencedTable: $$LocalSaleItemsTableReferences
                                    ._clientTransactionIdTable(db),
                                referencedColumn:
                                    $$LocalSaleItemsTableReferences
                                        ._clientTransactionIdTable(db)
                                        .clientTransactionId,
                              )
                              as T;
                    }

                    return state;
                  },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ),
      );
}

typedef $$LocalSaleItemsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $LocalSaleItemsTable,
      LocalSaleItem,
      $$LocalSaleItemsTableFilterComposer,
      $$LocalSaleItemsTableOrderingComposer,
      $$LocalSaleItemsTableAnnotationComposer,
      $$LocalSaleItemsTableCreateCompanionBuilder,
      $$LocalSaleItemsTableUpdateCompanionBuilder,
      (LocalSaleItem, $$LocalSaleItemsTableReferences),
      LocalSaleItem,
      PrefetchHooks Function({bool clientTransactionId})
    >;
typedef $$SyncMetadataTableCreateCompanionBuilder =
    SyncMetadataCompanion Function({
      required String key,
      required String value,
      Value<int> rowid,
    });
typedef $$SyncMetadataTableUpdateCompanionBuilder =
    SyncMetadataCompanion Function({
      Value<String> key,
      Value<String> value,
      Value<int> rowid,
    });

class $$SyncMetadataTableFilterComposer
    extends Composer<_$AppDatabase, $SyncMetadataTable> {
  $$SyncMetadataTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get key => $composableBuilder(
    column: $table.key,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get value => $composableBuilder(
    column: $table.value,
    builder: (column) => ColumnFilters(column),
  );
}

class $$SyncMetadataTableOrderingComposer
    extends Composer<_$AppDatabase, $SyncMetadataTable> {
  $$SyncMetadataTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get key => $composableBuilder(
    column: $table.key,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get value => $composableBuilder(
    column: $table.value,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$SyncMetadataTableAnnotationComposer
    extends Composer<_$AppDatabase, $SyncMetadataTable> {
  $$SyncMetadataTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get key =>
      $composableBuilder(column: $table.key, builder: (column) => column);

  GeneratedColumn<String> get value =>
      $composableBuilder(column: $table.value, builder: (column) => column);
}

class $$SyncMetadataTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $SyncMetadataTable,
          SyncMetadataData,
          $$SyncMetadataTableFilterComposer,
          $$SyncMetadataTableOrderingComposer,
          $$SyncMetadataTableAnnotationComposer,
          $$SyncMetadataTableCreateCompanionBuilder,
          $$SyncMetadataTableUpdateCompanionBuilder,
          (
            SyncMetadataData,
            BaseReferences<_$AppDatabase, $SyncMetadataTable, SyncMetadataData>,
          ),
          SyncMetadataData,
          PrefetchHooks Function()
        > {
  $$SyncMetadataTableTableManager(_$AppDatabase db, $SyncMetadataTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SyncMetadataTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SyncMetadataTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SyncMetadataTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> key = const Value.absent(),
                Value<String> value = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => SyncMetadataCompanion(key: key, value: value, rowid: rowid),
          createCompanionCallback:
              ({
                required String key,
                required String value,
                Value<int> rowid = const Value.absent(),
              }) => SyncMetadataCompanion.insert(
                key: key,
                value: value,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$SyncMetadataTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $SyncMetadataTable,
      SyncMetadataData,
      $$SyncMetadataTableFilterComposer,
      $$SyncMetadataTableOrderingComposer,
      $$SyncMetadataTableAnnotationComposer,
      $$SyncMetadataTableCreateCompanionBuilder,
      $$SyncMetadataTableUpdateCompanionBuilder,
      (
        SyncMetadataData,
        BaseReferences<_$AppDatabase, $SyncMetadataTable, SyncMetadataData>,
      ),
      SyncMetadataData,
      PrefetchHooks Function()
    >;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$ProductsCacheTableTableManager get productsCache =>
      $$ProductsCacheTableTableManager(_db, _db.productsCache);
  $$WarehousesCacheTableTableManager get warehousesCache =>
      $$WarehousesCacheTableTableManager(_db, _db.warehousesCache);
  $$SuppliersCacheTableTableManager get suppliersCache =>
      $$SuppliersCacheTableTableManager(_db, _db.suppliersCache);
  $$PaymentMethodsCacheTableTableManager get paymentMethodsCache =>
      $$PaymentMethodsCacheTableTableManager(_db, _db.paymentMethodsCache);
  $$CustomersCacheTableTableManager get customersCache =>
      $$CustomersCacheTableTableManager(_db, _db.customersCache);
  $$InventoryCacheTableTableManager get inventoryCache =>
      $$InventoryCacheTableTableManager(_db, _db.inventoryCache);
  $$LocalPurchasesTableTableManager get localPurchases =>
      $$LocalPurchasesTableTableManager(_db, _db.localPurchases);
  $$LocalPurchaseItemsTableTableManager get localPurchaseItems =>
      $$LocalPurchaseItemsTableTableManager(_db, _db.localPurchaseItems);
  $$LocalSalesTableTableManager get localSales =>
      $$LocalSalesTableTableManager(_db, _db.localSales);
  $$LocalSaleItemsTableTableManager get localSaleItems =>
      $$LocalSaleItemsTableTableManager(_db, _db.localSaleItems);
  $$SyncMetadataTableTableManager get syncMetadata =>
      $$SyncMetadataTableTableManager(_db, _db.syncMetadata);
}
