import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../core/utils/money_format.dart';
import '../../../models/ai_models.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/common/form_dropdown.dart';
import '../../../widgets/loading/inventory_loading.dart';
import '../../sync/providers/sync_provider.dart';
import '../providers/ai_provider.dart';

class AiDeskScreen extends StatefulWidget {
  const AiDeskScreen({super.key, this.onOpenAssistant});

  final ValueChanged<String?>? onOpenAssistant;

  @override
  State<AiDeskScreen> createState() => _AiDeskScreenState();
}

class _AiDeskScreenState extends State<AiDeskScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AiProvider>().bootstrapDesk();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AiProvider>();
    final sync = context.watch<SyncProvider>();

    if (!sync.isOperatingOnline) {
      return const EmptyState(
        title: 'AI desk offline',
        subtitle: 'Switch to Auto or Online to view AI analysis.',
        icon: Icons.auto_awesome,
      );
    }

    if (provider.loading && provider.dashboard == null) {
      return const InventoryLoading(message: 'Loading AI desk...');
    }

    final cards = provider.cards;
    final topProduct = asMap(cards['topProduct']);
    final topSalesman = asMap(cards['topSalesman']);

    return RefreshIndicator(
      onRefresh: provider.refreshDesk,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'AI business desk',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: AppColors.ink,
                          ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Daily and monthly analysis summarized by AI from your company records.',
                      style: TextStyle(color: AppColors.inkSoft),
                    ),
                  ],
                ),
              ),
              FilledButton(
                onPressed: () => widget.onOpenAssistant?.call(null),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.saffron,
                  foregroundColor: Colors.white,
                ),
                child: const Text('AI Assistant'),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _TabChip(
                        label: 'Daily',
                        selected: provider.tab == AiDeskTab.daily,
                        onTap: () => provider.setTab(AiDeskTab.daily),
                      ),
                      _TabChip(
                        label: 'Monthly',
                        selected: provider.tab == AiDeskTab.monthly,
                        onTap: () => provider.setTab(AiDeskTab.monthly),
                      ),
                      _TabChip(
                        label: 'Insights',
                        selected: provider.tab == AiDeskTab.insights,
                        onTap: () => provider.setTab(AiDeskTab.insights),
                      ),
                      _TabChip(
                        label: 'P&L items',
                        selected: provider.tab == AiDeskTab.profit,
                        onTap: () => provider.setTab(AiDeskTab.profit),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  FormDropdownField<String>(
                    label: 'Warehouse',
                    value: provider.warehouseId,
                    items: [
                      const DropdownMenuItem(
                        value: '',
                        child: Text('All stores I can see'),
                      ),
                      ...provider.warehouses.map(
                        (w) => DropdownMenuItem(
                          value: w.id,
                          child: Text(w.name),
                        ),
                      ),
                    ],
                    onChanged: (v) => provider.setWarehouse(v),
                  ),
                  const SizedBox(height: 10),
                  OutlinedButton(
                    onPressed: provider.busy ? null : provider.refreshDesk,
                    child: Text(
                      provider.busy ? 'Refreshing…' : 'Refresh analysis',
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (provider.error != null) ...[
            const SizedBox(height: 12),
            ErrorBanner(message: provider.error!),
          ],
          const SizedBox(height: 14),
          SizedBox(
            height: 118,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _StatCard(
                  label: "Today's sales",
                  value: moneyEtb(cards['todaySales']),
                ),
                _StatCard(
                  label: 'Monthly sales',
                  value: moneyEtb(cards['monthlySales']),
                ),
                _StatCard(
                  label: 'Monthly gross profit',
                  value: moneyEtb(cards['monthlyGrossProfit']),
                ),
                _StatCard(
                  label: 'Profit margin',
                  value: cards['profitMargin'] == null
                      ? 'n/a'
                      : '${cards['profitMargin']}%',
                ),
                _StatCard(
                  label: 'Low stock items',
                  value: '${cards['lowStockCount'] ?? 0}',
                ),
                _StatCard(
                  label: 'Loss-making products',
                  value: '${cards['lossMakingCount'] ?? 0}',
                ),
                _StatCard(
                  label: 'Top product',
                  value: topProduct['name']?.toString() ?? '—',
                  subtitle: topProduct.isEmpty
                      ? ''
                      : moneyEtb(topProduct['profit']),
                ),
                _StatCard(
                  label: 'Top salesman',
                  value: topSalesman['name']?.toString() ?? '—',
                  subtitle: topSalesman.isEmpty
                      ? ''
                      : moneyEtb(topSalesman['revenue']),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          if (provider.busy &&
              provider.daily == null &&
              provider.monthly == null &&
              provider.insights == null)
            const InventoryLoading(message: 'Building AI summary…')
          else
            _TabBody(
              provider: provider,
              onAsk: (q) => widget.onOpenAssistant?.call(q),
            ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Need a custom answer?',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Open the AI Assistant to ask free-form questions with Smart Clarify.',
                    style: TextStyle(color: AppColors.inkSoft),
                  ),
                  const SizedBox(height: 10),
                  FilledButton(
                    onPressed: () => widget.onOpenAssistant?.call(null),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.saffron,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Open AI assistant'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TabBody extends StatelessWidget {
  const _TabBody({required this.provider, required this.onAsk});

  final AiProvider provider;
  final ValueChanged<String> onAsk;

  @override
  Widget build(BuildContext context) {
    switch (provider.tab) {
      case AiDeskTab.daily:
        return _DailyBody(data: provider.daily);
      case AiDeskTab.monthly:
        return _MonthlyBody(data: provider.monthly);
      case AiDeskTab.profit:
        return _ProfitBody(data: provider.monthly);
      case AiDeskTab.insights:
        return _InsightsBody(data: provider.insights, onAsk: onAsk);
    }
  }
}

class _DailyBody extends StatelessWidget {
  const _DailyBody({required this.data});
  final Map<String, dynamic>? data;

  @override
  Widget build(BuildContext context) {
    if (data == null) return const SizedBox.shrink();
    final cards = asMap(data!['cards']);
    final lists = asMap(data!['lists']);
    return Column(
      children: [
        _Narrative(asMap(data!['narrative'])),
        _MiniStats([
          ("Today's sales", moneyEtb(cards['sales'])),
          ('Purchases', moneyEtb(cards['purchases'])),
          ('Profit', moneyEtb(cards['profit'])),
          (
            'Margin',
            cards['profitMargin'] == null
                ? 'n/a'
                : '${cards['profitMargin']}%'
          ),
          ('Invoices', '${cards['invoices'] ?? 0}'),
          ('Low-stock', '${cards['lowStockCount'] ?? 0}'),
        ]),
        _SimpleTable(
          title: 'Stock movements today',
          columns: const ['Type', 'Txns', 'Qty'],
          rows: asMapList(lists['stockMovements'])
              .map(
                (r) => [
                  '${r['type'] ?? '—'}',
                  '${r['txnCount'] ?? '—'}',
                  '${r['quantity'] ?? '—'}',
                ],
              )
              .toList(),
        ),
        _SimpleTable(
          title: 'Top-selling products',
          columns: const ['Item', 'Qty', 'Revenue'],
          rows: asMapList(lists['topSelling'])
              .map(
                (r) => [
                  '${r['name'] ?? '—'}',
                  '${r['quantity'] ?? '—'}',
                  moneyEtb(r['revenue']),
                ],
              )
              .toList(),
        ),
        _SimpleTable(
          title: 'Low-stock items',
          columns: const ['Item', 'Store', 'On hand'],
          rows: asMapList(lists['lowStock'])
              .map(
                (r) => [
                  '${r['name'] ?? '—'}',
                  '${r['warehouse'] ?? '—'}',
                  '${r['quantity'] ?? '—'}',
                ],
              )
              .toList(),
        ),
        _SimpleTable(
          title: 'Items giving profit today',
          columns: const ['Item', 'Profit', 'Margin'],
          rows: asMapList(lists['topProfit'])
              .map(
                (r) => [
                  '${r['name'] ?? '—'}',
                  moneyEtb(r['profit']),
                  r['margin'] == null ? '—' : '${r['margin']}%',
                ],
              )
              .toList(),
        ),
      ],
    );
  }
}

class _MonthlyBody extends StatelessWidget {
  const _MonthlyBody({required this.data});
  final Map<String, dynamic>? data;

  @override
  Widget build(BuildContext context) {
    if (data == null) return const SizedBox.shrink();
    final cards = asMap(data!['cards']);
    final lists = asMap(data!['lists']);
    return Column(
      children: [
        _Narrative(asMap(data!['narrative'])),
        _MiniStats([
          ('Sales', moneyEtb(cards['sales'])),
          ('Purchases', moneyEtb(cards['purchases'])),
          ('Gross profit', moneyEtb(cards['profit'])),
          ('COGS', moneyEtb(cards['cogs'])),
          (
            'Margin',
            cards['profitMargin'] == null
                ? 'n/a'
                : '${cards['profitMargin']}%'
          ),
          ('Loss SKUs', '${cards['lossMakingCount'] ?? 0}'),
        ]),
        _SimpleTable(
          title: 'Best products',
          columns: const ['Item', 'Profit', 'Revenue'],
          rows: asMapList(lists['bestProducts'])
              .map(
                (r) => [
                  '${r['name'] ?? '—'}',
                  moneyEtb(r['profit']),
                  moneyEtb(r['revenue']),
                ],
              )
              .toList(),
        ),
        _SimpleTable(
          title: 'Worst / loss products',
          columns: const ['Item', 'Profit', 'Margin'],
          rows: asMapList(lists['worstProducts'])
              .map(
                (r) => [
                  '${r['name'] ?? '—'}',
                  moneyEtb(r['profit']),
                  r['margin'] == null ? '—' : '${r['margin']}%',
                ],
              )
              .toList(),
        ),
        _SimpleTable(
          title: 'Store performance',
          columns: const ['Store', 'Sales', 'Profit'],
          rows: asMapList(lists['stores'])
              .map(
                (r) => [
                  '${r['name'] ?? '—'}',
                  moneyEtb(r['revenue']),
                  moneyEtb(r['profit']),
                ],
              )
              .toList(),
        ),
        _SimpleTable(
          title: 'Salesman performance',
          columns: const ['Salesman', 'Sales', 'Invoices'],
          rows: asMapList(lists['salesmen'])
              .map(
                (r) => [
                  '${r['name'] ?? '—'}',
                  moneyEtb(r['revenue']),
                  '${r['invoices'] ?? '—'}',
                ],
              )
              .toList(),
        ),
      ],
    );
  }
}

class _ProfitBody extends StatelessWidget {
  const _ProfitBody({required this.data});
  final Map<String, dynamic>? data;

  @override
  Widget build(BuildContext context) {
    if (data == null) return const SizedBox.shrink();
    final lists = asMap(data!['lists']);
    final narrative = asMap(data!['narrative']);
    return Column(
      children: [
        _Narrative({
          'headline': narrative['headline'] ?? 'Profit and loss by item',
          'bullets': [
            '${asMapList(lists['bestProducts']).length} profit-leading items this month.',
            '${asMapList(lists['worstProducts']).length} loss-making items need attention.',
            ...((narrative['bullets'] as List?)?.map((e) => e.toString()) ??
                    const <String>[])
                .take(3),
          ],
        }),
        _SimpleTable(
          title: 'Items giving profit',
          columns: const ['Item', 'Qty', 'Revenue', 'Profit'],
          rows: asMapList(lists['bestProducts'])
              .map(
                (r) => [
                  '${r['name'] ?? '—'}',
                  '${r['quantity'] ?? '—'}',
                  moneyEtb(r['revenue']),
                  moneyEtb(r['profit']),
                ],
              )
              .toList(),
        ),
        _SimpleTable(
          title: 'Items giving loss',
          columns: const ['Item', 'Qty', 'Revenue', 'Loss'],
          rows: asMapList(lists['worstProducts'])
              .map(
                (r) => [
                  '${r['name'] ?? '—'}',
                  '${r['quantity'] ?? '—'}',
                  moneyEtb(r['revenue']),
                  moneyEtb(r['profit']),
                ],
              )
              .toList(),
        ),
      ],
    );
  }
}

class _InsightsBody extends StatelessWidget {
  const _InsightsBody({required this.data, required this.onAsk});
  final Map<String, dynamic>? data;
  final ValueChanged<String> onAsk;

  @override
  Widget build(BuildContext context) {
    if (data == null) return const SizedBox.shrink();
    final prompts = asMapList(data!['prompts']);
    return Column(
      children: [
        _Narrative(asMap(data!['narrative'])),
        ...prompts.map((prompt) {
          final items = asMapList(prompt['items']);
          final stores = asMapList(prompt['stores']);
          final question = prompt['question']?.toString() ?? '';
          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    question,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  if ((prompt['answerHint']?.toString() ?? '').isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      prompt['answerHint'].toString(),
                      style: const TextStyle(color: AppColors.inkSoft),
                    ),
                  ],
                  const SizedBox(height: 8),
                  if (items.isEmpty)
                    const Text(
                      'No matching items right now.',
                      style: TextStyle(color: AppColors.inkSoft),
                    )
                  else
                    ...items.take(5).map((item) {
                      final parts = <String>[
                        if ((item['warehouse']?.toString() ?? '').isNotEmpty)
                          item['warehouse'].toString(),
                        if (item['quantity'] != null) 'qty ${item['quantity']}',
                        if (item['profit'] != null) moneyEtb(item['profit']),
                        if (item['revenue'] != null && item['profit'] == null)
                          moneyEtb(item['revenue']),
                        if (item['reason'] != null) item['reason'].toString(),
                      ];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(
                                text: item['name']?.toString() ?? '—',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              if (parts.isNotEmpty)
                                TextSpan(
                                  text: ' · ${parts.join(' · ')}',
                                  style: const TextStyle(
                                    color: AppColors.inkSoft,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ...stores.map(
                    (store) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(
                        '${store['name'] ?? '—'} · profit ${moneyEtb(store['profit'])}',
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: OutlinedButton(
                      onPressed:
                          question.isEmpty ? null : () => onAsk(question),
                      child: const Text('Ask assistant'),
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }
}

class _Narrative extends StatelessWidget {
  const _Narrative(this.json);
  final Map<String, dynamic> json;

  @override
  Widget build(BuildContext context) {
    final bullets = (json['bullets'] as List?)?.map((e) => e.toString()).toList() ??
        const <String>[];
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              json['headline']?.toString() ?? 'AI summary',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
            ),
            const SizedBox(height: 8),
            if (bullets.isEmpty)
              const Text(
                'No narrative yet.',
                style: TextStyle(color: AppColors.inkSoft),
              )
            else
              ...bullets.map(
                (b) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('•  ', style: TextStyle(color: AppColors.brand)),
                      Expanded(child: Text(b)),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _MiniStats extends StatelessWidget {
  const _MiniStats(this.items);
  final List<(String, String)> items;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 96,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: items
            .map(
              (item) => _StatCard(label: item.$1, value: item.$2, compact: true),
            )
            .toList(),
      ),
    );
  }
}

class _SimpleTable extends StatelessWidget {
  const _SimpleTable({
    required this.title,
    required this.columns,
    required this.rows,
  });

  final String title;
  final List<String> columns;
  final List<List<String>> rows;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(top: 12),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            if (rows.isEmpty)
              const Text(
                'No rows',
                style: TextStyle(color: AppColors.inkSoft),
              )
            else
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  headingRowColor: WidgetStateProperty.all(AppColors.brand),
                  headingRowHeight: 40,
                  columns: columns
                      .map(
                        (c) => DataColumn(
                          label: Text(
                            c,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      )
                      .toList(),
                  rows: rows
                      .map(
                        (row) => DataRow(
                          cells: row.map((c) => DataCell(Text(c))).toList(),
                        ),
                      )
                      .toList(),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _TabChip extends StatelessWidget {
  const _TabChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      selectedColor: AppColors.brand.withValues(alpha: 0.22),
      onSelected: (_) => onTap(),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    this.subtitle = '',
    this.compact = false,
  });

  final String label;
  final String value;
  final String subtitle;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: compact ? 140 : 170,
      margin: const EdgeInsets.only(right: 10, bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        gradient: LinearGradient(
          colors: [
            AppColors.brand.withValues(alpha: 0.18),
            AppColors.brand.withValues(alpha: 0.05),
          ],
        ),
        border: Border.all(color: AppColors.brand.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: AppColors.inkSoft, fontSize: 11)),
          const SizedBox(height: 6),
          Text(
            value,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
          ),
          if (subtitle.isNotEmpty) ...[
            const Spacer(),
            Text(
              subtitle,
              style: const TextStyle(color: AppColors.inkSoft, fontSize: 11),
            ),
          ],
        ],
      ),
    );
  }
}
