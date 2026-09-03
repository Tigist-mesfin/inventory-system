import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../core/utils/money_format.dart';
import '../../../database/app_database.dart';
import '../../../models/server_list_models.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/common/form_dropdown.dart';
import '../../../widgets/common/connection_status_banner.dart';
import '../../../widgets/loading/inventory_loading.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/services/auth_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../providers/purchase_provider.dart';
import '../services/purchase_service.dart';

class PurchasesScreen extends StatefulWidget {
  const PurchasesScreen({super.key});

  @override
  State<PurchasesScreen> createState() => _PurchasesScreenState();
}

class _PurchasesScreenState extends State<PurchasesScreen> {
  List<ProductsCacheData> _products = [];
  List<PaymentMethodsCacheData> _methods = [];
  List<WarehousesCacheData> _warehouses = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  Future<void> _bootstrap() async {
    final provider = context.read<PurchaseProvider>();
    final auth = context.read<AuthProvider>();
    await provider.refreshLists(user: auth.user);
    final results = await Future.wait([
      provider.products(),
      provider.paymentMethods(),
      provider.warehouses(),
    ]);
    if (!mounted) return;
    setState(() {
      _products = results[0] as List<ProductsCacheData>;
      _methods = results[1] as List<PaymentMethodsCacheData>;
      _warehouses = results[2] as List<WarehousesCacheData>;
    });
    if (_warehouses.isNotEmpty && provider.deliverWarehouseId == null) {
      provider.setDeliverWarehouseId(_warehouses.first.id);
    }
  }

  Future<void> _refresh() async {
    final auth = context.read<AuthProvider>();
    await context.read<PurchaseProvider>().refreshLists(user: auth.user);
  }

