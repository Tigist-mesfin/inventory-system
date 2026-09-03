import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../core/utils/money_format.dart';
import '../../../models/finance_models.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/loading/inventory_loading.dart';
import '../../sync/providers/sync_provider.dart';
import '../providers/finance_provider.dart';

const _periods = <(String, String)>[
  ('all_time', 'All time'),
  ('today', 'Today'),
  ('this_week', 'This week'),
  ('this_month', 'This month'),
  ('last_month', 'Last month'),
  ('this_year', 'This year'),
  ('custom', 'Custom range'),
];

class IncomeStatementScreen extends StatefulWidget {
  const IncomeStatementScreen({super.key});

  @override
  State<IncomeStatementScreen> createState() => _IncomeStatementScreenState();
}

class _IncomeStatementScreenState extends State<IncomeStatementScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FinanceProvider>().refresh(period: 'all_time');
    });
  }

  String _todayIso() {
    final now = DateTime.now();
    return '${now.year.toString().padLeft(4, '0')}-'
        '${now.month.toString().padLeft(2, '0')}-'
        '${now.day.toString().padLeft(2, '0')}';
  }

  Future<void> _pickPeriod(String value) async {
    final provider = context.read<FinanceProvider>();
    if (value == 'custom') {
      final today = _todayIso();
      provider.setCustomDates(
        from: provider.from.isEmpty ? today : provider.from,
        to: provider.to.isEmpty ? today : provider.to,
      );
      await provider.refresh(period: 'custom');
      return;
    }
    await provider.refresh(period: value);
  }

  Future<void> _pickDate({required bool isFrom}) async {
    final provider = context.read<FinanceProvider>();
    final initial = DateTime.tryParse(
          isFrom ? provider.from : provider.to,
        ) ??
        DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked == null) return;
    final iso =
        '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
    provider.setCustomDates(
      from: isFrom ? iso : provider.from,
      to: isFrom ? provider.to : iso,
    );
  }

  Future<void> _exportCsv() async {
    final statement = context.read<FinanceProvider>().statement;
    if (statement == null) return;
    final rows = buildStatementRows(statement);
    final buffer = StringBuffer('Account,Amount,% of revenue\r\n');
    for (final row in rows) {
      buffer.writeln(
        '"${row.account.replaceAll('"', '""')}",'
        '"${row.amount.replaceAll('"', '""')}",'
        '"${row.pct.replaceAll('"', '""')}"',
      );
    }
    await Clipboard.setData(ClipboardData(text: buffer.toString()));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Statement CSV copied to clipboard')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<FinanceProvider>();
    final sync = context.watch<SyncProvider>();
    final online = sync.isOperatingOnline;
    final statement = provider.statement;
    final vat = provider.vatReport;

    if (!online) {
      return const EmptyState(
        title: 'Income statement offline',
        subtitle: 'Switch to Auto or Online to view profit & loss.',
        icon: Icons.insights_outlined,
      );
    }

    if (provider.loading && statement == null) {
      return const InventoryLoading(message: 'Loading income statement...');
    }

    var periodLabel = 'Period';
    for (final row in _periods) {
      if (row.$1 == provider.period) {
        periodLabel = row.$2;
        break;
      }
    }
    if (statement != null && statement.period.label.isNotEmpty) {
      periodLabel = statement.period.label;
    }
    final fromText = (statement?.period.from ?? '').toString();
    final toText = (statement?.period.to ?? '').toString();
    final periodRange = provider.period == 'all_time'
        ? 'All available records'
        : (fromText.length >= 10 && toText.length >= 10)
            ? '${fromText.substring(0, 10)} → ${toText.substring(0, 10)}'
            : '';

    return RefreshIndicator(
      onRefresh: () => provider.refresh(),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        children: [
          Text(
            'Income statement',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.ink,
                ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Profit & loss from sales, inventory COGS, operating expenses, and other income.',
            style: TextStyle(color: AppColors.inkSoft),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _periods.map((row) {
              final selected = provider.period == row.$1;
              return ChoiceChip(
                label: Text(row.$2),
                selected: selected,
                selectedColor: AppColors.brand.withValues(alpha: 0.2),
                onSelected: provider.loading
                    ? null
                    : (_) => _pickPeriod(row.$1),
              );
            }).toList(),
          ),
          if (provider.period == 'custom') ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _pickDate(isFrom: true),
                    child: Text(
                      'From: ${provider.from.isEmpty ? '—' : provider.from}',
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _pickDate(isFrom: false),
                    child: Text(
                      'To: ${provider.to.isEmpty ? '—' : provider.to}',
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: provider.loading
                  ? null
                  : () => provider.refresh(
                        period: 'custom',
                        from: provider.from,
                        to: provider.to,
                      ),
              style: FilledButton.styleFrom(backgroundColor: AppColors.brand),
              child: Text(provider.loading ? 'Loading…' : 'Apply'),
            ),
          ],
          if (provider.error != null) ...[
            const SizedBox(height: 12),
            ErrorBanner(message: provider.error!),
          ],
          if (statement != null) ...[
            const SizedBox(height: 12),
            Text(
              [
                periodLabel,
                if (periodRange.isNotEmpty) periodRange,
                if (provider.loading) 'Updating…',
              ].join(' · '),
              style: const TextStyle(color: AppColors.inkSoft, fontSize: 13),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 128,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _StatCard(
                    label: 'Total sales / income',
                    value: moneyEtb(statement.sales.amount),
                    subtitle:
                        '${statement.sales.count} completed sales (net of VAT)',
                  ),
                  _StatCard(
                    label: 'COGS',
                    value: moneyEtb(statement.cogs.amount),
                    subtitle: 'Inventory cost at sale',
                  ),
                  _StatCard(
                    label: 'Other revenue',
                    value: moneyEtb(statement.otherIncome.amount),
                    subtitle: 'Other income records',
                  ),
                  _StatCard(
                    label: 'Total expenses',
                    value: moneyEtb(statement.operatingExpenses.amount),
                    subtitle: 'Operating expenses',
                  ),
                  _StatCard(
                    label: 'VAT (sales)',
                    value: moneyEtb(
                      vat?.salesVat ?? statement.sales.vatCollected,
                    ),
                    subtitle:
                        'Purchases VAT ${money(vat?.purchaseVat)} · Net ${money(vat?.netVat)}',
                  ),
                  _StatCard(
                    label: statement.isLoss ? 'Net loss' : 'Net profit',
                    value: moneyEtb(statement.netIncome.amount),
                    subtitle:
                        'Margin ${pctLabel(statement.netIncome.marginPct)} of total revenue',
                    danger: statement.isLoss,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerLeft,
              child: OutlinedButton.icon(
                onPressed: _exportCsv,
                icon: const Icon(Icons.copy_all_outlined, size: 18),
                label: const Text('Copy CSV'),
              ),
            ),
            const SizedBox(height: 12),
            _PnlCard(statement: statement),
            const SizedBox(height: 14),
            _DetailTable(rows: buildStatementRows(statement)),
            const SizedBox(height: 14),
            _VatSection(
              statement: statement,
              vat: vat,
            ),
          ],
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.subtitle,
    this.danger = false,
  });

  final String label;
  final String value;
  final String subtitle;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 190,
      margin: const EdgeInsets.only(right: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: danger
              ? [
                  AppColors.coral.withValues(alpha: 0.18),
                  AppColors.coral.withValues(alpha: 0.06),
                ]
              : [
                  AppColors.brand.withValues(alpha: 0.16),
                  AppColors.brand.withValues(alpha: 0.04),
                ],
        ),
        border: Border.all(
          color: (danger ? AppColors.coral : AppColors.brand)
              .withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(color: AppColors.inkSoft, fontSize: 12),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 18,
              color: danger ? AppColors.coral : AppColors.ink,
            ),
          ),
          const Spacer(),
          Text(
            subtitle,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: AppColors.inkSoft, fontSize: 11),
          ),
        ],
      ),
    );
  }
}

