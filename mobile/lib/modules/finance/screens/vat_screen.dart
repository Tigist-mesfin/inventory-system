import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../core/utils/money_format.dart';
import '../../../models/finance_models.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/loading/inventory_loading.dart';
import '../../sync/providers/sync_provider.dart';
import '../providers/expenses_provider.dart';

const _vatPeriods = <(String, String)>[
  ('today', 'Today'),
  ('yesterday', 'Yesterday'),
  ('this_month', 'This month'),
  ('this_year', 'This year'),
  ('all', 'All VAT'),
  ('custom', 'Custom'),
];

String _iso(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

(String from, String to) _vatRange(String period) {
  final now = DateTime.now();
  final today = _iso(now);
  switch (period) {
    case 'today':
      return (today, today);
    case 'yesterday':
      final y = now.subtract(const Duration(days: 1));
      final key = _iso(y);
      return (key, key);
    case 'this_month':
      return (_iso(DateTime(now.year, now.month, 1)), today);
    case 'this_year':
      return (_iso(DateTime(now.year, 1, 1)), today);
    case 'all':
      return ('', '');
    default:
      return ('', '');
  }
}

class VatScreen extends StatefulWidget {
  const VatScreen({super.key});

  @override
  State<VatScreen> createState() => _VatScreenState();
}

class _VatScreenState extends State<VatScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final range = _vatRange('this_month');
      context.read<VatProvider>().refresh(
            period: 'this_month',
            from: range.$1,
            to: range.$2,
          );
    });
  }

  Future<void> _pickPeriod(String value) async {
    final provider = context.read<VatProvider>();
    if (value == 'custom') {
      final today = _iso(DateTime.now());
      provider.setDates(
        from: provider.from.isEmpty ? today : provider.from,
        to: provider.to.isEmpty ? today : provider.to,
      );
      await provider.refresh(period: 'custom');
      return;
    }
    final range = _vatRange(value);
    await provider.refresh(period: value, from: range.$1, to: range.$2);
  }

  Future<void> _pickDate({required bool isFrom}) async {
    final provider = context.read<VatProvider>();
    final initial =
        DateTime.tryParse(isFrom ? provider.from : provider.to) ??
            DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked == null) return;
    final iso = _iso(picked);
    provider.setDates(
      from: isFrom ? iso : provider.from,
      to: isFrom ? provider.to : iso,
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<VatProvider>();
    final sync = context.watch<SyncProvider>();
    final report = provider.report;

    if (!sync.isOperatingOnline) {
      return const EmptyState(
        title: 'VAT offline',
        subtitle: 'Switch to Auto or Online to view VAT data.',
        icon: Icons.receipt_long_outlined,
      );
    }

    if (provider.loading && report == null) {
      return const InventoryLoading(message: 'Loading VAT data...');
    }

    final rate = report?.vatRate ?? kVatRate;

    return RefreshIndicator(
      onRefresh: () => provider.refresh(),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        children: [
          Text(
            'VAT data',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.ink,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            'VAT ${money(rate)}% on completed sales (collected) and purchases (paid to suppliers). Net VAT is sales VAT minus purchase VAT.',
            style: const TextStyle(color: AppColors.inkSoft),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _vatPeriods.map((row) {
              final selected = provider.period == row.$1;
              return ChoiceChip(
                label: Text(row.$2),
                selected: selected,
                selectedColor: AppColors.brand.withValues(alpha: 0.2),
                onSelected: provider.loading ? null : (_) => _pickPeriod(row.$1),
              );
            }).toList(),
          ),
          if (provider.period == 'custom') ...[
            const SizedBox(height: 10),
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
          if (report != null) ...[
            const SizedBox(height: 14),
            SizedBox(
              height: 118,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _VatCard(
                    label: 'Sales VAT',
                    value: moneyEtb(report.salesVat),
                    subtitle:
                        '${report.salesCount} sales · net ${money(report.salesNet)}',
                  ),
                  _VatCard(
                    label: 'Purchase VAT',
                    value: moneyEtb(report.purchaseVat),
                    subtitle:
                        '${report.purchaseCount} purchases · net ${money(report.purchaseNet)}',
                  ),
                  _VatCard(
                    label: 'Net VAT',
                    value: moneyEtb(report.netVat),
                    subtitle: 'Sales VAT − purchase VAT',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'VAT by month',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            if (report.monthly.isEmpty)
              const Text(
                'No VAT documents in this period.',
                style: TextStyle(color: AppColors.inkSoft),
              )
            else
              _DocTable(
                columns: const ['Month', 'Sales VAT', 'Purchase VAT', 'Net'],
                rows: report.monthly
                    .map(
                      (row) => [
                        monthLabel(row.month),
                        moneyEtb(row.salesVat),
                        moneyEtb(row.purchaseVat),
                        moneyEtb(row.netVat),
                      ],
                    )
                    .toList(),
              ),
            const SizedBox(height: 14),
            const Text(
              'Sales with VAT',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            if (report.sales.isEmpty)
              const Text(
                'No sales in this period.',
                style: TextStyle(color: AppColors.inkSoft),
              )
            else
              _DocTable(
                columns: const ['Date', 'Document', 'Party', 'VAT', 'Total'],
                rows: report.sales
                    .map(
                      (row) => [
                        row.dayText,
                        row.document,
                        row.party,
                        moneyEtb(row.vat),
                        moneyEtb(row.total),
                      ],
                    )
                    .toList(),
                minWidth: 680,
              ),
            const SizedBox(height: 14),
            const Text(
              'Purchases with VAT',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            if (report.purchases.isEmpty)
              const Text(
                'No purchases in this period.',
                style: TextStyle(color: AppColors.inkSoft),
              )
            else
              _DocTable(
                columns: const ['Date', 'Document', 'Party', 'VAT', 'Total'],
                rows: report.purchases
                    .map(
                      (row) => [
                        row.dayText,
                        row.document,
                        row.party,
                        moneyEtb(row.vat),
                        moneyEtb(row.total),
                      ],
                    )
                    .toList(),
                minWidth: 680,
              ),
          ],
        ],
      ),
    );
  }
}

class _VatCard extends StatelessWidget {
  const _VatCard({
    required this.label,
    required this.value,
    required this.subtitle,
  });

  final String label;
  final String value;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 200,
      margin: const EdgeInsets.only(right: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        gradient: LinearGradient(
          colors: [
            AppColors.brand.withValues(alpha: 0.16),
            AppColors.brand.withValues(alpha: 0.04),
          ],
        ),
        border: Border.all(color: AppColors.brand.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: AppColors.inkSoft, fontSize: 12)),
          const SizedBox(height: 6),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
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

class _DocTable extends StatelessWidget {
  const _DocTable({
    required this.columns,
    required this.rows,
    this.minWidth = 520,
  });

  final List<String> columns;
  final List<List<String>> rows;
  final double minWidth;

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
      ),
      clipBehavior: Clip.antiAlias,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: ConstrainedBox(
          constraints: BoxConstraints(minWidth: minWidth),
          child: DataTable(
            headingRowColor: WidgetStateProperty.all(AppColors.brand),
            headingRowHeight: 44,
            columns: columns
                .map((c) => DataColumn(label: Text(c, style: headerStyle)))
                .toList(),
            rows: rows
                .map(
                  (row) => DataRow(
                    cells: row.map((cell) => DataCell(Text(cell))).toList(),
                  ),
                )
                .toList(),
          ),
        ),
      ),
    );
  }
}
