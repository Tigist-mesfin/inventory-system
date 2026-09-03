import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../core/utils/money_format.dart';
import '../../../models/party_models.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/common/form_dropdown.dart';
import '../../../widgets/loading/inventory_loading.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/services/auth_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../providers/parties_provider.dart';

class CustomerWalletsScreen extends StatefulWidget {
  const CustomerWalletsScreen({super.key});

  @override
  State<CustomerWalletsScreen> createState() => _CustomerWalletsScreenState();
}

class _CustomerWalletsScreenState extends State<CustomerWalletsScreen> {
  String? _customerId;
  final _amount = TextEditingController();
  String? _method;
  final _reason = TextEditingController();
  late String _paidAt;
  String _filterCustomerId = '';
  String _filterType = '';
  final _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _paidAt =
        '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final provider = context.read<PartiesProvider>();
      await provider.refreshWallets();
      if (!mounted) return;
      setState(() {
        _method = provider.methods.isNotEmpty
            ? provider.methods.first.name
            : 'CASH';
      });
    });
  }

  @override
  void dispose() {
    _amount.dispose();
    _reason.dispose();
    _search.dispose();
    super.dispose();
  }

  Future<void> _reload() {
    return context.read<PartiesProvider>().refreshWallets(
          search: _search.text.trim(),
          customerId: _filterCustomerId,
          type: _filterType,
        );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<PartiesProvider>();
    final sync = context.watch<SyncProvider>();
    final auth = context.watch<AuthProvider>();
    final online = sync.isOperatingOnline;
    final canCreate = PermissionHelper.can(auth.user, 'customers', 'CREATE');

    if (provider.loading &&
        provider.wallets.isEmpty &&
        provider.transactions.isEmpty) {
      return const InventoryLoading();
    }

    final methodItems = (provider.methods.isNotEmpty
            ? provider.methods.map((m) => m.name)
            : const ['CASH'])
        .map((name) => DropdownMenuItem(value: name, child: Text(name)))
        .toList();

    PartyRow? selected;
    for (final row in provider.wallets) {
      if (row.id == _customerId) {
        selected = row;
        break;
      }
    }

    return !online
        ? const EmptyState(
            title: 'Wallets offline',
            subtitle: 'Switch to Auto or Online to manage wallets.',
            icon: Icons.account_balance_wallet_outlined,
          )
        : RefreshIndicator(
            onRefresh: _reload,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
              children: [
                Text(
                  'Customer wallets',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.ink,
                      ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Recharge a customer balance, then deduct it on a sale or take a direct payment.',
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
                            'Recharge wallet',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 10),
                          FormDropdownField<String>(
                            label: 'Customer',
                            value: _customerId,
                            items: provider.wallets
                                .map(
                                  (row) => DropdownMenuItem(
                                    value: row.id,
                                    child: Text(
                                      '${row.name} · wallet ${money(row.walletBalance)}',
                                    ),
                                  ),
                                )
                                .toList(),
                            onChanged: (value) =>
                                setState(() => _customerId = value),
                          ),
                          const SizedBox(height: 10),
                          TextFormField(
                            controller: _amount,
                            decoration: const InputDecoration(
                              labelText: 'Amount (ETB)',
                            ),
                            keyboardType:
                                const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                          ),
                          const SizedBox(height: 10),
                          FormDropdownField<String>(
                            label: 'Payment method deposited',
                            value: _method,
                            items: methodItems,
                            onChanged: (value) =>
                                setState(() => _method = value),
                          ),
                          const SizedBox(height: 10),
                          OutlinedButton(
                            onPressed: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate:
                                    DateTime.tryParse(_paidAt) ?? DateTime.now(),
                                firstDate: DateTime(2020),
                                lastDate: DateTime.now()
                                    .add(const Duration(days: 365)),
                              );
                              if (picked == null) return;
                              setState(() {
                                _paidAt =
                                    '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
                              });
                            },
                            child: Text('Date: $_paidAt'),
                          ),
                          const SizedBox(height: 10),
                          TextFormField(
                            controller: _reason,
                            decoration: const InputDecoration(
                              labelText: 'Reason',
                              hintText: 'Advance, top-up, deposit for order…',
                            ),
                          ),
                          if (selected != null) ...[
                            const SizedBox(height: 8),
                            Text(
                              'Current wallet for ${selected.name}: ${moneyEtb(selected.walletBalance)}',
                              style: const TextStyle(color: AppColors.inkSoft),
                            ),
                          ],
                          const SizedBox(height: 12),
                          FilledButton(
                            onPressed: provider.busy
                                ? null
                                : () async {
                                    if (_customerId == null || _method == null) {
                                      return;
                                    }
                                    final messenger =
                                        ScaffoldMessenger.of(context);
                                    final ok = await provider.rechargeWallet(
                                      customerId: _customerId!,
                                      amount:
                                          double.tryParse(_amount.text) ?? 0,
                                      method: _method!,
                                      reason: _reason.text.trim(),
                                      paidAtIso: '${_paidAt}T12:00:00.000Z',
                                    );
                                    if (!mounted) return;
                                    if (ok) {
                                      _amount.clear();
                                      _reason.clear();
                                      messenger.showSnackBar(
                                        const SnackBar(
                                          content: Text('Deposit saved'),
                                        ),
                                      );
                                    }
                                  },
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.saffron,
                            ),
                            child: Text(
                              provider.busy ? 'Saving…' : 'Save deposit',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                Text(
                  'Customer balances',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 8),
                if (provider.wallets.isEmpty)
                  const EmptyState(
                    title: 'No customer wallets',
                    icon: Icons.account_balance_wallet_outlined,
                  )
                else
                  _WalletsBalanceTable(rows: provider.wallets),
                const SizedBox(height: 14),
                Text(
                  'Wallet history',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Deposits show the payment method and reason. Sales show when the wallet was deducted.',
                  style: TextStyle(color: AppColors.inkSoft, fontSize: 13),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _search,
                  decoration: const InputDecoration(
                    labelText: 'Search name, phone, method, reason',
                    prefixIcon: Icon(Icons.search),
                  ),
                  onSubmitted: (_) => _reload(),
                ),
                const SizedBox(height: 8),
                FormDropdownField<String>(
                  label: 'Customer filter',
                  value: _filterCustomerId,
                  items: [
                    const DropdownMenuItem(
                      value: '',
                      child: Text('All customers'),
                    ),
                    ...provider.wallets.map(
                      (row) => DropdownMenuItem(
                        value: row.id,
                        child: Text(row.name),
                      ),
                    ),
                  ],
                  onChanged: (value) {
                    setState(() => _filterCustomerId = value ?? '');
                    _reload();
                  },
                ),
                const SizedBox(height: 8),
                FormDropdownField<String>(
                  label: 'Type',
                  value: _filterType,
                  items: const [
                    DropdownMenuItem(value: '', child: Text('All types')),
                    DropdownMenuItem(
                      value: 'DEPOSIT',
                      child: Text('Deposit'),
                    ),
                    DropdownMenuItem(
                      value: 'SALE',
                      child: Text('Sale deduct'),
                    ),
                    DropdownMenuItem(
                      value: 'REFUND',
                      child: Text('Refund'),
                    ),
                  ],
                  onChanged: (value) {
                    setState(() => _filterType = value ?? '');
                    _reload();
                  },
                ),
                const SizedBox(height: 10),
                if (provider.transactions.isEmpty)
                  const EmptyState(
                    title: 'No wallet transactions',
                    icon: Icons.history,
                  )
                else
                  _WalletHistoryTable(rows: provider.transactions),
              ],
            ),
          );
  }
}

