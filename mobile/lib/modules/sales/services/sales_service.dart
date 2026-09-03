import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../../../constants/sync_status.dart';
import '../../../database/app_database.dart';
import '../../../models/server_list_models.dart';
import '../../../network/api_endpoints.dart';
import '../../../network/dio_client.dart';
import '../../../services/cache_service.dart';

class SalesFilters {
  const SalesFilters({
    this.period = 'today',
    this.from = '',
    this.to = '',
    this.productId = '',
    this.customerId = '',
    this.paymentMethod = '',
    this.createdBy = '',
  });

  final String period;
  final String from;
  final String to;
  final String productId;
  final String customerId;
  final String paymentMethod;
  final String createdBy;

  SalesFilters copyWith({
    String? period,
    String? from,
    String? to,
    String? productId,
    String? customerId,
    String? paymentMethod,
    String? createdBy,
  }) {
    return SalesFilters(
      period: period ?? this.period,
      from: from ?? this.from,
      to: to ?? this.to,
      productId: productId ?? this.productId,
      customerId: customerId ?? this.customerId,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      createdBy: createdBy ?? this.createdBy,
    );
  }

  static String _pad(int n) => n.toString().padLeft(2, '0');

  static String isoLocal(DateTime date) =>
      '${date.year}-${_pad(date.month)}-${_pad(date.day)}';

  static ({String from, String to}) rangeFor(
    String period, {
    String from = '',
    String to = '',
  }) {
    final now = DateTime.now();
    final today = isoLocal(now);
    switch (period) {
      case 'today':
        return (from: today, to: today);
      case 'yesterday':
        final day = now.subtract(const Duration(days: 1));
        final key = isoLocal(day);
        return (from: key, to: key);
      case 'this_month':
        return (
          from: isoLocal(DateTime(now.year, now.month, 1)),
          to: today,
        );
      case 'this_year':
        return (from: isoLocal(DateTime(now.year, 1, 1)), to: today);
      case 'all':
        return (from: '', to: '');
      case 'custom':
      default:
        return (from: from, to: to);
    }
  }

  factory SalesFilters.initial() {
    final range = rangeFor('today');
    return SalesFilters(period: 'today', from: range.from, to: range.to);
  }

  Map<String, dynamic> toQuery() {
    final range = rangeFor(period, from: from, to: to);
    final query = <String, dynamic>{
      'limit': 500,
      'status': 'COMPLETED',
    };
    if (range.from.isNotEmpty) query['from'] = range.from;
    if (range.to.isNotEmpty) query['to'] = range.to;
    if (productId.isNotEmpty) query['productId'] = productId;
    if (createdBy.isNotEmpty) query['createdBy'] = createdBy;
    if (customerId.isNotEmpty && customerId != 'walkin') {
      query['customerId'] = customerId;
    }
    return query;
  }
}

class SaleMethodStat {
  SaleMethodStat({
    required this.name,
    required this.count,
    required this.qty,
    required this.total,
  });

  final String name;
  final int count;
  final double qty;
  final double total;
}

class SaleListTotals {
  const SaleListTotals({
    required this.count,
    required this.qtySold,
    required this.withoutVat,
    required this.withVat,
    required this.purchase,
  });

  final int count;
  final double qtySold;
  final double withoutVat;
  final double withVat;
  final double purchase;

  double get vat => withVat - withoutVat;
}

class SalesService {
  SalesService({
    required AppDatabase db,
    required DioClient client,
    required CacheService cacheService,
    required Uuid uuid,
  })  : _db = db,
        _client = client,
        _cacheService = cacheService,
        _uuid = uuid;

  final AppDatabase _db;
  final DioClient _client;
  final CacheService _cacheService;
  final Uuid _uuid;