class _PnlCard extends StatelessWidget {
  const _PnlCard({required this.statement});

  final IncomeStatement statement;

  @override
  Widget build(BuildContext context) {
    final sales = statement.sales;
    final cogs = statement.cogs;
    final gross = statement.grossProfit;
    final opex = statement.operatingExpenses;
    final opProfit = statement.operatingProfit;
    final other = statement.otherIncome;
    final totalRevenue = statement.totalRevenue;
    final net = statement.netIncome;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Income statement',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            Text(
              statement.period.label,
              style: const TextStyle(color: AppColors.inkSoft, fontSize: 13),
            ),
            const SizedBox(height: 12),
            const _SectionTitle('Revenue'),
            _PnlRow(
              account: 'Sales revenue',
              amount: moneyEtb(sales.amount),
              pct: pctLabel(sales.pctOfRevenue),
              indent: true,
            ),
            if (sales.discountAmount > 0)
              _PnlRow(
                account: 'Sales discounts recorded',
                amount: moneyEtb(sales.discountAmount),
                indent: true,
              ),
            _PnlRow(
              account: 'Other income / other revenue',
              amount: moneyEtb(other.amount),
              pct: pctLabel(other.pctOfRevenue),
              indent: true,
            ),
            _PnlRow(
              account: 'Total revenue',
              amount: moneyEtb(totalRevenue.amount),
              strong: true,
            ),
            const _SectionTitle('Cost of sales'),
            _PnlRow(
              account: 'Cost of goods sold',
              amount: '(${moneyEtb(cogs.amount)})',
              pct: pctLabel(cogs.pctOfRevenue),
              indent: true,
            ),
            _PnlRow(
              account: 'Total cost of sales',
              amount: '(${moneyEtb(cogs.amount)})',
              strong: true,
            ),
            _PnlRow(
              account: 'Gross profit',
              amount: moneyEtb(gross.amount),
              pct: 'Margin ${pctLabel(gross.marginPct)}',
              strong: true,
            ),
            const _SectionTitle('Operating expenses'),
            if (opex.byCategory.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  'No operating expenses in this period.',
                  style: TextStyle(color: AppColors.inkSoft),
                ),
              )
            else
              ...opex.byCategory.map(
                (row) => _PnlRow(
                  account:
                      expenseCategoryLabels[row.category] ?? row.category,
                  amount: '(${moneyEtb(row.amount)})',
                  indent: true,
                ),
              ),
            _PnlRow(
              account: 'Total operating expenses',
              amount: '(${moneyEtb(opex.amount)})',
              strong: true,
            ),
            _PnlRow(
              account: 'Operating profit',
              amount: moneyEtb(opProfit.amount),
              pct: 'Margin ${pctLabel(opProfit.marginPct)}',
              strong: true,
            ),
            const _SectionTitle('Other income'),
            _PnlRow(
              account: 'Total other income',
              amount: moneyEtb(other.amount),
              indent: true,
            ),
            const Text(
              'Included once in net profit (after operating profit). Also shown in Total revenue above.',
              style: TextStyle(color: AppColors.inkSoft, fontSize: 12),
            ),
            const SizedBox(height: 8),
            _PnlRow(
              account: statement.isLoss ? 'Net loss' : 'Net profit',
              amount: moneyEtb(net.amount),
              pct: 'Margin ${pctLabel(net.marginPct)}',
              net: true,
              loss: statement.isLoss,
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 12, bottom: 6),
      child: Text(
        text.toUpperCase(),
        style: const TextStyle(
          fontWeight: FontWeight.w800,
          fontSize: 12,
          letterSpacing: 0.6,
          color: AppColors.brand,
        ),
      ),
    );
  }
}