class _WalletsBalanceTable extends StatelessWidget {
  const _WalletsBalanceTable({required this.rows});

  final List<PartyRow> rows;

  static const _headerStyle = TextStyle(
    color: Colors.white,
    fontWeight: FontWeight.w700,
  );

  @override
  Widget build(BuildContext context) {
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
          constraints: const BoxConstraints(minWidth: 560),
          child: DataTable(
            headingRowColor: WidgetStateProperty.all(AppColors.brand),
            headingRowHeight: 46,
            dataRowMinHeight: 52,
            dataRowMaxHeight: 68,
            columnSpacing: 18,
            columns: const [
              DataColumn(label: Text('Customer', style: _headerStyle)),
              DataColumn(label: Text('Phone', style: _headerStyle)),
              DataColumn(label: Text('Wallet', style: _headerStyle)),
              DataColumn(label: Text('Unpaid sales', style: _headerStyle)),
            ],
            rows: rows
                .map(
                  (row) => DataRow(
                    cells: [
                      DataCell(
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              row.name,
                              style:
                                  const TextStyle(fontWeight: FontWeight.w800),
                            ),
                            if (row.businessName != null &&
                                row.businessName!.isNotEmpty)
                              Text(
                                row.businessName!,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.inkSoft,
                                ),
                              ),
                          ],
                        ),
                      ),
                      DataCell(Text(row.phone)),
                      DataCell(
                        Text(
                          moneyEtb(row.walletBalance),
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            color: AppColors.brand,
                          ),
                        ),
                      ),
                      DataCell(Text(moneyEtb(row.debt))),
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

class _WalletHistoryTable extends StatelessWidget {
  const _WalletHistoryTable({required this.rows});

  final List<WalletTransactionRow> rows;

  static const _headerStyle = TextStyle(
    color: Colors.white,
    fontWeight: FontWeight.w700,
  );

  @override
  Widget build(BuildContext context) {
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
          constraints: const BoxConstraints(minWidth: 720),
          child: DataTable(
            headingRowColor: WidgetStateProperty.all(AppColors.brand),
            headingRowHeight: 46,
            dataRowMinHeight: 52,
            dataRowMaxHeight: 72,
            columnSpacing: 16,
            columns: const [
              DataColumn(label: Text('Date', style: _headerStyle)),
              DataColumn(label: Text('Customer', style: _headerStyle)),
              DataColumn(label: Text('Type', style: _headerStyle)),
              DataColumn(label: Text('Method', style: _headerStyle)),
              DataColumn(label: Text('Reason', style: _headerStyle)),
              DataColumn(label: Text('Amount', style: _headerStyle)),
            ],
            rows: rows
                .map(
                  (tx) => DataRow(
                    cells: [
                      DataCell(Text(tx.dayText)),
                      DataCell(Text(tx.customerName)),
                      DataCell(Text(tx.typeLabel)),
                      DataCell(Text(tx.method.isEmpty ? '—' : tx.method)),
                      DataCell(Text(tx.reason.isEmpty ? '—' : tx.reason)),
                      DataCell(
                        Text(
                          moneyEtb(tx.amount),
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            color: tx.type == 'SALE'
                                ? AppColors.coral
                                : AppColors.brand,
                          ),
                        ),
                      ),
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
