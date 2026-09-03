double parseServerNum(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? 0;
}

int parseServerInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ??
      double.tryParse(value?.toString() ?? '')?.toInt() ??
      0;
}

class ServerSaleLine {
  ServerSaleLine({
    required this.saleId,
    required this.itemId,
    required this.invoiceNumber,
    required this.saleDate,
    this.customerId,
    required this.customerName,
    required this.paymentMethod,
    required this.paymentStatus,
    required this.paidAmount,
    required this.remainingBalance,
    required this.productId,
    required this.productName,
    required this.unit,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
    required this.totalWithVat,
    required this.purchaseUnitCost,
    required this.purchaseTotal,
    required this.purchaseDateText,
    required this.salesman,
    this.createdBy,
  });

  factory ServerSaleLine.fromMaps(
    Map<String, dynamic> sale,
    Map<String, dynamic> item,
  ) {
    final product = item['product'];
    final customer = sale['customer'];
    final creator = sale['creator'];
    final allocs = (item['costAllocations'] as List?) ?? const [];
    final dates = <String>[];
    final seen = <String>{};
    for (final alloc in allocs) {
      if (alloc is! Map) continue;
      final day = alloc['purchaseDate']?.toString() ?? '';
      final key = day.length >= 10 ? day.substring(0, 10) : day;
      if (key.isEmpty || !seen.add(key)) continue;
      dates.add(key);
    }
    final net = parseServerNum(item['totalPrice']);
    final withVatValue = item['totalWithVat'] != null
        ? parseServerNum(item['totalWithVat'])
        : net;
    return ServerSaleLine(
      saleId: sale['id']?.toString() ?? '',
      itemId: item['id']?.toString() ?? '${sale['id']}-${item['productId']}',
      invoiceNumber: sale['invoiceNumber']?.toString() ?? 'Sale',
      saleDate: sale['saleDate']?.toString() ?? '',
      customerId: sale['customerId']?.toString(),
      customerName: sale['customerName']?.toString() ??
          (customer is Map ? customer['name']?.toString() : null) ??
          'Walk-in',
      paymentMethod: sale['paymentMethod']?.toString() ?? '',
      paymentStatus: sale['paymentStatus']?.toString() ?? '',
      paidAmount: parseServerNum(sale['paidAmount']),
      remainingBalance: parseServerNum(sale['remainingBalance']),
      productId: item['productId']?.toString() ?? '',
      productName: item['productName']?.toString() ??
          (product is Map ? product['name']?.toString() : null) ??
          'Item',
      unit: product is Map ? (product['unit']?.toString() ?? '') : '',
      quantity: parseServerNum(item['quantity']),
      unitPrice: parseServerNum(item['unitPrice']),
      totalPrice: net,
      totalWithVat: withVatValue,
      purchaseUnitCost: parseServerNum(item['purchaseUnitCost']),
      purchaseTotal: parseServerNum(item['purchaseTotal']),
      purchaseDateText: dates.isEmpty ? '—' : dates.join(', '),
      salesman: creator is Map
          ? (creator['fullName']?.toString() ??
              creator['username']?.toString() ??
              '—')
          : '—',
      createdBy: sale['createdBy']?.toString(),
    );
  }

  final String saleId;
  final String itemId;
  final String invoiceNumber;
  final String saleDate;
  final String? customerId;
  final String customerName;
  final String paymentMethod;
  final String paymentStatus;
  final double paidAmount;
  final double remainingBalance;
  final String productId;
  final String productName;
  final String unit;
  final double quantity;
  final double unitPrice;
  final double totalPrice;
  final double totalWithVat;
  final double purchaseUnitCost;
  final double purchaseTotal;
  final String purchaseDateText;
  final String salesman;
  final String? createdBy;

  double get profit => totalPrice - purchaseTotal;

  String get paidLabel {
    if (remainingBalance > 0.004) {
      return paymentStatus == 'UNPAID' ? 'Unpaid' : 'Partial';
    }
    return 'Paid';
  }

  String get dayText {
    if (saleDate.isEmpty) return '—';
    return saleDate.length >= 10 ? saleDate.substring(0, 10) : saleDate;
  }
}

class ServerPurchaseLine {
  ServerPurchaseLine({
    required this.lineId,
    required this.purchaseOrderId,
    required this.document,
    required this.date,
    required this.party,
    required this.salesman,
    required this.productId,
    required this.productName,
    required this.unit,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
    required this.paymentMethod,
    required this.deliveryStatus,
    required this.paymentStatus,
    required this.paidAmount,
    required this.remainingBalance,
    this.warehouseId,
    this.warehouseName,
  });

