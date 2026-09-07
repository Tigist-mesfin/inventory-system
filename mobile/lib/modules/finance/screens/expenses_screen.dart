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

class ExpensesScreen extends StatefulWidget {
  const ExpensesScreen({super.key, this.onOpenOtherIncome});

  final VoidCallback? onOpenOtherIncome;

  @override
  State<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends State<ExpensesScreen> {
  late String _expenseDate;
  String _category = 'OTHER';
  final _description = TextEditingController();
  final _amount = TextEditingController();
  String? _method;

  @override
  void initState() {
    super.initState();
    _expenseDate = _todayIso();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final provider = context.read<ExpensesProvider>();
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
    _description.dispose();
    _amount.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final amount = double.tryParse(_amount.text.trim()) ?? 0;
    if (_description.text.trim().isEmpty || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter description and amount')),
      );
      return;
    }
    final ok = await context.read<ExpensesProvider>().createExpense(
          expenseDate: _expenseDate,
          category: _category,
          description: _description.text.trim(),
          amount: amount,
          paymentMethod: _method,
        );
    if (!mounted) return;
    if (ok) {
      _description.clear();
      _amount.clear();
      setState(() {
        _expenseDate = _todayIso();
        _category = 'OTHER';
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Expense saved')),
      );
    }
  }

  Future<void> _delete(ExpenseRow row) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete expense'),
        content: Text('Delete “${row.description}”?'),
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
    await context.read<ExpensesProvider>().deleteExpense(row.id);
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ExpensesProvider>();
    final sync = context.watch<SyncProvider>();
    final auth = context.watch<AuthProvider>();
    final canCreate = PermissionHelper.can(auth.user, 'finance', 'CREATE');
    final canDelete = PermissionHelper.can(auth.user, 'finance', 'DELETE');
    final report = provider.report;

    if (!sync.isOperatingOnline) {
      return const EmptyState(
        title: 'Expenses offline',
        subtitle: 'Switch to Auto or Online to manage expenses.',
        icon: Icons.payments_outlined,
      );
    }

    if (provider.loading && report == null) {
      return const InventoryLoading(message: 'Loading expenses...');
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
                  'Expenses',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.ink,
                      ),
                ),
              ),
              if (widget.onOpenOtherIncome != null)
                TextButton(
                  onPressed: widget.onOpenOtherIncome,
                  child: const Text('Other income'),
                ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Record operating costs and filter the list by date or category.',
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
                      'New expense',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                    ),
                    const SizedBox(height: 10),
                    OutlinedButton(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate:
                              DateTime.tryParse(_expenseDate) ?? DateTime.now(),
                          firstDate: DateTime(2020),
                          lastDate:
                              DateTime.now().add(const Duration(days: 365)),
                        );
                        if (picked == null) return;
                        setState(() {
                          _expenseDate =
                              '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
                        });
                      },
                      child: Text('Date: $_expenseDate'),
                    ),
                    const SizedBox(height: 10),
                    FormDropdownField<String>(
                      label: 'Category',
                      value: _category,
                      items: expenseCategoryLabels.entries
                          .map(
                            (e) => DropdownMenuItem(
                              value: e.key,
                              child: Text(e.value),
                            ),
                          )
                          .toList(),
                      onChanged: (v) =>
                          setState(() => _category = v ?? 'OTHER'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _description,
                      decoration:
                          const InputDecoration(labelText: 'Description'),
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
                      child: Text(provider.busy ? 'Saving…' : 'Save expense'),
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
            label: 'Filter category',
            value: provider.category,
            items: [
              const DropdownMenuItem(value: '', child: Text('All categories')),
              ...expenseCategoryLabels.entries.map(
                (e) => DropdownMenuItem(value: e.key, child: Text(e.value)),
              ),
            ],
            onChanged: (v) => provider.refresh(category: v ?? ''),
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
              '${report.periodLabel.isEmpty ? provider.period : report.periodLabel} · ${moneyEtb(report.amount)} · ${report.count} expenses',
              style: const TextStyle(color: AppColors.inkSoft),
            ),
            const SizedBox(height: 10),
            if (report.expenses.isEmpty)
              const EmptyState(
                title: 'No expenses in this period',
                icon: Icons.payments_outlined,
              )
            else
              ...report.expenses.map(
                (row) => Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    title: Text(
                      row.description,
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    subtitle: Text(
                      '${row.dayText} · ${row.categoryLabel}'
                      '${row.paymentMethod.isNotEmpty ? ' · ${row.paymentMethod}' : ''}',
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          moneyEtb(row.amount),
                          style: const TextStyle(fontWeight: FontWeight.w800),
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
