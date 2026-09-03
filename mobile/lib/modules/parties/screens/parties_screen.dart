import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../core/utils/money_format.dart';
import '../../../models/party_models.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/common/form_dropdown.dart';
import '../../../widgets/loading/inventory_loading.dart';
import '../../sync/providers/sync_provider.dart';
import '../providers/parties_provider.dart';
import 'customer_wallets_screen.dart';

class PartiesScreen extends StatefulWidget {
  const PartiesScreen({super.key, this.onOpenWallets});

  final VoidCallback? onOpenWallets;

  @override
  State<PartiesScreen> createState() => _PartiesScreenState();
}

class _PartiesScreenState extends State<PartiesScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _location = TextEditingController();
  String _type = 'CUSTOMER';

  String? _paymentPartyId;
  final _paymentAmount = TextEditingController();
  String? _paymentMethod;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final provider = context.read<PartiesProvider>();
      await provider.refreshParties();
      if (!mounted) return;
      setState(() {
        _paymentMethod = provider.methods.isNotEmpty
            ? provider.methods.first.name
            : 'CASH';
      });
    });
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _location.dispose();
    _paymentAmount.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<PartiesProvider>();
    final sync = context.watch<SyncProvider>();
    final online = sync.isOperatingOnline;

    if (provider.loading && provider.parties.isEmpty) {
      return const InventoryLoading();
    }

    if (!online) {
      return const EmptyState(
        title: 'Customers & suppliers offline',
        subtitle: 'Switch to Auto or Online to manage parties.',
        icon: Icons.groups_outlined,
      );
    }

    final methodItems = (provider.methods.isNotEmpty
            ? provider.methods.map((m) => m.name)
            : const ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER'])
        .map((name) => DropdownMenuItem(value: name, child: Text(name)))
        .toList();

    return RefreshIndicator(
      onRefresh: provider.refreshParties,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Customers & suppliers',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: AppColors.ink,
                          ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Register customers and suppliers with name, phone, and address. Recharge wallets, then deduct on a sale or take a direct payment.',
                      style: TextStyle(color: AppColors.inkSoft),
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: () {
                  if (widget.onOpenWallets != null) {
                    widget.onOpenWallets!();
                    return;
                  }
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const CustomerWalletsScreen(),
                    ),
                  );
                },
                child: const Text('Wallets'),
              ),
            ],
          ),
          if (provider.error != null) ...[
            const SizedBox(height: 12),
            ErrorBanner(message: provider.error!),
          ],
          const SizedBox(height: 14),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Register',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _name,
                    decoration: const InputDecoration(labelText: 'Name'),
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _phone,
                    decoration: const InputDecoration(labelText: 'Phone'),
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _location,
                    decoration: const InputDecoration(labelText: 'Address'),
                  ),
                  const SizedBox(height: 10),
                  FormDropdownField<String>(
                    label: 'Type',
                    value: _type,
                    items: const [
                      DropdownMenuItem(
                        value: 'CUSTOMER',
                        child: Text('Customer'),
                      ),
                      DropdownMenuItem(
                        value: 'SUPPLIER',
                        child: Text('Supplier'),
                      ),
                    ],
                    onChanged: (value) =>
                        setState(() => _type = value ?? 'CUSTOMER'),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: provider.busy
                        ? null
                        : () async {
                            final messenger = ScaffoldMessenger.of(context);
                            final ok = await provider.createParty(
                              name: _name.text.trim(),
                              phone: _phone.text.trim(),
                              location: _location.text.trim(),
                              type: _type,
                            );
                            if (!mounted) return;
                            if (ok) {
                              _name.clear();
                              _phone.clear();
                              _location.clear();
                              messenger.showSnackBar(
                                const SnackBar(
                                  content: Text('Party registered'),
                                ),
                              );
                            }
                          },
                    child: Text(provider.busy ? 'Saving…' : 'Save'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Debit / remaining payment',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                  ),
                  const SizedBox(height: 10),
                  FormDropdownField<String>(
                    label: 'Customer or supplier',
                    value: _paymentPartyId,
                    items: provider.parties
                        .map(
                          (c) => DropdownMenuItem(
                            value: c.id,
                            child: Text(
                              '${c.name} · ${c.typeLabel} · remaining ${money(c.debt)}',
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      PartyRow? party;
                      for (final row in provider.parties) {
                        if (row.id == value) {
                          party = row;
                          break;
                        }
                      }
                      setState(() {
                        _paymentPartyId = value;
                        if (party != null && party.debt > 0) {
                          _paymentAmount.text = money(party.debt);
                        }
                      });
                    },
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _paymentAmount,
                    decoration: const InputDecoration(labelText: 'Amount'),
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                  ),
                  const SizedBox(height: 10),
                  FormDropdownField<String>(
                    label: 'Method',
                    value: _paymentMethod,
                    items: methodItems,
                    onChanged: (value) =>
                        setState(() => _paymentMethod = value),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: provider.busy
                        ? null
                        : () async {
                            if (_paymentPartyId == null ||
                                _paymentMethod == null) {
                              return;
                            }
                            final messenger = ScaffoldMessenger.of(context);
                            final ok = await provider.recordPayment(
                              partyId: _paymentPartyId!,
                              amount:
                                  double.tryParse(_paymentAmount.text) ?? 0,
                              method: _paymentMethod!,
                            );
                            if (!mounted) return;
                            if (ok) {
                              setState(() {
                                _paymentPartyId = null;
                                _paymentAmount.clear();
                              });
                              messenger.showSnackBar(
                                const SnackBar(
                                  content: Text('Payment recorded'),
                                ),
                              );
                            }
                          },
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.saffron,
                    ),
                    child: Text(
                      provider.busy ? 'Saving…' : 'Record payment',
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          if (provider.parties.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: EmptyState(
                title: 'No customers or suppliers yet',
                subtitle: 'Register the first party above.',
                icon: Icons.groups_outlined,
              ),
            )
          else
            _PartiesTable(rows: provider.parties),
        ],
      ),
    );
  }
}