  factory ServerPurchaseLine.fromJson(Map<String, dynamic> json) {
    return ServerPurchaseLine(
      lineId: json['id']?.toString() ?? '',
      purchaseOrderId: json['purchaseOrderId']?.toString() ?? '',
      document: json['document']?.toString() ?? 'PO',
      date: json['date']?.toString() ?? '',
      party: json['party']?.toString() ?? '',
      salesman: json['salesman']?.toString() ?? '',
      productId: json['productId']?.toString() ?? '',
      productName: json['productName']?.toString() ?? 'Item',
      unit: json['unit']?.toString() ?? '',
      quantity: parseServerNum(json['quantity']),
      unitPrice: parseServerNum(json['unitPrice']),
      totalPrice: parseServerNum(json['totalPrice']),
      paymentMethod: json['paymentMethod']?.toString() ?? '',
      deliveryStatus: json['deliveryStatus']?.toString() ?? 'NOT_DELIVERED',
      paymentStatus: json['paymentStatus']?.toString() ?? '',
      paidAmount: parseServerNum(json['paidAmount']),
      remainingBalance: parseServerNum(json['remainingBalance']),
      warehouseId: json['warehouseId']?.toString(),
      warehouseName: json['warehouseName']?.toString(),
    );
  }

  final String lineId;
  final String purchaseOrderId;
  final String document;
  final String date;
  final String party;
  final String salesman;
  final String productId;
  final String productName;
  final String unit;
  final double quantity;
  final double unitPrice;
  final double totalPrice;
  final String paymentMethod;
  final String deliveryStatus;
  final String paymentStatus;
  final double paidAmount;
  final double remainingBalance;
  final String? warehouseId;
  final String? warehouseName;
}

class PurchaseSummaryBucket {
  PurchaseSummaryBucket({
    required this.count,
    required this.items,
  });

  factory PurchaseSummaryBucket.fromJson(Map<String, dynamic>? json) {
    final items = (json?['items'] as List?)
            ?.whereType<Map>()
            .map((row) => Map<String, dynamic>.from(row))
            .toList() ??
        const <Map<String, dynamic>>[];
    return PurchaseSummaryBucket(
      count: parseServerInt(json?['count']),
      items: items,
    );
  }

  final int count;
  final List<Map<String, dynamic>> items;
}

class PurchaseDeliverySummary {
  PurchaseDeliverySummary({
    required this.notDelivered,
    required this.onLoading,
    required this.delivered,
    required this.undeliveredCount,
  });

  factory PurchaseDeliverySummary.empty() => PurchaseDeliverySummary(
        notDelivered: PurchaseSummaryBucket(count: 0, items: const []),
        onLoading: PurchaseSummaryBucket(count: 0, items: const []),
        delivered: PurchaseSummaryBucket(count: 0, items: const []),
        undeliveredCount: 0,
      );

  factory PurchaseDeliverySummary.fromJson(Map<String, dynamic>? json) {
    return PurchaseDeliverySummary(
      notDelivered: PurchaseSummaryBucket.fromJson(
        json?['notDelivered'] is Map
            ? Map<String, dynamic>.from(json!['notDelivered'] as Map)
            : null,
      ),
      onLoading: PurchaseSummaryBucket.fromJson(
        json?['onLoading'] is Map
            ? Map<String, dynamic>.from(json!['onLoading'] as Map)
            : null,
      ),
      delivered: PurchaseSummaryBucket.fromJson(
        json?['delivered'] is Map
            ? Map<String, dynamic>.from(json!['delivered'] as Map)
            : null,
      ),
      undeliveredCount: parseServerInt(json?['undeliveredCount']),
    );
  }

  final PurchaseSummaryBucket notDelivered;
  final PurchaseSummaryBucket onLoading;
  final PurchaseSummaryBucket delivered;
  final int undeliveredCount;
}

class PurchaseReportTotals {
  PurchaseReportTotals({
    required this.amount,
    required this.quantity,
  });

  factory PurchaseReportTotals.fromJson(Map<String, dynamic>? json) {
    return PurchaseReportTotals(
      amount: parseServerNum(json?['amount']),
      quantity: parseServerNum(json?['quantity']),
    );
  }

  final double amount;
  final double quantity;
}

class TeamSalesman {
  TeamSalesman({required this.id, required this.fullName});

  factory TeamSalesman.fromJson(Map<String, dynamic> json) {
    return TeamSalesman(
      id: json['id']?.toString() ?? '',
      fullName: json['fullName']?.toString() ??
          json['username']?.toString() ??
          'Staff',
    );
  }

  final String id;
  final String fullName;
}

const kDeliveryStatusLabels = <String, String>{
  'NOT_DELIVERED': 'Not delivered',
  'ON_LOADING': 'On loading',
  'DELIVERED': 'Delivered to store',
};

String deliveryStatusLabel(String? status) =>
    kDeliveryStatusLabels[status] ?? (status?.isNotEmpty == true ? status! : '—');
