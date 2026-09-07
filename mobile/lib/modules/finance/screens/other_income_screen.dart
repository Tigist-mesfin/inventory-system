import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../core/utils/money_format.dart';
import '../../../models/finance_models.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/common/form_dropdown.dart';
import '../../../widgets/loading/inventory_loading.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/services/auth_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../providers/expenses_provider.dart';

const _periods = <(String, String)>[
  ('today', 'Today'),
  ('this_week', 'This week'),
  ('this_month', 'This month'),
  ('last_month', 'Last month'),
  ('this_year', 'This year'),
  ('custom', 'Custom dates'),
];

String _todayIso() {
  final now = DateTime.now();
  return '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
}

class OtherIncomeScreen extends StatefulWidget {
  const OtherIncomeScreen({super.key, this.onOpenExpenses});

  final VoidCallback? onOpenExpenses;

  @override
  State<OtherIncomeScreen> createState() => _OtherIncomeScreenState();
}

class _OtherIncomeScreenState extends State<OtherIncomeScreen> {
  late String _incomeDate;
  final _from = TextEditingController();
  final _reason = TextEditingController();
  final _amount = TextEditingController();
  String? _method;

  @override
  void initState() {
    super.initState();
    _incomeDate = _todayIso();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final provider = context.read<OtherIncomeProvider>();
      await provider.refresh(period: 'this_month');
      if (!mounted) return;
      setState(() {
        _method = provider.methods.isNotEmpty
            ? provider.methods.first.name
            : null;
      });
    });
  }

  @override
  void dispose() {
    _from.dispose();
    _reason.dispose();
    _amount.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final amount = double.tryParse(_amount.text.trim()) ?? 0;
    if (_from.text.trim().isEmpty ||
        _reason.text.trim().isEmpty ||
        amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter from, reason, and amount')),
      );
      return;
    }
    final ok = await context.read<OtherIncomeProvider>().createIncome(
          incomeDate: _incomeDate,
          receivedFrom: _from.text.trim(),
          reason: _reason.text.trim(),
          amount: amount,
          paymentMethod: _method,
        );
    if (!mounted) return;
    if (ok) {
      _from.clear();
      _reason.clear();
      _amount.clear();
      setState(() => _incomeDate = _todayIso());
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Other income saved')),
      );
    }
  }

  Future<void> _delete(OtherIncomeRow row) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete income'),
        content: Text('Delete income from “${row.receivedFrom}”?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.coral),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    await context.read<OtherIncomeProvider>().deleteIncome(row.id);
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<OtherIncomeProvider>();
    final sync = context.watch<SyncProvider>();
    final auth = context.watch<AuthProvider>();
    final canCreate = PermissionHelper.can(auth.user, 'finance', 'CREATE');
    final canDelete = PermissionHelper.can(auth.user, 'finance', 'DELETE');
    final report = provider.report;

    if (!sync.isOperatingOnline) {
      return const EmptyState(
        title: 'Other income offline',
        subtitle: 'Switch to Auto or Online to manage other income.',
        icon: Icons.savings_outlined,
      );
    }

    if (provider.loading && report == null) {
      return const InventoryLoading(message: 'Loading other income...');
    }

    final methodItems = [
      const DropdownMenuItem(value: '', child: Text('—')),
      ...provider.methods.map(
        (m) => DropdownMenuItem(value: m.name, child: Text(m.name)),
      ),
    ];

    return RefreshIndicator(
      onRefresh: () => provider.refresh(),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Other income',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.ink,
                      ),
                ),
              ),
              if (widget.onOpenExpenses != null)
                TextButton(
                  onPressed: widget.onOpenExpenses,
                  child: const Text('Expenses'),
                ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Record income that is not from sales — who paid, why, amount, and payment method.',
            style: TextStyle(color: AppColors.inkSoft),
          ),
          if (provider.error != null) ...[
            const SizedBox(height: 12),
            ErrorBanner(message: provider.error!),
          ],
          if (canCreate) ...[
            const SizedBox(height: 14),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'New other income',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                    ),
                    const SizedBox(height: 10),
                    OutlinedButton(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate:
                              DateTime.tryParse(_incomeDate) ?? DateTime.now(),
                          firstDate: DateTime(2020),
                          lastDate:
                              DateTime.now().add(const Duration(days: 365)),
                        );
                        if (picked == null) return;
                        setState(() {
                          _incomeDate =
                              '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
                        });
                      },
                      child: Text('Date: $_incomeDate'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _from,
                      decoration:
                          const InputDecoration(labelText: 'Received from'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _reason,
                      decoration: const InputDecoration(labelText: 'Reason'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _amount,
                      decoration:
                          const InputDecoration(labelText: 'Amount (ETB)'),
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                    ),
                    const SizedBox(height: 10),
                    FormDropdownField<String>(
                      label: 'Payment method',
                      value: _method ?? '',
                      items: methodItems,
                      onChanged: (v) => setState(
                        () => _method = (v == null || v.isEmpty) ? null : v,
                      ),
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: provider.busy ? null : _submit,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.brand,
                        minimumSize: const Size.fromHeight(48),
                      ),
                      child: Text(provider.busy ? 'Saving…' : 'Save income'),
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _periods.map((row) {
              final selected = provider.period == row.$1;
              return ChoiceChip(
                label: Text(row.$2),
                selected: selected,
                selectedColor: AppColors.brand.withValues(alpha: 0.2),
                onSelected: (_) {
                  if (row.$1 == 'custom') {
                    final today = _todayIso();
                    provider.refresh(
                      period: 'custom',
                      from: provider.from.isEmpty ? today : provider.from,
                      to: provider.to.isEmpty ? today : provider.to,
                    );
                  } else {
                    provider.refresh(period: row.$1);
                  }
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 10),
          FormDropdownField<String>(
            label: 'Filter payment method',
            value: provider.paymentMethod,
            items: [
              const DropdownMenuItem(value: '', child: Text('All methods')),
              ...provider.methods.map(
                (m) => DropdownMenuItem(value: m.name, child: Text(m.name)),
              ),
            ],
            onChanged: (v) => provider.refresh(paymentMethod: v ?? ''),
          ),
          if (report != null) ...[
            const SizedBox(height: 12),
            Text(
              '${report.periodLabel.isEmpty ? provider.period : report.periodLabel} · ${moneyEtb(report.amount)} · ${report.count} records',
              style: const TextStyle(color: AppColors.inkSoft),
            ),
            const SizedBox(height: 10),
            if (report.incomes.isEmpty)
              const EmptyState(
                title: 'No other income in this period',
                icon: Icons.savings_outlined,
              )
            else
              ...report.incomes.map(
                (row) => Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    title: Text(
                      row.receivedFrom,
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    subtitle: Text(
                      '${row.dayText} · ${row.reason}'
                      '${row.paymentMethod.isNotEmpty ? ' · ${row.paymentMethod}' : ''}',
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          moneyEtb(row.amount),
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            color: AppColors.brand,
                          ),
                        ),
                        if (canDelete)
                          IconButton(
                            onPressed:
                                provider.busy ? null : () => _delete(row),
                            icon: const Icon(
                              Icons.delete_outline,
                              color: AppColors.coral,
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}
