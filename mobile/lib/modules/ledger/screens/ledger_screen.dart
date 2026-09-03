import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../core/utils/money_format.dart';
import '../../../models/party_models.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/common/form_dropdown.dart';
import '../../../widgets/loading/inventory_loading.dart';
import '../../sync/providers/sync_provider.dart';
import '../providers/ledger_provider.dart';

class LedgerScreen extends StatefulWidget {
  const LedgerScreen({super.key});

  @override
  State<LedgerScreen> createState() => _LedgerScreenState();
}

class _LedgerScreenState extends State<LedgerScreen> {
  String? _collectCustomerId;
  final _collectAmount = TextEditingController();
  String? _collectMethod;

  String? _payPurchaseId;
  final _payAmount = TextEditingController();
  String? _payMethod;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final provider = context.read<LedgerProvider>();
      await provider.refresh();
      if (!mounted) return;
      setState(() {
        _collectMethod = provider.methods.isNotEmpty
            ? provider.methods.first.name
            : kDefaultPaymentMethods.first;
        _payMethod = _collectMethod;
      });
    });
  }

  @override
  void dispose() {
    _collectAmount.dispose();
    _payAmount.dispose();
    super.dispose();
  }

  void _pickCustomer(String? id) {
    final provider = context.read<LedgerProvider>();
    OpenCustomerBalance? row;
    for (final item in provider.customersOpen) {
      if (item.id == id) {
        row = item;
        break;
      }
    }
    setState(() {
      _collectCustomerId = id;
      _collectAmount.text = row == null ? '' : money(row.remaining);
    });
  }

  void _pickPurchase(String? id) {
    final provider = context.read<LedgerProvider>();
    LedgerEntry? row;
    for (final item in provider.ledger.debits) {
      if (item.id == id) {
        row = item;
        break;
      }
    }
    setState(() {
      _payPurchaseId = id;
      _payAmount.text = row == null ? '' : money(row.remainingBalance);
      if (row != null && row.paymentMethod.isNotEmpty) {
        _payMethod = row.paymentMethod;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LedgerProvider>();
    final sync = context.watch<SyncProvider>();
    final online = sync.isOperatingOnline;

    if (provider.loading &&
        provider.ledger.credits.isEmpty &&
        provider.ledger.debits.isEmpty) {
      return const InventoryLoading();
    }

    if (!online) {
      return const EmptyState(
        title: 'Debit & credit offline',
        subtitle: 'Switch to Auto or Online to view unpaid balances.',
        icon: Icons.account_balance_wallet_outlined,
      );
    }

    final methodItems = (provider.methods.isNotEmpty
            ? provider.methods.map((m) => m.name)
            : kDefaultPaymentMethods)
        .map((name) => DropdownMenuItem(value: name, child: Text(name)))
        .toList();

    return RefreshIndicator(
      onRefresh: provider.refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          Text(
            'Debit & credit',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.ink,
                ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Credit is unpaid money customers owe you. Debit is unpaid money you still owe suppliers.',
            style: TextStyle(color: AppColors.inkSoft),
          ),
          if (provider.error != null) ...[
            const SizedBox(height: 12),
            ErrorBanner(message: provider.error!),
          ],
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  title: 'Total unpaid (credit)',
                  value: moneyEtb(provider.ledger.creditTotal),
                  subtitle: 'Customers still to pay',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _StatCard(
                  title: 'Must to pay (debit)',
                  value: moneyEtb(provider.ledger.debitTotal),
                  subtitle: 'Supplier balances still open',
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: () => provider.setTab(LedgerTab.credit),
                  style: FilledButton.styleFrom(
                    backgroundColor: provider.tab == LedgerTab.credit
                        ? AppColors.brand
                        : AppColors.brand.withValues(alpha: 0.18),
                    foregroundColor: provider.tab == LedgerTab.credit
                        ? Colors.white
                        : AppColors.primaryDark,
                  ),
                  child: const Text('Credit'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton(
                  onPressed: () => provider.setTab(LedgerTab.debit),
                  style: FilledButton.styleFrom(
                    backgroundColor: provider.tab == LedgerTab.debit
                        ? AppColors.brand
                        : AppColors.brand.withValues(alpha: 0.18),
                    foregroundColor: provider.tab == LedgerTab.debit
                        ? Colors.white
                        : AppColors.primaryDark,
                  ),
                  child: const Text('Debit'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (provider.tab == LedgerTab.credit) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Collect remaining payment',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                    ),
                    const SizedBox(height: 10),
                    FormDropdownField<String>(
                      label: 'Customer',
                      value: _collectCustomerId,
                      items: provider.customersOpen
                          .map(
                            (c) => DropdownMenuItem(
                              value: c.id,
                              child: Text(c.label),
                            ),
                          )
                          .toList(),
                      onChanged: _pickCustomer,
                    ),
                    const SizedBox(height: 10),
                    TextFormField(
                      controller: _collectAmount,
                      decoration: const InputDecoration(
                        labelText: 'Amount to collect',
                      ),
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                    ),
                    const SizedBox(height: 10),
                    FormDropdownField<String>(
                      label: 'Payment method',
                      value: _collectMethod,
                      items: methodItems,
                      onChanged: (value) =>
                          setState(() => _collectMethod = value),
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: provider.busy
                          ? null
                          : () async {
                              if (_collectCustomerId == null ||
                                  _collectMethod == null) {
                                return;
                              }
                              final messenger = ScaffoldMessenger.of(context);
                              final ok = await provider.collectFromCustomer(
                                customerId: _collectCustomerId!,
                                amount:
                                    double.tryParse(_collectAmount.text) ?? 0,
                                method: _collectMethod!,
                              );
                              if (!mounted) return;
                              if (ok) {
                                setState(() {
                                  _collectCustomerId = null;
                                  _collectAmount.clear();
                                });
                                messenger.showSnackBar(
                                  const SnackBar(
                                    content: Text('Payment collected'),
                                  ),
                                );
                              }
                            },
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.saffron,
                      ),
                      child: Text(
                        provider.busy ? 'Saving…' : 'Collect payment',
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            _LedgerTable(
              rows: provider.ledger.credits,
              emptyText: 'No unpaid customer payments.',
              remainingLabel: 'Remaining',
              actionLabel: 'Collect',
              busy: provider.busy,
              onAction: (row) async {
                final method = _collectMethod ??
                    (provider.methods.isNotEmpty
                        ? provider.methods.first.name
                        : null);
                if (method == null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Add a payment method first'),
                    ),
                  );
                  return;
                }
                final messenger = ScaffoldMessenger.of(context);
                final ok = await provider.collectSaleRow(
                  row: row,
                  paymentMethod: method,
                );
                if (!mounted) return;
                if (ok) {
                  messenger.showSnackBar(
                    const SnackBar(content: Text('Invoice collected')),
                  );
                }
              },
            ),
          ] else ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Pay remaining supplier balance',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                    ),
                    const SizedBox(height: 10),
                    FormDropdownField<String>(
                      label: 'Purchase / supplier',
                      value: _payPurchaseId,
                      items: provider.ledger.debits
                          .map(
                            (row) => DropdownMenuItem(
                              value: row.id,
                              child: Text(
                                '${row.partyName} · ${row.document} · remaining ${money(row.remainingBalance)}',
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: _pickPurchase,
                    ),
                    const SizedBox(height: 10),
                    TextFormField(
                      controller: _payAmount,
                      decoration: const InputDecoration(
                        labelText: 'Amount to pay',
                      ),
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                    ),
                    const SizedBox(height: 10),
                    FormDropdownField<String>(
                      label: 'Payment method',
                      value: _payMethod,
                      items: methodItems,
                      onChanged: (value) => setState(() => _payMethod = value),
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: provider.busy
                          ? null
                          : () async {
                              if (_payPurchaseId == null || _payMethod == null) {
                                return;
                              }
                              final messenger = ScaffoldMessenger.of(context);
                              final ok = await provider.paySupplier(
                                purchaseOrderId: _payPurchaseId!,
                                amount: double.tryParse(_payAmount.text) ?? 0,
                                paymentMethod: _payMethod!,
                              );
                              if (!mounted) return;
                              if (ok) {
                                setState(() {
                                  _payPurchaseId = null;
                                  _payAmount.clear();
                                });
                                messenger.showSnackBar(
                                  const SnackBar(
                                    content: Text('Supplier paid'),
                                  ),
                                );
                              }
                            },
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.saffron,
                      ),
                      child: Text(
                        provider.busy ? 'Saving…' : 'Pay supplier',
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            _LedgerTable(
              rows: provider.ledger.debits,
              emptyText: 'No unpaid supplier balances.',
              remainingLabel: 'Still to pay',
              busy: provider.busy,
            ),
          ],
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.title,
    required this.value,
    required this.subtitle,
  });

  final String title;
  final String value;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF3CC97A), Color(0xFF1E9F56), Color(0xFF147A40)],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.9),
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 18,
            ),
          ),
          Text(
            subtitle,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.85),
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

class _LedgerTable extends StatelessWidget {
  const _LedgerTable({
    required this.rows,
    required this.emptyText,
    required this.remainingLabel,
    required this.busy,
    this.actionLabel,
    this.onAction,
  });

  final List<LedgerEntry> rows;
  final String emptyText;
  final String remainingLabel;
  final bool busy;
  final String? actionLabel;
  final ValueChanged<LedgerEntry>? onAction;

  static const _headerStyle = TextStyle(
    color: Colors.white,
    fontWeight: FontWeight.w800,
    fontSize: 12,
  );
  static const _cellStyle = TextStyle(color: AppColors.ink, fontSize: 12);

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: EmptyState(
          title: emptyText,
          icon: Icons.receipt_long_outlined,
        ),
      );
    }

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
          constraints: BoxConstraints(
            minWidth: onAction != null ? 860 : 720,
          ),
          child: DataTable(
            headingRowColor: WidgetStateProperty.all(AppColors.brand),
            headingRowHeight: 48,
            dataRowMinHeight: 52,
            dataRowMaxHeight: 68,
            columnSpacing: 16,
            horizontalMargin: 12,
            columns: [
              DataColumn(
                label: Text(
                  onAction != null ? 'Customer' : 'Supplier',
                  style: _headerStyle,
                ),
              ),
              DataColumn(
                label: Text(
                  onAction != null ? 'Items' : 'Items bought',
                  style: _headerStyle,
                ),
              ),
              const DataColumn(label: Text('Paid', style: _headerStyle)),
              DataColumn(label: Text(remainingLabel, style: _headerStyle)),
              DataColumn(
                label: Text(
                  onAction != null ? 'Invoice' : 'Purchase #',
                  style: _headerStyle,
                ),
              ),
              if (onAction != null)
                const DataColumn(label: Text('', style: _headerStyle)),
            ],
            rows: [
              for (var i = 0; i < rows.length; i++)
                DataRow(
                  color: WidgetStateProperty.all(
                    i.isOdd
                        ? AppColors.brand.withValues(alpha: 0.07)
                        : Colors.white,
                  ),
                  cells: [
                    DataCell(
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            rows[i].partyName,
                            style: _cellStyle.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          if (rows[i].partyPhone.isNotEmpty)
                            Text(
                              rows[i].partyPhone,
                              style: const TextStyle(
                                color: AppColors.inkSoft,
                                fontSize: 11,
                              ),
                            ),
                        ],
                      ),
                    ),
                    DataCell(
                      Text(
                        rows[i].items.isEmpty ? '—' : rows[i].items,
                        style: _cellStyle,
                      ),
                    ),
                    DataCell(Text(moneyEtb(rows[i].paidAmount), style: _cellStyle)),
                    DataCell(
                      Text(
                        moneyEtb(rows[i].remainingBalance),
                        style: _cellStyle.copyWith(fontWeight: FontWeight.w800),
                      ),
                    ),
                    DataCell(Text(rows[i].document, style: _cellStyle)),
                    if (onAction != null)
                      DataCell(
                        FilledButton(
                          onPressed: busy ? null : () => onAction!(rows[i]),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.saffron,
                            minimumSize: const Size(0, 34),
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                          ),
                          child: Text(actionLabel ?? 'Collect'),
                        ),
                      ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}
