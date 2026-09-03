import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../../../constants/sync_status.dart';
import '../../../database/app_database.dart';
import '../../../models/server_list_models.dart';
import '../../../network/api_endpoints.dart';
import '../../../network/dio_client.dart';

class PurchaseFilters {
  const PurchaseFilters({
    this.from = '',
    this.to = '',
    this.productId = '',
    this.paymentMethod = '',
    this.createdBy = '',
  });

  final String from;
  final String to;
  final String productId;
  final String paymentMethod;
  final String createdBy;

  PurchaseFilters copyWith({
    String? from,
    String? to,
    String? productId,
    String? paymentMethod,
    String? createdBy,
  }) {
    return PurchaseFilters(
      from: from ?? this.from,
      to: to ?? this.to,
      productId: productId ?? this.productId,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      createdBy: createdBy ?? this.createdBy,
    );
  }

  Map<String, dynamic> toQuery() {
    final query = <String, dynamic>{'limit': 100};
    if (from.isNotEmpty) query['from'] = from;
    if (to.isNotEmpty) query['to'] = to;
    if (productId.isNotEmpty) query['productId'] = productId;
    if (paymentMethod.isNotEmpty) query['paymentMethod'] = paymentMethod;
    if (createdBy.isNotEmpty) query['createdBy'] = createdBy;
    return query;
  }
}

class PurchaseService {
  PurchaseService({
    required AppDatabase db,
    required DioClient client,
    required Uuid uuid,
  })  : _db = db,
        _client = client,
        _uuid = uuid;

  final AppDatabase _db;
  final DioClient _client;
  final Uuid _uuid;

  Future<String> createPurchase({
    required bool online,
    String? supplierId,
    String? walkInName,
    required String paymentMethod,
    required double paidAmount,
    required List<PurchaseLineInput> items,
  }) async {
    final clientTransactionId = _uuid.v4();
    final sourceMode = online ? SourceMode.online : SourceMode.offline;

    if (online) {
      final response = await _client.post(
        ApiEndpoints.purchaseOrders,
        body: {
          if (supplierId != null) 'supplierId': supplierId,
          if (walkInName != null && walkInName.isNotEmpty)
            'walkInName': walkInName,
          'paymentMethod': paymentMethod,
          'paidAmount': paidAmount,
          'clientTransactionId': clientTransactionId,
          'sourceMode': sourceMode,
          'items': items
              .map(
                (line) => {
                  'productId': line.productId,
                  'quantity': line.quantity,
                  'unitPrice': line.unitPrice,
                },
              )
              .toList(),
        },
      );
      final po = response['data']?['purchaseOrder'] as Map<String, dynamic>?;
      return po?['id']?.toString() ?? clientTransactionId;
    }

    final now = DateTime.now();
    await _db.into(_db.localPurchases).insert(
          LocalPurchasesCompanion.insert(
            clientTransactionId: clientTransactionId,
            supplierId: Value(supplierId),
            walkInName: Value(walkInName),
            paymentMethod: paymentMethod,
            paidAmount: Value(paidAmount),
            sourceMode: Value(sourceMode),
            syncStatus: const Value(SyncStatus.pending),
            createdAt: now,
            updatedAt: now,
          ),
        );
    for (final line in items) {
      await _db.into(_db.localPurchaseItems).insert(
            LocalPurchaseItemsCompanion.insert(
              clientTransactionId: clientTransactionId,
              productId: line.productId,
              productName: Value(line.productName),
              quantity: line.quantity,
              unitPrice: line.unitPrice,
            ),
          );
    }
    return clientTransactionId;
  }

  Stream<List<LocalPurchase>> watchLocalPurchases() {
    return (_db.select(_db.localPurchases)
          ..orderBy([(t) => OrderingTerm.desc(t.createdAt)]))
        .watch();
  }