class _PnlRow extends StatelessWidget {
  const _PnlRow({
    required this.account,
    required this.amount,
    this.pct,
    this.indent = false,
    this.strong = false,
    this.net = false,
    this.loss = false,
  });

  final String account;
  final String amount;
  final String? pct;
  final bool indent;
  final bool strong;
  final bool net;
  final bool loss;

  @override
  Widget build(BuildContext context) {
    final color = loss
        ? AppColors.coral
        : (net ? AppColors.brand : AppColors.ink);
    return Padding(
      padding: EdgeInsets.fromLTRB(indent ? 12 : 0, 5, 0, 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              account,
              style: TextStyle(
                fontWeight: strong || net ? FontWeight.w800 : FontWeight.w500,
                color: color,
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                amount,
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  color: color,
                ),
              ),
              if (pct != null)
                Text(
                  pct!,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.inkSoft,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DetailTable extends StatelessWidget {
  const _DetailTable({required this.rows});

  final List<StatementTableRow> rows;

  @override
  Widget build(BuildContext context) {
    const headerStyle = TextStyle(
      color: Colors.white,
      fontWeight: FontWeight.w700,
    );
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.line),
        color: Colors.white,
      ),
      clipBehavior: Clip.antiAlias,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minWidth: 520),
          child: DataTable(
            headingRowColor: WidgetStateProperty.all(AppColors.brand),
            headingRowHeight: 44,
            columnSpacing: 20,
            columns: const [
              DataColumn(label: Text('Account', style: headerStyle)),
              DataColumn(label: Text('Amount', style: headerStyle)),
              DataColumn(label: Text('% of revenue', style: headerStyle)),
            ],
            rows: rows
                .map(
                  (row) => DataRow(
                    cells: [
                      DataCell(
                        Text(
                          row.account,
                          style: TextStyle(
                            fontWeight: row.bold
                                ? FontWeight.w800
                                : FontWeight.w500,
                          ),
                        ),
                      ),
                      DataCell(Text(row.amount.isEmpty ? '—' : row.amount)),
                      DataCell(Text(row.pct.isEmpty ? '—' : row.pct)),
                    ],
                  ),
                )
                .toList(),
          ),
        ),
      ),
    );
  }
}

