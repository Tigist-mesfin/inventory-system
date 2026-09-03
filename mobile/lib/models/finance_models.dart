import '../core/utils/money_format.dart';

class MoneyLine {
  MoneyLine({
    required this.amount,
    this.count = 0,
    this.pctOfRevenue = 0,
    this.marginPct = 0,
    this.discountAmount = 0,
    this.vatCollected = 0,
    this.totalWithVat = 0,
    this.result = '',
    this.byCategory = const [],
  });

  factory MoneyLine.fromJson(Map<String, dynamic>? json) {
    final categories = (json?['byCategory'] as List?)
            ?.whereType<Map>()
            .map(
              (row) => ExpenseCategoryLine(
                category: row['category']?.toString() ?? 'OTHER',
                amount: parseMoney(row['amount']),
              ),
            )
            .toList() ??
        const <ExpenseCategoryLine>[];
    return MoneyLine(
      amount: parseMoney(json?['amount']),
      count: (json?['count'] is num)
          ? (json!['count'] as num).toInt()
          : int.tryParse('${json?['count'] ?? 0}') ?? 0,
      pctOfRevenue: parseMoney(json?['pctOfRevenue']),
      marginPct: parseMoney(json?['marginPct']),
      discountAmount: parseMoney(json?['discountAmount']),
      vatCollected: parseMoney(json?['vatCollected']),
      totalWithVat: parseMoney(json?['totalWithVat']),
      result: json?['result']?.toString() ?? '',
      byCategory: categories,
    );
  }

  final double amount;
  final int count;
  final double pctOfRevenue;
  final double marginPct;
  final double discountAmount;
  final double vatCollected;
  final double totalWithVat;
  final String result;
  final List<ExpenseCategoryLine> byCategory;
}

class ExpenseCategoryLine {
  ExpenseCategoryLine({required this.category, required this.amount});

  final String category;
  final double amount;
}

class StatementPeriod {
  StatementPeriod({
    required this.label,
    this.from,
    this.to,
  });

  factory StatementPeriod.fromJson(Map<String, dynamic>? json) {
    return StatementPeriod(
      label: json?['label']?.toString() ?? '',
      from: json?['from']?.toString(),
      to: json?['to']?.toString(),
    );
  }

  final String label;
  final String? from;
  final String? to;
}

class IncomeStatement {
  IncomeStatement({
    required this.period,
    required this.vatRate,
    required this.sales,
    required this.cogs,
    required this.grossProfit,
    required this.operatingExpenses,
    required this.operatingProfit,
    required this.otherIncome,
    required this.totalRevenue,
    required this.netIncome,
  });

  factory IncomeStatement.fromJson(Map<String, dynamic>? json) {
    return IncomeStatement(
      period: StatementPeriod.fromJson(
        json?['period'] is Map
            ? Map<String, dynamic>.from(json!['period'] as Map)
            : null,
      ),
      vatRate: parseMoney(json?['vatRate']),
      sales: MoneyLine.fromJson(
        json?['sales'] is Map
            ? Map<String, dynamic>.from(json!['sales'] as Map)
            : null,
      ),
      cogs: MoneyLine.fromJson(
        json?['cogs'] is Map
            ? Map<String, dynamic>.from(json!['cogs'] as Map)
            : null,
      ),
      grossProfit: MoneyLine.fromJson(
        json?['grossProfit'] is Map
            ? Map<String, dynamic>.from(json!['grossProfit'] as Map)
            : null,
      ),
      operatingExpenses: MoneyLine.fromJson(
        json?['operatingExpenses'] is Map
            ? Map<String, dynamic>.from(json!['operatingExpenses'] as Map)
            : null,
      ),
      operatingProfit: MoneyLine.fromJson(
        json?['operatingProfit'] is Map
            ? Map<String, dynamic>.from(json!['operatingProfit'] as Map)
            : null,
      ),
      otherIncome: MoneyLine.fromJson(
        json?['otherIncome'] is Map
            ? Map<String, dynamic>.from(json!['otherIncome'] as Map)
            : null,
      ),
      totalRevenue: MoneyLine.fromJson(
        json?['totalRevenue'] is Map
            ? Map<String, dynamic>.from(json!['totalRevenue'] as Map)
            : null,
      ),
      netIncome: MoneyLine.fromJson(
        json?['netIncome'] is Map
            ? Map<String, dynamic>.from(json!['netIncome'] as Map)
            : null,
      ),
    );
  }

  final StatementPeriod period;
  final double vatRate;
  final MoneyLine sales;
  final MoneyLine cogs;
  final MoneyLine grossProfit;
  final MoneyLine operatingExpenses;
  final MoneyLine operatingProfit;
  final MoneyLine otherIncome;
  final MoneyLine totalRevenue;
  final MoneyLine netIncome;

  bool get isLoss =>
      netIncome.amount < 0 || netIncome.result.toUpperCase() == 'LOSS';
}

class VatMonthRow {
  VatMonthRow({
    required this.month,
    required this.salesVat,
    required this.purchaseVat,
    required this.netVat,
  });

  factory VatMonthRow.fromJson(Map<String, dynamic> json) {
    return VatMonthRow(
      month: json['month']?.toString() ?? '',
      salesVat: parseMoney(json['salesVat']),
      purchaseVat: parseMoney(json['purchaseVat']),
      netVat: parseMoney(json['netVat']),
    );
  }

  final String month;
  final double salesVat;
  final double purchaseVat;
  final double netVat;
}

