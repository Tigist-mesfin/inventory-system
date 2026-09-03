import '../core/utils/money_format.dart';
import 'server_list_models.dart';

class LedgerEntry {
  LedgerEntry({
    required this.id,
    required this.date,
    required this.document,
    required this.partyName,
    required this.partyPhone,
    this.customerId,
    this.supplierId,
    required this.items,
    required this.totalAmount,
    required this.paidAmount,
    required this.remainingBalance,
    required this.paymentMethod,
  });

  factory LedgerEntry.fromJson(Map<String, dynamic> json) {
    return LedgerEntry(
      id: json['id']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      document: json['document']?.toString() ?? '',
      partyName: json['partyName']?.toString() ?? '',
      partyPhone: json['partyPhone']?.toString() ?? '',
      customerId: json['customerId']?.toString(),
      supplierId: json['supplierId']?.toString(),
      items: json['items']?.toString() ?? '',
      totalAmount: parseServerNum(json['totalAmount']),
      paidAmount: parseServerNum(json['paidAmount']),
      remainingBalance: parseServerNum(json['remainingBalance']),
      paymentMethod: json['paymentMethod']?.toString() ?? '',
    );
  }

  final String id;
  final String date;
  final String document;
  final String partyName;
  final String partyPhone;
  final String? customerId;
  final String? supplierId;
  final String items;
  final double totalAmount;
  final double paidAmount;
  final double remainingBalance;
  final String paymentMethod;
}

class LedgerData {
  LedgerData({
    required this.credits,
    required this.debits,
    required this.creditTotal,
    required this.debitTotal,
  });

  factory LedgerData.empty() => LedgerData(
        credits: const [],
        debits: const [],
        creditTotal: 0,
        debitTotal: 0,
      );

  factory LedgerData.fromJson(Map<String, dynamic>? json) {
    final credits = (json?['credits'] as List?)
            ?.whereType<Map>()
            .map((row) => LedgerEntry.fromJson(Map<String, dynamic>.from(row)))
            .toList() ??
        const <LedgerEntry>[];
    final debits = (json?['debits'] as List?)
            ?.whereType<Map>()
            .map((row) => LedgerEntry.fromJson(Map<String, dynamic>.from(row)))
            .toList() ??
        const <LedgerEntry>[];
    return LedgerData(
      credits: credits,
      debits: debits,
      creditTotal: parseServerNum(json?['creditTotal']),
      debitTotal: parseServerNum(json?['debitTotal']),
    );
  }

  final List<LedgerEntry> credits;
  final List<LedgerEntry> debits;
  final double creditTotal;
  final double debitTotal;
}

class PartyRow {
  PartyRow({
    required this.id,
    required this.name,
    required this.phone,
    required this.location,
    required this.type,
    required this.walletBalance,
    required this.debt,
    required this.paymentStanding,
    this.businessName,
  });

  factory PartyRow.fromJson(Map<String, dynamic> json) {
    return PartyRow(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      location: json['location']?.toString() ?? '',
      type: json['type']?.toString() ?? 'CUSTOMER',
      walletBalance: parseServerNum(json['walletBalance']),
      debt: parseServerNum(json['debt'] ?? json['remainingBalance']),
      paymentStanding: json['paymentStanding']?.toString() ?? 'SETTLED',
      businessName: json['businessName']?.toString(),
    );
  }

  final String id;
  final String name;
  final String phone;
  final String location;
  final String type;
  final double walletBalance;
  final double debt;
  final String paymentStanding;
  final String? businessName;

  String get typeLabel => type == 'SUPPLIER' ? 'Supplier' : 'Customer';

  String get standingLabel {
    switch (paymentStanding) {
      case 'PARTIAL':
        return 'Partially paid';
      case 'UNPAID':
        return 'Remaining to pay';
      default:
        return 'Settled';
    }
  }
}

class WalletTransactionRow {
  WalletTransactionRow({
    required this.id,
    required this.customerName,
    required this.type,
    required this.amount,
    required this.method,
    required this.reason,
    required this.paidAt,
  });

  factory WalletTransactionRow.fromJson(Map<String, dynamic> json) {
    final customer = json['customer'];
    return WalletTransactionRow(
      id: json['id']?.toString() ?? '',
      customerName: customer is Map
          ? customer['name']?.toString() ?? 'Customer'
          : json['customerName']?.toString() ?? 'Customer',
      type: json['type']?.toString() ?? '',
      amount: parseServerNum(json['amount']),
      method: json['method']?.toString() ?? '',
      reason: json['reason']?.toString() ?? '',
      paidAt: json['paidAt']?.toString() ?? json['createdAt']?.toString() ?? '',
    );
  }

  final String id;
  final String customerName;
  final String type;
  final double amount;
  final String method;
  final String reason;
  final String paidAt;

  String get typeLabel {
    switch (type) {
      case 'DEPOSIT':
        return 'Deposit';
      case 'SALE':
        return 'Sale deduct';
      case 'REFUND':
        return 'Refund';
      default:
        return type;
    }
  }

  String get dayText {
    if (paidAt.isEmpty) return '—';
    return paidAt.length >= 10 ? paidAt.substring(0, 10) : paidAt;
  }
}

class OpenCustomerBalance {
  OpenCustomerBalance({
    required this.id,
    required this.name,
    required this.remaining,
  });

  final String id;
  final String name;
  final double remaining;

  String get label => '$name · remaining ${money(remaining)}';
}