  Future<String> createSale({
    required bool online,
    required String warehouseId,
    String? warehouseName,
    String? customerId,
    String? customerName,
    required String paymentMethod,
    required double paidAmount,
    required List<SaleLineInput> items,
  }) async {
    final clientTransactionId = _uuid.v4();
    final sourceMode = online ? SourceMode.online : SourceMode.offline;

    if (online) {
      final created = await _client.post(
        ApiEndpoints.sales,
        body: {
          'warehouseId': warehouseId,
          'customerId': customerId,
          if (customerName != null) 'customerName': customerName,
          'paymentMethod': paymentMethod,
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
      final draft = created['data']?['sale'] as Map<String, dynamic>?;
      final saleId = draft?['id']?.toString();
      if (saleId == null) throw Exception('Sale was not created');

      final completed = await _client.post(
        '${ApiEndpoints.sales}/$saleId/complete',
        body: {
          'paidAmount': paidAmount,
          'payFrom': 'DIRECT',
          'costingMethod': 'SIMPLE',
          'items': items
              .map(
                (line) => {
                  'productId': line.productId,
                  'costingMethod': 'SIMPLE',
                },
              )
              .toList(),
        },
      );
      final sale = completed['data']?['sale'] as Map<String, dynamic>?;
      return sale?['id']?.toString() ?? saleId;
    }

    for (final line in items) {
      final stock = await _cacheService.stockFor(line.productId, warehouseId);
      if (line.quantity > stock) {
        throw Exception('Insufficient stock for ${line.productName}');
      }
    }

    final now = DateTime.now();
    await _db.into(_db.localSales).insert(
          LocalSalesCompanion.insert(
            clientTransactionId: clientTransactionId,
            warehouseId: warehouseId,
            warehouseName: Value(warehouseName),
            customerId: Value(customerId),
            customerName: Value(customerName),
            paymentMethod: paymentMethod,
            paidAmount: Value(paidAmount),
            sourceMode: Value(sourceMode),
            syncStatus: const Value(SyncStatus.pending),
            createdAt: now,
            updatedAt: now,
          ),
        );
    for (final line in items) {
      await _db.into(_db.localSaleItems).insert(
            LocalSaleItemsCompanion.insert(
              clientTransactionId: clientTransactionId,
              productId: line.productId,
              productName: Value(line.productName),
              quantity: line.quantity,
              unitPrice: line.unitPrice,
            ),
          );
      await _cacheService.adjustLocalStock(
        productId: line.productId,
        warehouseId: warehouseId,
        delta: -line.quantity,
      );
    }
    return clientTransactionId;
  }

  Stream<List<LocalSale>> watchLocalSales() {
    return (_db.select(_db.localSales)
          ..orderBy([(t) => OrderingTerm.desc(t.createdAt)]))
        .watch();
  }

  Future<List<ServerSaleLine>> fetchServerSales({
    SalesFilters filters = const SalesFilters(),
  }) async {
    final lines = <ServerSaleLine>[];
    var page = 1;
    var totalPages = 1;
    final baseQuery = filters.toQuery();
    while (page <= totalPages && page <= 10) {
      final response = await _client.get(
        ApiEndpoints.sales,
        query: {...baseQuery, 'page': page},
      );
      final sales =
          (response['data']?['sales'] as List?)?.cast<Map<String, dynamic>>() ??
              [];
      for (final sale in sales) {
        if (filters.customerId == 'walkin' && sale['customerId'] != null) {
          continue;
        }
        final items =
            (sale['items'] as List?)?.cast<Map<String, dynamic>>() ?? [];
        if (items.isEmpty) {
          lines.add(
            ServerSaleLine.fromMaps(sale, {
              'id': '${sale['id']}-empty',
              'productId': null,
              'quantity': 0,
              'unitPrice': 0,
              'totalPrice': sale['subtotal'] ?? 0,
              'totalWithVat': sale['totalAmount'] ?? 0,
              'purchaseUnitCost': 0,
              'purchaseTotal': 0,
              'product': {'name': 'No line items', 'unit': ''},
            }),
          );
          continue;
        }
        for (final item in items) {
          if (filters.productId.isNotEmpty &&
              item['productId']?.toString() != filters.productId) {
            continue;
          }
          lines.add(ServerSaleLine.fromMaps(sale, item));
        }
      }
      final meta = response['meta'] as Map<String, dynamic>?;
      totalPages = parseServerInt(meta?['totalPages']).clamp(1, 10);
      if (totalPages < 1) totalPages = 1;
      page += 1;
    }

    if (filters.paymentMethod.isEmpty) return lines;
    return lines
        .where((line) => line.paymentMethod == filters.paymentMethod)
        .toList();
  }

  Future<List<TeamSalesman>> fetchTeamSalesmen() async {
    final response = await _client.get(ApiEndpoints.team);
    final salesmen =
        (response['data']?['salesmen'] as List?)?.cast<Map<String, dynamic>>() ??
            [];
    return salesmen.map(TeamSalesman.fromJson).toList();
  }

  Future<void> recordPayment({
    required String saleId,
    required double amount,
    required String paymentMethod,
  }) async {
    await _client.post(
      ApiEndpoints.salePayments(saleId),
      body: {
        'amount': amount,
        'paymentMethod': paymentMethod,
      },
    );
  }

  Future<void> cancelSale(String saleId) async {
    await _client.post(ApiEndpoints.saleCancel(saleId));
  }

  Future<Map<String, dynamic>> syncSale(LocalSale sale) async {
    var warehouseId = sale.warehouseId;
    if (warehouseId.startsWith('local:')) {
      final name = sale.warehouseName?.trim();
      if (name == null || name.isEmpty) {
        throw Exception('Warehouse name is required to sync this sale');
      }
      await _cacheService.refreshWarehouses();
      final resolved = await _cacheService.resolveWarehouseId(name);
      if (resolved == null || resolved.startsWith('local:')) {
        throw Exception(
          'Warehouse "$name" was not found on the server. Download warehouses while online.',
        );
      }
      warehouseId = resolved;
    }

    final items = await (_db.select(_db.localSaleItems)
          ..where((t) => t.clientTransactionId.equals(sale.clientTransactionId)))
        .get();
    final response = await _client.post(
      ApiEndpoints.salesSync,
      body: {
        'warehouseId': warehouseId,
        'customerId': sale.customerId,
        if (sale.customerName != null) 'customerName': sale.customerName,
        'paymentMethod': sale.paymentMethod,
        'paidAmount': sale.paidAmount,
        'payFrom': 'DIRECT',
        'costingMethod': 'SIMPLE',
        'clientTransactionId': sale.clientTransactionId,
        'sourceMode': sale.sourceMode,
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
    return response['data']?['sale'] as Map<String, dynamic>? ?? {};
  }

  Future<void> markSaleSynced(
    String clientTransactionId,
    Map<String, dynamic> serverSale,
  ) async {
    await (_db.update(_db.localSales)
          ..where((t) => t.clientTransactionId.equals(clientTransactionId)))
        .write(
      LocalSalesCompanion(
        syncStatus: const Value(SyncStatus.synced),
        serverId: Value(serverSale['id']?.toString()),
        invoiceNumber: Value(serverSale['invoiceNumber']?.toString()),
        lastSyncError: const Value(null),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  Future<void> markSaleFailed(String clientTransactionId, String error) async {
    final current = await (_db.select(_db.localSales)
          ..where((t) => t.clientTransactionId.equals(clientTransactionId)))
        .getSingle();
    await (_db.update(_db.localSales)
          ..where((t) => t.clientTransactionId.equals(clientTransactionId)))
        .write(
      LocalSalesCompanion(
        syncStatus: const Value(SyncStatus.failed),
        syncAttempts: Value(current.syncAttempts + 1),
        lastSyncError: Value(error),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  Future<void> markSaleSyncing(String clientTransactionId) async {
    await (_db.update(_db.localSales)
          ..where((t) => t.clientTransactionId.equals(clientTransactionId)))
        .write(
      LocalSalesCompanion(
        syncStatus: const Value(SyncStatus.syncing),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }
}

class SaleLineInput {
  SaleLineInput({
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