class VatReport {
  VatReport({
    required this.vatRate,
    required this.salesVat,
    required this.purchaseVat,
    required this.netVat,
    required this.monthly,
  });

  factory VatReport.fromJson(Map<String, dynamic>? json) {
    final totals = json?['totals'] is Map
        ? Map<String, dynamic>.from(json!['totals'] as Map)
        : <String, dynamic>{};
    final monthly = (json?['monthly'] as List?)
            ?.whereType<Map>()
            .map(
              (row) => VatMonthRow.fromJson(Map<String, dynamic>.from(row)),
            )
            .toList() ??
        const <VatMonthRow>[];
    return VatReport(
      vatRate: parseMoney(json?['vatRate']),
      salesVat: parseMoney(totals['salesVat']),
      purchaseVat: parseMoney(totals['purchaseVat']),
      netVat: parseMoney(totals['netVat']),
      monthly: monthly,
    );
  }

  final double vatRate;
  final double salesVat;
  final double purchaseVat;
  final double netVat;
  final List<VatMonthRow> monthly;
}

class StatementTableRow {
  const StatementTableRow({
    required this.account,
    this.amount = '',
    this.pct = '',
    this.bold = false,
  });

  final String account;
  final String amount;
  final String pct;
  final bool bold;
}

const expenseCategoryLabels = <String, String>{
  'RENT': 'Rent & Lease',
  'SALARY': 'Salaries & Wages',
  'UTILITIES': 'Utilities',
  'TRANSPORT': 'Transportation',
  'FUEL': 'Fuel',
  'MAINTENANCE': 'Maintenance & Repairs',
  'OFFICE': 'Office Supplies',
  'MARKETING': 'Marketing & Advertising',
  'BANK_FEES': 'Bank & Payment Fees',
  'TAX': 'Taxes & Government Fees',
  'INSURANCE': 'Insurance',
  'EQUIPMENT': 'Equipment & Tools',
  'DIGITAL': 'Software & Subscriptions',
  'PACKAGING': 'Packaging Materials',
  'SHIPPING': 'Shipping & Delivery',
  'LEGAL_ACCOUNTING': 'Legal & Accounting',
  'CLEANING': 'Cleaning & Sanitation',
  'SECURITY': 'Security',
  'INTEREST_FINANCE': 'Interest & Finance Costs',
  'OTHER': 'Other',
};

String pctLabel(dynamic value) => '${money(value)}%';

String monthLabel(String value) {
  if (value.isEmpty) return '—';
  final parts = value.split('-');
  if (parts.length < 2) return value;
  final year = int.tryParse(parts[0]);
  final month = int.tryParse(parts[1]);
  if (year == null || month == null || month < 1 || month > 12) return value;
  const names = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return '${names[month - 1]} $year';
}

List<StatementTableRow> buildStatementRows(IncomeStatement statement) {
  final sales = statement.sales;
  final cogs = statement.cogs;
  final gross = statement.grossProfit;
  final opex = statement.operatingExpenses;
  final opProfit = statement.operatingProfit;
  final other = statement.otherIncome;
  final totalRevenue = statement.totalRevenue;
  final net = statement.netIncome;
  final isLoss = statement.isLoss;

  return [
    const StatementTableRow(account: 'REVENUE', bold: true),
    StatementTableRow(
      account: '  Sales revenue',
      amount: moneyEtb(sales.amount),
      pct: pctLabel(sales.pctOfRevenue),
    ),
    StatementTableRow(
      account: '  Other income',
      amount: moneyEtb(other.amount),
      pct: pctLabel(other.pctOfRevenue),
    ),
    StatementTableRow(
      account: 'Total revenue',
      amount: moneyEtb(totalRevenue.amount),
      pct: '100.00%',
      bold: true,
    ),
    const StatementTableRow(account: 'COST OF SALES', bold: true),
    StatementTableRow(
      account: '  Cost of goods sold',
      amount: '(${moneyEtb(cogs.amount)})',
      pct: pctLabel(cogs.pctOfRevenue),
    ),
    StatementTableRow(
      account: 'Total cost of sales',
      amount: '(${moneyEtb(cogs.amount)})',
      pct: pctLabel(cogs.pctOfRevenue),
      bold: true,
    ),
    StatementTableRow(
      account: 'Gross profit',
      amount: moneyEtb(gross.amount),
      pct: pctLabel(gross.marginPct),
      bold: true,
    ),
    const StatementTableRow(account: 'OPERATING EXPENSES', bold: true),
    ...opex.byCategory.map(
      (row) => StatementTableRow(
        account:
            '  ${expenseCategoryLabels[row.category] ?? row.category}',
        amount: '(${moneyEtb(row.amount)})',
      ),
    ),
    StatementTableRow(
      account: 'Total operating expenses',
      amount: '(${moneyEtb(opex.amount)})',
      pct: pctLabel(opex.pctOfRevenue),
      bold: true,
    ),
    StatementTableRow(
      account: 'Operating profit',
      amount: moneyEtb(opProfit.amount),
      pct: pctLabel(opProfit.marginPct),
      bold: true,
    ),
    StatementTableRow(
      account: 'Other income (added below operating profit)',
      amount: moneyEtb(other.amount),
      pct: pctLabel(other.pctOfRevenue),
    ),
    StatementTableRow(
      account: isLoss ? 'Net loss' : 'Net profit',
      amount: moneyEtb(net.amount),
      pct: pctLabel(net.marginPct),
      bold: true,
    ),
  ];
}
