import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import 'tables.dart';

part 'app_database.g.dart';

@DriftDatabase(tables: [
  ProductsCache,
  WarehousesCache,
  SuppliersCache,
  PaymentMethodsCache,
  CustomersCache,
  InventoryCache,
  LocalPurchases,
  LocalPurchaseItems,
  LocalSales,
  LocalSaleItems,
  SyncMetadata,
])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (Migrator m) async {
          await m.createAll();
        },
        onUpgrade: (Migrator m, int from, int to) async {
          if (from < 2) {
            await m.createTable(customersCache);
          }
        },
      );

  Future<String?> getMeta(String key) async {
    final row = await (select(syncMetadata)..where((t) => t.key.equals(key)))
        .getSingleOrNull();
    return row?.value;
  }

  Future<void> setMeta(String key, String value) async {
    await into(syncMetadata).insertOnConflictUpdate(
      SyncMetadataCompanion.insert(key: key, value: value),
    );
  }

  Future<int> pendingCount() async {
    final purchases = await (select(localPurchases)
          ..where((t) => t.syncStatus.isIn(['pending', 'failed'])))
        .get();
    final sales = await (select(localSales)
          ..where((t) => t.syncStatus.isIn(['pending', 'failed'])))
        .get();
    return purchases.length + sales.length;
  }
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File(p.join(dir.path, 'inventory_mobile.sqlite'));
    return NativeDatabase(file);
  });
}