  Future<void> _openUpdate(ServerPurchaseLine row) async {
    final provider = context.read<PurchaseProvider>();
    final auth = context.read<AuthProvider>();
    final owner = PermissionHelper.isOwner(auth.user);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.paper2,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return _UpdatePurchaseSheet(
          row: row,
          warehouses: _warehouses,
          methods: _methods,
          owner: owner,
          onSave: ({
            required String deliveryStatus,
            String? warehouseId,
            required double quantity,
            required double payAmount,
            required String paymentMethod,
          }) async {
            final ok = await provider.saveUpdate(
              row: row,
              owner: owner,
              deliveryStatus: deliveryStatus,
              warehouseId: warehouseId,
              quantity: quantity,
              payAmount: payAmount,
              paymentMethod: paymentMethod,
            );
            if (ok && ctx.mounted) Navigator.pop(ctx);
            return ok;
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<PurchaseProvider>();
    final sync = context.watch<SyncProvider>();
    final auth = context.watch<AuthProvider>();
    final online = sync.isOperatingOnline;
    final owner = PermissionHelper.isOwner(auth.user);

    return StreamBuilder<List<LocalPurchase>>(
      stream: provider.watchPurchases(),
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
              Text(
                'Purchases',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.ink,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                online
                    ? 'Delivery status, unpaid balances, and purchase records.'
                    : 'Offline — local pending buys only. Go online for full records.',
                style: const TextStyle(color: AppColors.inkSoft),
              ),
              if (provider.listError != null) ...[
                const SizedBox(height: 12),
                ErrorBanner(message: provider.listError!),
              ],
              if (online) ...[
                const SizedBox(height: 14),
                _AnalyticsStrip(
                  summary: provider.summary,
                  unpaidTotal: provider.unpaidTotal,
                ),
              ],
              if (pendingLocal.isNotEmpty) ...[
                const SizedBox(height: 16),
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
                      title: Text(row.orderNumber ?? 'Local purchase'),
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
                const SizedBox(height: 16),
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
                                'Purchase records',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.copyWith(fontWeight: FontWeight.w800),
                              ),
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
                        _FiltersPanel(
                          filters: provider.filters,
                          products: _products,
                          methods: _methods,
                          salesmen: provider.salesmen,
                          owner: owner,
                          userId: auth.user?['id']?.toString(),
                          userName: auth.user?['fullName']?.toString(),
                          onChanged: (next) => provider.setFilters(next),
                        ),
                        if (owner && provider.summary.undeliveredCount > 0) ...[
                          const SizedBox(height: 8),
                          LayoutBuilder(
                            builder: (context, constraints) {
                              final sideBySide = constraints.maxWidth >= 420;
                              final warehouse = FormDropdownField<String>(
                                label: 'Deliver all into',
                                value: provider.deliverWarehouseId,
                                items: _warehouses
                                    .map(
                                      (w) => DropdownMenuItem(
                                        value: w.id,
                                        child: Text(w.name),
                                      ),
                                    )
                                    .toList(),
                                onChanged: provider.setDeliverWarehouseId,
                              );
                              final button = FilledButton(
                                onPressed: provider.busy
                                    ? null
                                    : () async {
                                        final messenger =
                                            ScaffoldMessenger.of(context);
                                        final ok =
                                            await provider.deliverAll();
                                        if (!mounted) return;
                                        if (ok) {
                                          messenger.showSnackBar(
                                            const SnackBar(
                                              content: Text(
                                                'Undelivered items marked delivered',
                                              ),
                                            ),
                                          );
                                        }
                                      },
                                child: Text(
                                  provider.busy
                                      ? 'Updating…'
                                      : 'Deliver all (${provider.summary.undeliveredCount})',
                                ),
                              );
                              if (sideBySide) {
                                return Row(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Expanded(child: warehouse),
                                    const SizedBox(width: 8),
                                    button,
                                  ],
                                );
                              }
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  warehouse,
                                  const SizedBox(height: 8),
                                  button,
                                ],
                              );
                            },
                          ),
                        ],
                        const SizedBox(height: 8),
                        if (provider.serverLines.isEmpty)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 24),
                            child: EmptyState(
                              title: 'No purchases for this filter',
                              subtitle: 'Change filters or add a purchase.',
                              icon: Icons.shopping_cart_outlined,
                            ),
                          )
                        else
                          _PurchaseRecordsTable(
                            lines: provider.serverLines,
                            showAll: provider.showAllColumns,
                            onUpdate: _openUpdate,
                          ),
                        if (provider.serverLines.isNotEmpty)
                          Container(
                            margin: const EdgeInsets.only(top: 12, bottom: 4),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 12,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.brand.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Text(
                              'Filtered cost with VAT: '
                              '${moneyEtb(withVat(provider.totals.amount))} · '
                              'Quantity: ${qty(provider.totals.quantity)}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                color: AppColors.ink,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ] else if (pendingLocal.isEmpty) ...[
                SizedBox(
                  height: MediaQuery.of(context).size.height * 0.45,
                  child: const EmptyState(
                    title: 'No local purchases yet',
                    subtitle: 'Tap + Purchase to record a buy offline.',
                    icon: Icons.shopping_cart_outlined,
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

class _AnalyticsStrip extends StatelessWidget {
  const _AnalyticsStrip({
    required this.summary,
    required this.unpaidTotal,
  });

  final PurchaseDeliverySummary summary;
  final double unpaidTotal;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 148,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          _AnalyticsCard(
            title: 'Not delivered',
            value: '${summary.notDelivered.count}',
            subtitle: 'Waiting for the store',
            items: summary.notDelivered.items,
          ),
          _AnalyticsCard(
            title: 'On loading',
            value: '${summary.onLoading.count}',
            subtitle: 'In progress',
            items: summary.onLoading.items,
          ),
          _AnalyticsCard(
            title: 'Delivered',
            value: '${summary.delivered.count}',
            subtitle: 'Already in warehouse',
            items: summary.delivered.items,
          ),
          _AnalyticsCard(
            title: 'Unpaid',
            value: money(unpaidTotal),
            subtitle: 'ETB still outstanding',
            items: const [],
          ),
        ],
      ),
    );
  }
}

