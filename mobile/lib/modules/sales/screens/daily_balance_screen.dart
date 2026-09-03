import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../core/utils/money_format.dart';
import '../../../database/app_database.dart';
import '../../../models/server_list_models.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/loading/inventory_loading.dart';
import '../providers/sales_provider.dart';

class DailyBalanceScreen extends StatefulWidget {
  const DailyBalanceScreen({
    super.key,
    required this.methods,
    required this.onPay,
  });

  final List<PaymentMethodsCacheData> methods;
  final ValueChanged<ServerSaleLine> onPay;

  @override
  State<DailyBalanceScreen> createState() => _DailyBalanceScreenState();
}

class _DailyBalanceScreenState extends State<DailyBalanceScreen> {
  bool _loading = true;
  String? _error;
  List<ServerSaleLine> _lines = [];
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final lines = await context.read<SalesProvider>().fetchTodaySales();
      if (!mounted) return;
      setState(() {
        _lines = lines;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  List<_ItemTotal> get _itemTotals {
    final map = <String, _ItemTotal>{};
    for (final line in _lines) {
      final id = line.productId.isEmpty ? line.itemId : line.productId;
      final current = map[id];
      if (current == null) {
        map[id] = _ItemTotal(
          name: line.productName,
          unit: line.unit,
          qty: line.quantity,
          withoutVat: line.totalPrice,
          withVat: line.totalWithVat,
        );
      } else {
        map[id] = _ItemTotal(
          name: current.name,
          unit: current.unit,
          qty: current.qty + line.quantity,
          withoutVat: current.withoutVat + line.totalPrice,
          withVat: current.withVat + line.totalWithVat,
        );
      }
    }
    final rows = map.values.toList()
      ..sort((a, b) => b.withVat.compareTo(a.withVat));
    return rows;
  }

  List<_DepositTotal> get _deposits {
    final map = <String, _DepositTotal>{};
    for (final method in widget.methods) {
      map[method.name] = _DepositTotal(name: method.name, paid: 0, invoices: 0);
    }
    final seen = <String>{};
    for (final line in _lines) {
      final key =
          line.paymentMethod.isEmpty ? 'Unknown' : line.paymentMethod;
      if (!seen.add(line.saleId)) continue;
      final current = map[key] ??
          _DepositTotal(name: key, paid: 0, invoices: 0);
      map[key] = _DepositTotal(
        name: current.name,
        paid: current.paid + line.paidAmount,
        invoices: current.invoices + 1,
      );
    }
    return map.values.toList();
  }

  List<ServerSaleLine> get _unpaid {
    final seen = <String>{};
    final rows = <ServerSaleLine>[];
    for (final line in _lines) {
      if (line.remainingBalance <= 0.004) continue;
      if (!seen.add(line.saleId)) continue;
      rows.add(line);
    }
    return rows;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Daily balance check'),
        actions: [
          IconButton(
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: _loading
          ? const InventoryLoading()
          : Column(
              children: [
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: ErrorBanner(message: _error!),
                  ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: SegmentedButton<int>(
                    segments: const [
                      ButtonSegment(value: 0, label: Text('Summary')),
                      ButtonSegment(value: 1, label: Text('Deposits')),
                      ButtonSegment(value: 2, label: Text('Unpaid')),
                    ],
                    selected: {_tab},
                    onSelectionChanged: (value) =>
                        setState(() => _tab = value.first),
                  ),
                ),
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        if (_tab == 0) ...[
                          Text(
                            'Today · ${_lines.map((e) => e.saleId).toSet().length} sales',
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 10),
                          if (_itemTotals.isEmpty)
                            const EmptyState(
                              title: 'No sales today',
                              icon: Icons.today_outlined,
                            )
                          else
                            ..._itemTotals.map(
                              (row) => Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                child: ListTile(
                                  title: Text(
                                    row.name,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  subtitle: Text(
                                    '${qty(row.qty)}${row.unit.isEmpty ? '' : ' ${row.unit}'} · net ${moneyEtb(row.withoutVat)}',
                                  ),
                                  trailing: Text(
                                    moneyEtb(row.withVat),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.brand,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                        ] else if (_tab == 1) ...[
                          ..._deposits.map(
                            (row) => Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                title: Text(
                                  row.name,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                subtitle: Text(
                                  '${row.invoices} invoice${row.invoices == 1 ? '' : 's'}',
                                ),
                                trailing: Text(
                                  moneyEtb(row.paid),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ] else ...[
                          if (_unpaid.isEmpty)
                            const EmptyState(
                              title: 'No unpaid sales today',
                              icon: Icons.check_circle_outline,
                            )
                          else
                            ..._unpaid.map(
                              (line) => Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                child: ListTile(
                                  title: Text(line.invoiceNumber),
                                  subtitle: Text(
                                    '${line.customerName} · unpaid ${moneyEtb(line.remainingBalance)}',
                                  ),
                                  trailing: FilledButton(
                                    onPressed: () {
                                      Navigator.pop(context);
                                      widget.onPay(line);
                                    },
                                    style: FilledButton.styleFrom(
                                      backgroundColor: AppColors.saffron,
                                    ),
                                    child: const Text('Pay'),
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}

class _ItemTotal {
  _ItemTotal({
    required this.name,
    required this.unit,
    required this.qty,
    required this.withoutVat,
    required this.withVat,
  });

  final String name;
  final String unit;
  final double qty;
  final double withoutVat;
  final double withVat;
}

class _DepositTotal {
  _DepositTotal({
    required this.name,
    required this.paid,
    required this.invoices,
  });

  final String name;
  final double paid;
  final int invoices;
}
