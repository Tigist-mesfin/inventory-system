import 'package:drift/drift.dart';

class ProductsCache extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get sku => text().nullable()();
  TextColumn get unit => text()();
  RealColumn get purchasePrice => real().withDefault(const Constant(0))();
  RealColumn get sellingPrice => real().withDefault(const Constant(0))();
  TextColumn get brand => text().nullable()();
  DateTimeColumn get syncedAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class WarehousesCache extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get code => text().nullable()();
  DateTimeColumn get syncedAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class SuppliersCache extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  DateTimeColumn get syncedAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class PaymentMethodsCache extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  DateTimeColumn get syncedAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class CustomersCache extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get phone => text().nullable()();
  DateTimeColumn get syncedAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class InventoryCache extends Table {
  TextColumn get productId => text()();
  TextColumn get warehouseId => text()();
  RealColumn get quantity => real().withDefault(const Constant(0))();
  RealColumn get available => real().withDefault(const Constant(0))();
  DateTimeColumn get syncedAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {productId, warehouseId};
}

class LocalPurchases extends Table {
  TextColumn get clientTransactionId => text()();
  TextColumn get supplierId => text().nullable()();
  TextColumn get walkInName => text().nullable()();
  TextColumn get paymentMethod => text()();
  RealColumn get paidAmount => real().withDefault(const Constant(0))();
  TextColumn get sourceMode => text().withDefault(const Constant('OFFLINE'))();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();
  IntColumn get syncAttempts => integer().withDefault(const Constant(0))();
  TextColumn get lastSyncError => text().nullable()();
  TextColumn get serverId => text().nullable()();
  TextColumn get orderNumber => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {clientTransactionId};
}

class LocalPurchaseItems extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get clientTransactionId => text().references(LocalPurchases, #clientTransactionId)();
  TextColumn get productId => text()();
  TextColumn get productName => text().nullable()();
  RealColumn get quantity => real()();
  RealColumn get unitPrice => real()();
}

class LocalSales extends Table {
  TextColumn get clientTransactionId => text()();
  TextColumn get warehouseId => text()();
  TextColumn get warehouseName => text().nullable()();
  TextColumn get customerId => text().nullable()();
  TextColumn get customerName => text().nullable()();
  TextColumn get paymentMethod => text()();
  RealColumn get paidAmount => real().withDefault(const Constant(0))();
  TextColumn get sourceMode => text().withDefault(const Constant('OFFLINE'))();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();
  IntColumn get syncAttempts => integer().withDefault(const Constant(0))();
  TextColumn get lastSyncError => text().nullable()();
  TextColumn get serverId => text().nullable()();
  TextColumn get invoiceNumber => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {clientTransactionId};
}

class LocalSaleItems extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get clientTransactionId => text().references(LocalSales, #clientTransactionId)();
  TextColumn get productId => text()();
  TextColumn get productName => text().nullable()();
  RealColumn get quantity => real()();
  RealColumn get unitPrice => real()();
}

class SyncMetadata extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();

  @override
  Set<Column<Object>> get primaryKey => {key};
}
