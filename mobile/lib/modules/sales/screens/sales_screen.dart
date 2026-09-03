import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../core/utils/money_format.dart';
import '../../../database/app_database.dart';
import '../../../models/server_list_models.dart';
import '../../../widgets/common/connection_status_banner.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/common/form_dropdown.dart';
import '../../../widgets/loading/inventory_loading.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/services/auth_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../providers/sales_provider.dart';
import '../services/sales_service.dart';
import 'daily_balance_screen.dart';
import 'sale_form_screen.dart';

const _periods = [
  ('today', 'Today'),
  ('yesterday', 'Yesterday'),
  ('this_month', 'This month'),
  ('this_year', 'This year'),
  ('all', 'All sales'),
];

class SalesScreen extends StatefulWidget {
  const SalesScreen({super.key});

  @override
  State<SalesScreen> createState() => _SalesScreenState();
}

class _SalesScreenState extends State<SalesScreen> {
  List<ProductsCacheData> _products = [];
  List<CustomersCacheData> _customers = [];
  List<PaymentMethodsCacheData> _methods = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  Future<void> _bootstrap() async {
    final provider = context.read<SalesProvider>();
    final auth = context.read<AuthProvider>();
    await provider.refreshLists(user: auth.user);
    final results = await Future.wait([
      provider.allProducts(),
      provider.customers(),
      provider.paymentMethods(),
    ]);
    if (!mounted) return;
    setState(() {
      _products = results[0] as List<ProductsCacheData>;
      _customers = results[1] as List<CustomersCacheData>;
      _methods = results[2] as List<PaymentMethodsCacheData>;
    });
  }

  Future<void> _refresh() async {
    final auth = context.read<AuthProvider>();
    await context.read<SalesProvider>().refreshLists(user: auth.user);
  }