class _VatSection extends StatelessWidget {
  const _VatSection({
    required this.statement,
    required this.vat,
  });

  final IncomeStatement statement;
  final VatReport? vat;

  @override
  Widget build(BuildContext context) {
    final rate = vat?.vatRate ?? statement.vatRate;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'VAT / tax summary',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              'From existing sales and purchase documents (rate ${money(rate)}%). '
              'Sales revenue on this statement is net; VAT is not deducted again from net profit.',
              style: const TextStyle(color: AppColors.inkSoft, fontSize: 13),
            ),
            if (vat == null) ...[
              const SizedBox(height: 10),
              Text(
                'VAT report is unavailable for your permissions or returned no data. '
                'Sales VAT on completed invoices for this period: '
                '${moneyEtb(statement.sales.vatCollected)}.',
                style: const TextStyle(color: AppColors.inkSoft),
              ),
            ] else ...[
              const SizedBox(height: 12),
              SizedBox(
                height: 100,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _StatCard(
                      label: 'VAT collected on sales',
                      value: moneyEtb(vat!.salesVat),
                      subtitle: '',
                    ),
                    _StatCard(
                      label: 'VAT on purchases',
                      value: moneyEtb(vat!.purchaseVat),
                      subtitle: '',
                    ),
                    _StatCard(
                      label: 'Net VAT position',
                      value: moneyEtb(vat!.netVat),
                      subtitle: 'Sales VAT − purchase VAT',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'VAT by month',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              if (vat!.monthly.isEmpty)
                const Text(
                  'No VAT documents in this period.',
                  style: TextStyle(color: AppColors.inkSoft),
                )
              else
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.line),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: DataTable(
                      headingRowColor:
                          WidgetStateProperty.all(AppColors.brand),
                      headingRowHeight: 44,
                      columns: const [
                        DataColumn(
                          label: Text(
                            'Month',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        DataColumn(
                          label: Text(
                            'Sales VAT',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        DataColumn(
                          label: Text(
                            'Purchase VAT',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        DataColumn(
                          label: Text(
                            'Net VAT',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                      rows: vat!.monthly
                          .map(
                            (row) => DataRow(
                              cells: [
                                DataCell(Text(monthLabel(row.month))),
                                DataCell(Text(moneyEtb(row.salesVat))),
                                DataCell(Text(moneyEtb(row.purchaseVat))),
                                DataCell(Text(moneyEtb(row.netVat))),
                              ],
                            ),
                          )
                          .toList(),
                    ),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}