  Future<({List<ServerPurchaseLine> lines, PurchaseReportTotals totals})>
      fetchServerPurchases({PurchaseFilters filters = const PurchaseFilters()}) async {
    final response = await _client.get(
      ApiEndpoints.purchasesReport,
      query: filters.toQuery(),
    );
    final report = response['data']?['report'] as Map<String, dynamic>?;
    final lines =
        (report?['lines'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    return (
      lines: lines.map(ServerPurchaseLine.fromJson).toList(),
      totals: PurchaseReportTotals.fromJson(
        report?['totals'] is Map
            ? Map<String, dynamic>.from(report!['totals'] as Map)
            : null,
      ),
    );
  }

  Future<PurchaseDeliverySummary> fetchUndeliveredSummary() async {
    final response = await _client.get(ApiEndpoints.purchaseUndeliveredSummary);
    final data = response['data'];
    if (data is Map<String, dynamic>) {
      return PurchaseDeliverySummary.fromJson(data);
    }
    if (data is Map) {
      return PurchaseDeliverySummary.fromJson(Map<String, dynamic>.from(data));
    }
    return PurchaseDeliverySummary.empty();
  }

  Future<List<TeamSalesman>> fetchTeamSalesmen() async {
    final response = await _client.get(ApiEndpoints.team);
    final salesmen =
        (response['data']?['salesmen'] as List?)?.cast<Map<String, dynamic>>() ??
            [];
    return salesmen.map(TeamSalesman.fromJson).toList();
  }

  Future<void> updateItemDelivery({
    required String itemId,
    required String deliveryStatus,
    String? warehouseId,
    required double quantity,
  }) async {
    await _client.patch(
      ApiEndpoints.purchaseItem(itemId),
      body: {
        'deliveryStatus': deliveryStatus,
        if (warehouseId != null && warehouseId.isNotEmpty)
          'warehouseId': warehouseId,
        'quantity': quantity,
      },
    );
  }

  Future<void> recordPayment({
    required String purchaseOrderId,
    required double amount,
    required String paymentMethod,
  }) async {
    await _client.post(
      ApiEndpoints.purchasePayments(purchaseOrderId),
      body: {
        'amount': amount,
        'paymentMethod': paymentMethod,
      },
    );
  }

  Future<void> deliverAll({required String warehouseId}) async {
    await _client.post(
      ApiEndpoints.purchaseDeliverAll,
      body: {'warehouseId': warehouseId},
    );
  }

  Future<Map<String, dynamic>> syncPurchase(LocalPurchase purchase) async {
    final items = await (_db.select(_db.localPurchaseItems)
          ..where((t) => t.clientTransactionId.equals(purchase.clientTransactionId)))
        .get();
    final response = await _client.post(
      ApiEndpoints.purchaseOrders,
      body: {
        if (purchase.supplierId != null) 'supplierId': purchase.supplierId,
        if (purchase.walkInName != null && purchase.walkInName!.isNotEmpty)
          'walkInName': purchase.walkInName,
        'paymentMethod': purchase.paymentMethod,
        'paidAmount': purchase.paidAmount,
        'clientTransactionId': purchase.clientTransactionId,
        'sourceMode': purchase.sourceMode,
        'items': items
            .map(
              (line) => {
                'productId': line.productId,
                'quantity': line.quantity,
                'unitPrice': line.unitPrice,
              },
            )
            .toList(),
      },
    );
    return response['data']?['purchaseOrder'] as Map<String, dynamic>? ?? {};
  }

  Future<void> markPurchaseSynced(
    String clientTransactionId,
    Map<String, dynamic> serverPo,
  ) async {
    await (_db.update(_db.localPurchases)
          ..where((t) => t.clientTransactionId.equals(clientTransactionId)))
        .write(
      LocalPurchasesCompanion(
        syncStatus: const Value(SyncStatus.synced),
        serverId: Value(serverPo['id']?.toString()),
        orderNumber: Value(serverPo['orderNumber']?.toString()),
        lastSyncError: const Value(null),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  Future<void> markPurchaseFailed(String clientTransactionId, String error) async {
    final current = await (_db.select(_db.localPurchases)
          ..where((t) => t.clientTransactionId.equals(clientTransactionId)))
        .getSingle();
    await (_db.update(_db.localPurchases)
          ..where((t) => t.clientTransactionId.equals(clientTransactionId)))
        .write(
      LocalPurchasesCompanion(
        syncStatus: const Value(SyncStatus.failed),
        syncAttempts: Value(current.syncAttempts + 1),
        lastSyncError: Value(error),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  Future<void> markPurchaseSyncing(String clientTransactionId) async {
    await (_db.update(_db.localPurchases)
          ..where((t) => t.clientTransactionId.equals(clientTransactionId)))
        .write(
      LocalPurchasesCompanion(
        syncStatus: const Value(SyncStatus.syncing),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }
}

class PurchaseLineInput {
  PurchaseLineInput({
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
  });

  final String productId;
  final String productName;
  final double quantity;
  final double unitPrice;
}