class _PartiesTable extends StatelessWidget {
  const _PartiesTable({required this.rows});

  final List<PartyRow> rows;

  static const _headerStyle = TextStyle(
    color: Colors.white,
    fontWeight: FontWeight.w800,
    fontSize: 12,
  );
  static const _cellStyle = TextStyle(color: AppColors.ink, fontSize: 12);

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
            headingRowHeight: 48,
            dataRowMinHeight: 56,
            dataRowMaxHeight: 72,
            columnSpacing: 16,
            horizontalMargin: 12,
            columns: const [
              DataColumn(label: Text('Name', style: _headerStyle)),
              DataColumn(label: Text('Type', style: _headerStyle)),
              DataColumn(label: Text('Address', style: _headerStyle)),
              DataColumn(label: Text('Wallet', style: _headerStyle)),
              DataColumn(label: Text('Remaining', style: _headerStyle)),
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
                            rows[i].name,
                            style: _cellStyle.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text(
                            rows[i].phone,
                            style: const TextStyle(
                              color: AppColors.inkSoft,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                    DataCell(Text(rows[i].typeLabel, style: _cellStyle)),
                    DataCell(
                      Text(
                        rows[i].location.isEmpty ? '—' : rows[i].location,
                        style: _cellStyle,
                      ),
                    ),
                    DataCell(
                      Text(
                        rows[i].type == 'CUSTOMER'
                            ? moneyEtb(rows[i].walletBalance)
                            : '—',
                        style: _cellStyle,
                      ),
                    ),
                    DataCell(
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            money(rows[i].debt),
                            style: _cellStyle.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text(
                            rows[i].standingLabel,
                            style: const TextStyle(
                              color: AppColors.inkSoft,
                              fontSize: 11,
                            ),
                          ),
                        ],
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