  Future<void> _openPay(ServerSaleLine line) async {
    final provider = context.read<SalesProvider>();
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.paper2,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _PaySaleSheet(
        line: line,
        methods: _methods,
        onSave: ({required double amount, required String paymentMethod}) async {
          final ok = await provider.recordPayment(
            saleId: line.saleId,
            amount: amount,
            paymentMethod: paymentMethod,
          );
          if (ok && ctx.mounted) Navigator.pop(ctx);
          return ok;
        },
      ),
    );
  }

  Future<void> _confirmDelete(ServerSaleLine line) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete sale?'),
        content: Text(
          'Delete ${line.invoiceNumber}? Stock from this sale will be returned to the store.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.coral),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    final success =
        await context.read<SalesProvider>().cancelSale(line.saleId);
    if (!mounted) return;
    if (success) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Sale deleted — stock returned')),
      );
    }
  }

  void _openView(ServerSaleLine line) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.paper2,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              line.invoiceNumber,
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 8),
            Text('${line.dayText} · ${line.customerName}'),
            Text('${line.productName} · ${qty(line.quantity)} ${line.unit}'),
            Text('Cost with VAT: ${moneyEtb(line.totalWithVat)}'),
            Text('Paid: ${moneyEtb(line.paidAmount)} · Remaining: ${moneyEtb(line.remainingBalance)}'),
            Text('Status: ${line.paidLabel} · ${line.paymentMethod}'),
            if (line.salesman.isNotEmpty) Text('Salesman: ${line.salesman}'),
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Close'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<SalesProvider>();
    final sync = context.watch<SyncProvider>();
    final auth = context.watch<AuthProvider>();
    final online = sync.isOperatingOnline;
    final owner = PermissionHelper.isOwner(auth.user);
    final showCost = owner || PermissionHelper.can(auth.user, 'finance', 'READ');
    final canCreate = PermissionHelper.can(auth.user, 'sales', 'CREATE');
    final canUpdate = PermissionHelper.can(auth.user, 'sales', 'UPDATE');

    return StreamBuilder<List<LocalSale>>(
      stream: provider.watchLocalSales(),
      builder: (context, snapshot) {
        final localRows = snapshot.data ?? [];
        final pendingLocal =
            localRows.where((row) => row.syncStatus != 'synced').toList();

        if (provider.listLoading &&
            provider.serverLines.isEmpty &&
            localRows.isEmpty) {
          return const InventoryLoading();
        }

        return RefreshIndicator(
          onRefresh: _refresh,
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
                          'Sales',
                          style: Theme.of(context)
                              .textTheme
                              .headlineSmall
                              ?.copyWith(
                                fontWeight: FontWeight.w800,
                                color: AppColors.ink,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          online
                              ? 'Completed shop sales only. Totals follow the selected period and filters.'
                              : 'Offline — local pending sales only.',
                          style: const TextStyle(color: AppColors.inkSoft),
                        ),
                      ],
                    ),
                  ),
                  if (online)
                    TextButton(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => DailyBalanceScreen(
                              methods: _methods,
                              onPay: _openPay,
                            ),
                          ),
                        );
                      },
                      child: const Text('Daily balance'),
                    ),
                ],
              ),
              if (provider.listError != null) ...[
                const SizedBox(height: 12),
                ErrorBanner(message: provider.listError!),
              ],
              if (pendingLocal.isNotEmpty) ...[
                const SizedBox(height: 14),
                Text(
                  'Pending on device',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 8),
                ...pendingLocal.map(
                  (row) => Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: ListTile(
                      title: Text(
                        row.invoiceNumber ?? row.warehouseName ?? 'Local sale',
                      ),
                      subtitle: Text(
                        '${row.paymentMethod} · ${moneyEtb(row.paidAmount)}\n'
                        '${row.sourceMode} · ${row.createdAt}',
                      ),
                      isThreeLine: true,
                      trailing: SyncStatusBadge(status: row.syncStatus),
                    ),
                  ),
                ),
              ],
              if (online) ...[
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _periods.map((period) {
                    final selected = provider.filters.period == period.$1;
                    return ChoiceChip(
                      label: Text(period.$2),
                      selected: selected,
                      selectedColor: AppColors.brand.withValues(alpha: 0.2),
                      onSelected: (_) => provider.setPeriod(period.$1),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 12),
                if (provider.methodStats.isNotEmpty)
                  SizedBox(
                    height: 120,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: provider.methodStats
                          .map(
                            (stat) => _MethodStatCard(
                              stat: stat,
                              selected:
                                  provider.filters.paymentMethod == stat.name,
                              onTap: () => provider
                                  .togglePaymentMethodFilter(stat.name),
                            ),
                          )
                          .toList(),
                    ),
                  ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                'Sale records',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.copyWith(fontWeight: FontWeight.w800),
                              ),
                            ),
                            if (canCreate)
                              TextButton.icon(
                                onPressed: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => const SaleFormScreen(),
                                    ),
                                  );
                                },
                                icon: const Icon(Icons.add),
                                label: const Text('Add sale'),
                              ),
                            TextButton(
                              onPressed: () => provider.setShowAllColumns(
                                !provider.showAllColumns,
                              ),
                              child: Text(
                                provider.showAllColumns
                                    ? 'Basic columns'
                                    : 'Show all columns',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        _SalesFiltersPanel(
                          filters: provider.filters,
                          products: _products,
                          customers: _customers,
                          methods: _methods,
                          salesmen: provider.salesmen,
                          owner: owner,
                          userId: auth.user?['id']?.toString(),
                          userName: auth.user?['fullName']?.toString(),
                          onChanged: provider.setFilters,
                        ),
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.brand.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${provider.periodLabel} sales',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              Text(
                                '${provider.saleCount} sale${provider.saleCount == 1 ? '' : 's'} · ${qty(provider.totals.qtySold)} sold',
                              ),
                              Text(
                                'Without VAT ${moneyEtb(provider.totals.withoutVat)} · '
                                'VAT ${kVatRate.toStringAsFixed(0)}% ${moneyEtb(provider.totals.vat)} · '
                                'Total with VAT ${moneyEtb(provider.totals.withVat)}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 10),
                        if (provider.serverLines.isEmpty)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 24),
                            child: EmptyState(
                              title: 'No sales for this filter',
                              subtitle: 'Change period/filters or add a sale.',
                              icon: Icons.point_of_sale,
                            ),
                          )
                        else
                          _SalesRecordsTable(
                            lines: provider.serverLines,
                            showAll: provider.showAllColumns,
                            showCost: showCost,
                            canCreate: canCreate,
                            canUpdate: canUpdate,
                            onPay: _openPay,
                            onDelete: _confirmDelete,
                            onView: _openView,
                          ),
                      ],
                    ),
                  ),
                ),
              ] else if (pendingLocal.isEmpty) ...[
                SizedBox(
                  height: MediaQuery.of(context).size.height * 0.45,
                  child: const EmptyState(
                    title: 'No local sales yet',
                    subtitle: 'Tap + Sale to record a sale offline.',
                    icon: Icons.point_of_sale,
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _MethodStatCard extends StatelessWidget {
  const _MethodStatCard({
    required this.stat,
    required this.selected,
    required this.onTap,
  });

  final SaleMethodStat stat;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          width: 180,
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: selected
                ? Border.all(color: Colors.white, width: 2)
                : null,
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFF3CC97A),
                Color(0xFF1E9F56),
                Color(0xFF147A40),
              ],
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.brand.withValues(alpha: 0.28),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                stat.name,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.92),
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                money(stat.total),
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 22,
                ),
              ),
              Text(
                '${stat.count} item${stat.count == 1 ? '' : 's'} · ${qty(stat.qty)} sold',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.85),
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SalesFiltersPanel extends StatelessWidget {
  const _SalesFiltersPanel({
    required this.filters,
    required this.products,
    required this.customers,
    required this.methods,
    required this.salesmen,
    required this.owner,
    required this.onChanged,
    this.userId,
    this.userName,
  });

  final SalesFilters filters;
  final List<ProductsCacheData> products;
  final List<CustomersCacheData> customers;
  final List<PaymentMethodsCacheData> methods;
  final List<TeamSalesman> salesmen;
  final bool owner;
  final String? userId;
  final String? userName;
  final ValueChanged<SalesFilters> onChanged;

  Future<void> _pickDate({
    required BuildContext context,
    required bool isFrom,
  }) async {
    final initial = DateTime.tryParse(isFrom ? filters.from : filters.to) ??
        DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked == null) return;
    final formatted = SalesFilters.isoLocal(picked);
    onChanged(
      filters.copyWith(
        period: 'custom',
        from: isFrom ? formatted : filters.from,
        to: isFrom ? filters.to : formatted,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final cols = width >= 720 ? 3 : width >= 340 ? 2 : 1;
        final fieldWidth = (width - (cols - 1) * 8) / cols;

        Widget sized(Widget child) => SizedBox(width: fieldWidth, child: child);

        return Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            sized(
              OutlinedButton(
                onPressed: () => _pickDate(context: context, isFrom: true),
                child: Text(
                  filters.from.isEmpty ? 'From date' : 'From ${filters.from}',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
            sized(
              OutlinedButton(
                onPressed: () => _pickDate(context: context, isFrom: false),
                child: Text(
                  filters.to.isEmpty ? 'To date' : 'To ${filters.to}',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
            sized(
              FormDropdownField<String>(
                label: 'Item',
                value: filters.productId,
                items: [
                  const DropdownMenuItem(value: '', child: Text('All items')),
                  ...products.map(
                    (p) => DropdownMenuItem(value: p.id, child: Text(p.name)),
                  ),
                ],
                onChanged: (value) =>
                    onChanged(filters.copyWith(productId: value ?? '')),
              ),
            ),
            sized(
              FormDropdownField<String>(
                label: 'Customer',
                value: filters.customerId,
                items: [
                  const DropdownMenuItem(
                    value: '',
                    child: Text('All customers'),
                  ),
                  const DropdownMenuItem(
                    value: 'walkin',
                    child: Text('Walk-in'),
                  ),
                  ...customers.map(
                    (c) => DropdownMenuItem(value: c.id, child: Text(c.name)),
                  ),
                ],
                onChanged: (value) =>
                    onChanged(filters.copyWith(customerId: value ?? '')),
              ),
            ),
            sized(
              FormDropdownField<String>(
                label: 'Payment method',
                value: filters.paymentMethod,
                items: [
                  const DropdownMenuItem(
                    value: '',
                    child: Text('All methods'),
                  ),
                  ...methods.map(
                    (m) =>
                        DropdownMenuItem(value: m.name, child: Text(m.name)),
                  ),
                ],
                onChanged: (value) =>
                    onChanged(filters.copyWith(paymentMethod: value ?? '')),
              ),
            ),
            if (owner)
              sized(
                FormDropdownField<String>(
                  label: 'Salesman',
                  value: filters.createdBy,
                  items: [
                    const DropdownMenuItem(
                      value: '',
                      child: Text('All staff'),
                    ),
                    if (userId != null)
                      DropdownMenuItem(
                        value: userId,
                        child: Text('${userName ?? 'You'} (you)'),
                      ),
                    ...salesmen.map(
                      (s) => DropdownMenuItem(
                        value: s.id,
                        child: Text(s.fullName),
                      ),
                    ),
                  ],
                  onChanged: (value) =>
                      onChanged(filters.copyWith(createdBy: value ?? '')),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _SalesRecordsTable extends StatelessWidget {
  const _SalesRecordsTable({
    required this.lines,
    required this.showAll,
    required this.showCost,
    required this.canCreate,
    required this.canUpdate,
    required this.onPay,
    required this.onDelete,
    required this.onView,
  });

  final List<ServerSaleLine> lines;
  final bool showAll;
  final bool showCost;
  final bool canCreate;
  final bool canUpdate;
  final ValueChanged<ServerSaleLine> onPay;
  final ValueChanged<ServerSaleLine> onDelete;
  final ValueChanged<ServerSaleLine> onView;

  static const _headerStyle = TextStyle(
    color: Colors.white,
    fontWeight: FontWeight.w800,
    fontSize: 12,
  );
  static const _cellStyle = TextStyle(color: AppColors.ink, fontSize: 12);

  DataColumn _col(String label) =>
      DataColumn(label: Text(label, style: _headerStyle));

  DataCell _cell(String text, {bool bold = false}) => DataCell(
        Text(
          text,
          style: bold
              ? _cellStyle.copyWith(fontWeight: FontWeight.w800)
              : _cellStyle,
        ),
      );

  @override
  Widget build(BuildContext context) {
    final minWidth = showAll
        ? (showCost ? 1400.0 : 1200.0)
        : (showCost ? 980.0 : 860.0);

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
          constraints: BoxConstraints(minWidth: minWidth),
          child: DataTable(
            headingRowColor: WidgetStateProperty.all(AppColors.brand),
            headingRowHeight: 48,
            dataRowMinHeight: 52,
            dataRowMaxHeight: 72,
            columnSpacing: 16,
            horizontalMargin: 12,
            border: TableBorder(
              horizontalInside: BorderSide(
                color: AppColors.brand.withValues(alpha: 0.12),
              ),
            ),
            columns: [
              _col('Date'),
              _col('Item'),
              _col('Qty'),
              if (showAll) _col('Amount'),
              if (showAll) _col('Total'),
              _col('Cost with VAT'),
              if (showCost) _col('Purchase price'),
              if (showCost) _col('Profit'),
              _col('Customer'),
              _col('Payment method'),
              _col('Paid amount'),
              _col('Remaining'),
              if (showAll) _col('Purchase date'),
              if (showAll) _col('Salesman'),
              _col('Status'),
              _col('Actions'),
            ],
            rows: [
              for (var i = 0; i < lines.length; i++)
                DataRow(
                  color: WidgetStateProperty.all(
                    i.isOdd
                        ? AppColors.brand.withValues(alpha: 0.07)
                        : Colors.white,
                  ),
                  cells: [
                    _cell(lines[i].dayText),
                    _cell(lines[i].productName, bold: true),
                    _cell(
                      '${qty(lines[i].quantity)}'
                      '${lines[i].unit.isEmpty ? '' : ' ${lines[i].unit}'}',
                    ),
                    if (showAll) _cell(money(lines[i].unitPrice)),
                    if (showAll) _cell(money(lines[i].totalPrice)),
                    _cell(money(lines[i].totalWithVat)),
                    if (showCost) _cell(money(lines[i].purchaseUnitCost)),
                    if (showCost) _cell(money(lines[i].profit)),
                    _cell(lines[i].customerName),
                    _cell(
                      lines[i].paymentMethod.isEmpty
                          ? '—'
                          : lines[i].paymentMethod,
                    ),
                    _cell(money(lines[i].paidAmount)),
                    _cell(
                      lines[i].remainingBalance > 0.004
                          ? money(lines[i].remainingBalance)
                          : '—',
                    ),
                    if (showAll) _cell(lines[i].purchaseDateText),
                    if (showAll) _cell(lines[i].salesman),
                    _cell(lines[i].paidLabel),
                    DataCell(
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (lines[i].remainingBalance > 0.004 && canCreate)
                            Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: FilledButton(
                                onPressed: () => onPay(lines[i]),
                                style: FilledButton.styleFrom(
                                  backgroundColor: AppColors.saffron,
                                  foregroundColor: Colors.white,
                                  minimumSize: const Size(0, 32),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                  ),
                                  textStyle: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 11,
                                  ),
                                ),
                                child: const Text('Pay'),
                              ),
                            ),
                          if (canUpdate)
                            Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: OutlinedButton(
                                onPressed: () => onDelete(lines[i]),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.coral,
                                  minimumSize: const Size(0, 32),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                  ),
                                ),
                                child: const Text('Delete'),
                              ),
                            ),
                          TextButton(
                            onPressed: () => onView(lines[i]),
                            child: const Text('View'),
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

class _PaySaleSheet extends StatefulWidget {
  const _PaySaleSheet({
    required this.line,
    required this.methods,
    required this.onSave,
  });

  final ServerSaleLine line;
  final List<PaymentMethodsCacheData> methods;
  final Future<bool> Function({
    required double amount,
    required String paymentMethod,
  }) onSave;

  @override
  State<_PaySaleSheet> createState() => _PaySaleSheetState();
}

class _PaySaleSheetState extends State<_PaySaleSheet> {
  late final TextEditingController _amount;
  late String _method;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _amount = TextEditingController(
      text: money(widget.line.remainingBalance),
    );
    _method = widget.line.paymentMethod.isNotEmpty
        ? widget.line.paymentMethod
        : (widget.methods.isNotEmpty
            ? widget.methods.first.name
            : kDefaultPaymentMethods.first);
  }

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<SalesProvider>();
    final bottom = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Complete payment',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          Text(
            '${widget.line.invoiceNumber} · remaining ${moneyEtb(widget.line.remainingBalance)}',
            style: const TextStyle(color: AppColors.inkSoft),
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _amount,
            decoration: const InputDecoration(labelText: 'Amount paid now'),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
          const SizedBox(height: 10),
          FormDropdownField<String>(
            label: 'Payment method',
            value: _method,
            items: (widget.methods.isNotEmpty
                    ? widget.methods.map((m) => m.name)
                    : kDefaultPaymentMethods)
                .map(
                  (name) => DropdownMenuItem(value: name, child: Text(name)),
                )
                .toList(),
            onChanged: (value) => setState(() => _method = value ?? _method),
          ),
          if (provider.actionError != null) ...[
            const SizedBox(height: 10),
            ErrorBanner(message: provider.actionError!),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _saving ? null : () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  onPressed: _saving
                      ? null
                      : () async {
                          final messenger = ScaffoldMessenger.of(context);
                          setState(() => _saving = true);
                          final ok = await widget.onSave(
                            amount: double.tryParse(_amount.text) ?? 0,
                            paymentMethod: _method,
                          );
                          if (!mounted) return;
                          setState(() => _saving = false);
                          if (ok) {
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
                  child: Text(_saving ? 'Saving…' : 'Record payment'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
