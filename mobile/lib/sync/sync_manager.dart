import 'package:drift/drift.dart';

import '../constants/sync_status.dart';
import '../core/errors/app_exception.dart';
import '../database/app_database.dart';
import '../modules/purchases/services/purchase_service.dart';
import '../modules/sales/services/sales_service.dart';
import '../network/api_endpoints.dart';
import '../network/dio_client.dart';
import '../services/cache_service.dart';
import 'connectivity_service.dart';

class SyncManager {
  SyncManager({
    required AppDatabase db,
    required ConnectivityService connectivity,
    required PurchaseService purchaseService,
    required SalesService salesService,
    required CacheService cacheService,
    required DioClient client,
  })  : _db = db,
        _connectivity = connectivity,
        _purchaseService = purchaseService,
        _salesService = salesService,
        _cacheService = cacheService,
        _client = client;

  final AppDatabase _db;
  final ConnectivityService _connectivity;
  final PurchaseService _purchaseService;
  final SalesService _salesService;
  final CacheService _cacheService;
  final DioClient _client;

  bool _running = false;

  Stream<int> watchPendingCount() async* {
    yield await _db.pendingCount();
    await for (final _ in _db.select(_db.localPurchases).watch()) {
      yield await _db.pendingCount();
    }
  }

  Stream<void> watchLocalChanges() async* {
    yield* _db.select(_db.localPurchases).watch().map((_) {});
    yield* _db.select(_db.localSales).watch().map((_) {});
  }

  Future<void> syncNow() async {
    if (_running) return;
    if (!await _connectivity.isOnline) return;
    _running = true;
    try {
      final purchases = await (_db.select(_db.localPurchases)
            ..where((t) => t.syncStatus.isIn([SyncStatus.pending, SyncStatus.failed]))
            ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
          .get();
      for (final purchase in purchases) {
        await _syncPurchase(purchase);
      }

      final sales = await (_db.select(_db.localSales)
            ..where((t) => t.syncStatus.isIn([SyncStatus.pending, SyncStatus.failed]))
            ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
          .get();
      for (final sale in sales) {
        await _syncSale(sale);
      }

      try {
        await _cacheService.refreshInventory();
      } catch (_) {
        // Post-sync inventory refresh is best-effort.
      }
    } finally {
      _running = false;
    }
  }

  Future<void> _syncPurchase(LocalPurchase purchase) async {
    await _purchaseService.markPurchaseSyncing(purchase.clientTransactionId);
    try {
      final serverPo =
          await _purchaseService.syncPurchase(purchase);
      await _purchaseService.markPurchaseSynced(
        purchase.clientTransactionId,
        serverPo,
      );
    } catch (error) {
      await _purchaseService.markPurchaseFailed(
        purchase.clientTransactionId,
        friendlyError(error),
      );
    }
  }

  Future<void> _syncSale(LocalSale sale) async {
    await _salesService.markSaleSyncing(sale.clientTransactionId);
    try {
      final serverSale = await _salesService.syncSale(sale);
      await _salesService.markSaleSynced(
        sale.clientTransactionId,
        serverSale,
      );
    } catch (error) {
      await _salesService.markSaleFailed(
        sale.clientTransactionId,
        friendlyError(error),
      );
    }
  }

  Future<Map<String, dynamic>?> fetchDashboard() async {
    if (!await _connectivity.isOnline) return null;
    final response = await _client.get(ApiEndpoints.dashboard);
    final data = response['data'];
    if (data is Map && data['dashboard'] is Map) {
      return Map<String, dynamic>.from(data['dashboard'] as Map);
    }
    if (data is Map<String, dynamic>) return data;
    return null;
  }
}