class _AnalyticsCard extends StatelessWidget {
  const _AnalyticsCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.items,
  });

  final String title;
  final String value;
  final String subtitle;
  final List<Map<String, dynamic>> items;

  @override
  Widget build(BuildContext context) {
    final chips = items.take(3).map((item) {
      final name = item['name']?.toString() ?? 'Item';
      final q = qty(item['quantity']);
      final unit = item['unit']?.toString() ?? '';
      return '$name · $q${unit.isEmpty ? '' : ' $unit'}';
    }).toList();
    final extra = items.length - chips.length;

    return Container(
      width: 210,
      margin: const EdgeInsets.only(right: 10),
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
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
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -18,
            top: -18,
            child: Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.14),
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.92),
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 26,
                ),
              ),
              Text(
                subtitle,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.85),
                  fontSize: 12,
                ),
              ),
              if (chips.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  [
                    ...chips,
                    if (extra > 0) '+$extra more',
                  ].join('  ·  '),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.9),
                    fontSize: 11,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _FiltersPanel extends StatelessWidget {
  const _FiltersPanel({
    required this.filters,
    required this.products,
    required this.methods,
    required this.salesmen,
    required this.owner,
    required this.onChanged,
    this.userId,
    this.userName,
  });

  final PurchaseFilters filters;
  final List<ProductsCacheData> products;
  final List<PaymentMethodsCacheData> methods;
  final List<TeamSalesman> salesmen;
  final bool owner;
  final String? userId;
  final String? userName;
  final ValueChanged<PurchaseFilters> onChanged;

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
    final formatted =
        '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
    onChanged(
      isFrom
          ? filters.copyWith(from: formatted)
          : filters.copyWith(to: formatted),
    );
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final cols = width >= 720 ? 3 : width >= 340 ? 2 : 1;
        final fieldWidth = (width - (cols - 1) * 8) / cols;

        Widget sized(Widget child) => SizedBox(
              width: fieldWidth,
              child: child,
            );

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                sized(
                  OutlinedButton(
                    onPressed: () =>
                        _pickDate(context: context, isFrom: true),
                    child: Text(
                      filters.from.isEmpty
                          ? 'From date'
                          : 'From ${filters.from}',
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
                sized(
                  OutlinedButton(
                    onPressed: () =>
                        _pickDate(context: context, isFrom: false),
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
                      const DropdownMenuItem(
                        value: '',
                        child: Text('All items'),
                      ),
                      ...products.map(
                        (p) => DropdownMenuItem(
                          value: p.id,
                          child: Text(p.name),
                        ),
                      ),
                    ],
                    onChanged: (value) =>
                        onChanged(filters.copyWith(productId: value ?? '')),
                  ),
                ),
                sized(
                  FormDropdownField<String>(
                    label: 'Payment',
                    value: filters.paymentMethod,
                    items: [
                      const DropdownMenuItem(
                        value: '',
                        child: Text('All methods'),
                      ),
                      ...methods.map(
                        (m) => DropdownMenuItem(
                          value: m.name,
                          child: Text(m.name),
                        ),
                      ),
                    ],
                    onChanged: (value) => onChanged(
                      filters.copyWith(paymentMethod: value ?? ''),
                    ),
                  ),
                ),
                if (owner)
                  sized(
                    FormDropdownField<String>(
                      label: 'Staff',
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
                      onChanged: (value) => onChanged(
                        filters.copyWith(createdBy: value ?? ''),
                      ),
                    ),
                  ),
              ],
            ),
            if (filters.from.isNotEmpty ||
                filters.to.isNotEmpty ||
                filters.productId.isNotEmpty ||
                filters.paymentMethod.isNotEmpty ||
                filters.createdBy.isNotEmpty)
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => onChanged(const PurchaseFilters()),
                  child: const Text('Clear filters'),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _PurchaseRecordsTable extends StatelessWidget {
  const _PurchaseRecordsTable({
    required this.lines,
    required this.showAll,
    required this.onUpdate,
  });

  final List<ServerPurchaseLine> lines;
  final bool showAll;
  final ValueChanged<ServerPurchaseLine> onUpdate;

  static const _headerStyle = TextStyle(
    color: Colors.white,
    fontWeight: FontWeight.w800,
    fontSize: 12,
  );

  static const _cellStyle = TextStyle(
    color: AppColors.ink,
    fontSize: 12,
  );

  DataColumn _col(String label) => DataColumn(
        label: Text(label, style: _headerStyle),
      );

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
            minWidth: showAll ? 1180 : 720,
          ),
          child: DataTable(
            headingRowColor: WidgetStateProperty.all(AppColors.brand),
            headingRowHeight: 48,
            dataRowMinHeight: 48,
            dataRowMaxHeight: 64,
            columnSpacing: 18,
            horizontalMargin: 12,
            border: TableBorder(
              horizontalInside: BorderSide(
                color: AppColors.brand.withValues(alpha: 0.12),
              ),
            ),
            columns: [
              if (showAll) _col('Date'),
              _col('Item name'),
              _col('Quantity'),
              if (showAll) _col('Unit price'),
              if (showAll) _col('Amount'),
              _col('Cost with VAT'),
              if (showAll) _col('Bought from'),
              if (showAll) _col('Staff'),
              _col('Paid'),
              _col('Unpaid'),
              if (showAll) _col('Method'),
              _col('Status'),
              _col(''),
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
                    if (showAll) _cell(lines[i].date.isEmpty ? '—' : lines[i].date),
                    _cell(lines[i].productName, bold: true),
                    _cell(
                      '${qty(lines[i].quantity)}'
                      '${lines[i].unit.isEmpty ? '' : ' ${lines[i].unit}'}',
                    ),
                    if (showAll) _cell(moneyEtb(lines[i].unitPrice)),
                    if (showAll) _cell(moneyEtb(lines[i].totalPrice)),
                    _cell(moneyEtb(withVat(lines[i].totalPrice))),
                    if (showAll)
                      _cell(
                        lines[i].party.isEmpty ? '—' : lines[i].party,
                      ),
                    if (showAll)
                      _cell(
                        lines[i].salesman.isEmpty ? '—' : lines[i].salesman,
                      ),
                    _cell(moneyEtb(lines[i].paidAmount)),
                    _cell(moneyEtb(lines[i].remainingBalance)),
                    if (showAll)
                      _cell(
                        lines[i].paymentMethod.isEmpty
                            ? '—'
                            : lines[i].paymentMethod,
                      ),
                    _cell(deliveryStatusLabel(lines[i].deliveryStatus)),
                    DataCell(
                      FilledButton(
                        onPressed: () => onUpdate(lines[i]),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(0, 34),
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          backgroundColor: AppColors.brand,
                          foregroundColor: Colors.white,
                          textStyle: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 12,
                          ),
                        ),
                        child: const Text('Update'),
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

class _UpdatePurchaseSheet extends StatefulWidget {
  const _UpdatePurchaseSheet({
    required this.row,
    required this.warehouses,
    required this.methods,
    required this.owner,
    required this.onSave,
  });

  final ServerPurchaseLine row;
  final List<WarehousesCacheData> warehouses;
  final List<PaymentMethodsCacheData> methods;
  final bool owner;
  final Future<bool> Function({
    required String deliveryStatus,
    String? warehouseId,
    required double quantity,
    required double payAmount,
    required String paymentMethod,
  }) onSave;

  @override
  State<_UpdatePurchaseSheet> createState() => _UpdatePurchaseSheetState();
}

class _UpdatePurchaseSheetState extends State<_UpdatePurchaseSheet> {
  late String _status;
  String? _warehouseId;
  late double _quantity;
  String _payAmount = '';
  late String _paymentMethod;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _status = widget.row.deliveryStatus.isEmpty
        ? 'NOT_DELIVERED'
        : widget.row.deliveryStatus;
    _warehouseId = widget.row.warehouseId ??
        (widget.warehouses.isNotEmpty ? widget.warehouses.first.id : null);
    _quantity = widget.row.quantity;
    _paymentMethod = widget.row.paymentMethod.isNotEmpty
        ? widget.row.paymentMethod
        : (widget.methods.isNotEmpty
            ? widget.methods.first.name
            : kDefaultPaymentMethods.first);
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<PurchaseProvider>();
    final remaining =
        widget.row.remainingBalance < 0 ? 0.0 : widget.row.remainingBalance;
    final bottom = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.line,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Update purchase',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${widget.row.productName} · unpaid ${moneyEtb(remaining)}',
              style: const TextStyle(color: AppColors.inkSoft),
            ),
            const SizedBox(height: 14),
            if (widget.owner) ...[
              FormDropdownField<String>(
                label: 'Status',
                value: _status,
                items: kDeliveryStatusLabels.entries
                    .map(
                      (e) => DropdownMenuItem(
                        value: e.key,
                        child: Text(e.value),
                      ),
                    )
                    .toList(),
                onChanged: (value) =>
                    setState(() => _status = value ?? _status),
              ),
              const SizedBox(height: 10),
              FormDropdownField<String>(
                label: 'Deliver into warehouse',
                value: _warehouseId,
                items: widget.warehouses
                    .map(
                      (w) => DropdownMenuItem(
                        value: w.id,
                        child: Text(w.name),
                      ),
                    )
                    .toList(),
                onChanged: (value) => setState(() => _warehouseId = value),
              ),
              const SizedBox(height: 10),
              TextFormField(
                initialValue: qty(widget.row.quantity),
                decoration: InputDecoration(
                  labelText: widget.row.unit.isEmpty
                      ? 'Amount'
                      : 'Amount (${widget.row.unit})',
                ),
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                onChanged: (value) =>
                    _quantity = double.tryParse(value) ?? _quantity,
              ),
              const SizedBox(height: 10),
            ],
            if (remaining > 0) ...[
              TextFormField(
                decoration: InputDecoration(
                  labelText: 'Amount to pay (ETB)',
                  hintText: 'Unpaid ${money(remaining)}',
                  helperText: 'Unpaid balance: ${moneyEtb(remaining)}',
                ),
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                onChanged: (value) => _payAmount = value,
              ),
              const SizedBox(height: 10),
              FormDropdownField<String>(
                label: 'Payment method / account',
                value: _paymentMethod,
                items: (widget.methods.isNotEmpty
                        ? widget.methods.map((m) => m.name)
                        : kDefaultPaymentMethods)
                    .map(
                      (name) => DropdownMenuItem(
                        value: name,
                        child: Text(name),
                      ),
                    )
                    .toList(),
                onChanged: (value) =>
                    setState(() => _paymentMethod = value ?? _paymentMethod),
              ),
            ] else
              const Text(
                'This purchase is fully paid.',
                style: TextStyle(color: AppColors.inkSoft),
              ),
            if (provider.updateError != null) ...[
              const SizedBox(height: 10),
              ErrorBanner(message: provider.updateError!),
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
                              deliveryStatus: _status,
                              warehouseId: _warehouseId,
                              quantity: _quantity,
                              payAmount: double.tryParse(_payAmount) ?? 0,
                              paymentMethod: _paymentMethod,
                            );
                            if (!mounted) return;
                            setState(() => _saving = false);
                            if (ok) {
                              messenger.showSnackBar(
                                const SnackBar(
                                  content: Text('Purchase updated'),
                                ),
                              );
                            }
                          },
                    child: Text(_saving ? 'Saving…' : 'Save update'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
