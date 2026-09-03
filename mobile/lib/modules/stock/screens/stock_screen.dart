import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../core/utils/money_format.dart';
import '../../../database/app_database.dart';
import '../../../models/server_list_models.dart';
import '../../../models/stock_models.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/common/form_dropdown.dart';
import '../../../widgets/loading/inventory_loading.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/services/auth_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../providers/stock_provider.dart';

class StockScreen extends StatefulWidget {
  const StockScreen({super.key});

  @override
  State<StockScreen> createState() => _StockScreenState();
}

class _StockScreenState extends State<StockScreen> {
  final _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<StockProvider>().refresh();
    });
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _openAdjust(StockItemRow row) async {
    final provider = context.read<StockProvider>();
    final defaultWarehouse = provider.filters.warehouseId.isNotEmpty
        ? provider.filters.warehouseId
        : (row.stores.isNotEmpty
            ? row.stores.first.warehouseId
            : provider.deliverWarehouseId);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.paper2,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _AdjustStockSheet(
        row: row,
        warehouses: provider.warehouses,
        defaultWarehouseId: defaultWarehouse,
        undeliveredQty: provider.undeliveredByProduct[row.productId] ?? 0,
        onSave: ({
          required String warehouseId,
          required double quantity,
        }) async {
          final ok = await provider.adjustOnHand(
            productId: row.productId,
            warehouseId: warehouseId,
            quantity: quantity,
          );
          if (ok && ctx.mounted) Navigator.pop(ctx);
          return ok;
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<StockProvider>();
    final sync = context.watch<SyncProvider>();
    final auth = context.watch<AuthProvider>();
    final online = sync.isOperatingOnline;
    final owner = PermissionHelper.isOwner(auth.user);
    final totals = provider.totals;

    if (provider.loading &&
        provider.items.isEmpty &&
        provider.undelivered.isEmpty) {
      return const InventoryLoading();
    }

    if (!online) {
      return const EmptyState(
        title: 'Live stock offline',
        subtitle: 'Switch to Auto or Online in Settings to view store stock.',
        icon: Icons.inventory_2_outlined,
      );
    }

    return RefreshIndicator(
      onRefresh: provider.refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          Text(
            'Live stock',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.ink,
                ),
          ),
          const SizedBox(height: 4),
          const Text(
            'On-hand quantity by item, after purchases are delivered to a store.',
            style: TextStyle(color: AppColors.inkSoft),
          ),
          if (provider.error != null) ...[
            const SizedBox(height: 12),
            ErrorBanner(message: provider.error!),
          ],
          const SizedBox(height: 14),
          SizedBox(
            height: 120,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                ...provider.storeCards.map(
                  (store) => _AnalyticsCard(
                    title: store.name,
                    value: '${store.itemCount}',
                    subtitle: '${qty(store.quantity)} in store',
                    selected: provider.view == StockViewMode.delivered &&
                        provider.filters.warehouseId == store.warehouseId,
                    onTap: () =>
                        provider.toggleWarehouseFilter(store.warehouseId),
                  ),
                ),
                _AnalyticsCard(
                  title: 'Low stock',
                  value: '${provider.overview.lowStockCount}',
                  subtitle: provider.overview.lowStockCount == 1
                      ? '1 item is low'
                      : '${provider.overview.lowStockCount} items are low',
                  selected: provider.view == StockViewMode.delivered &&
                      provider.filters.lowStock,
                  onTap: provider.toggleLowStock,
                ),
                _AnalyticsCard(
                  title: 'Undelivered',
                  value: '${provider.overview.undeliveredCount}',
                  subtitle: 'Bought, not yet in a store',
                  selected: provider.view == StockViewMode.undelivered,
                  onTap: () => provider.setView(StockViewMode.undelivered),
                ),
              ],
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
                        child: Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            ChoiceChip(
                              label: const Text('Delivered to store'),
                              selected:
                                  provider.view == StockViewMode.delivered,
                              selectedColor:
                                  AppColors.brand.withValues(alpha: 0.2),
                              onSelected: (_) =>
                                  provider.setView(StockViewMode.delivered),
                            ),
                            ChoiceChip(
                              label: const Text('Undelivered'),
                              selected:
                                  provider.view == StockViewMode.undelivered,
                              selectedColor:
                                  AppColors.brand.withValues(alpha: 0.2),
                              onSelected: (_) =>
                                  provider.setView(StockViewMode.undelivered),
                            ),
                          ],
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
                  const SizedBox(height: 10),
                  TextField(
                    controller: _search,
                    decoration: const InputDecoration(
                      labelText: 'Search item',
                      hintText: 'Type to find an item',
                      prefixIcon: Icon(Icons.search),
                    ),
                    onChanged: (value) => provider.setFilters(
                      provider.filters.copyWith(search: value),
                    ),
                  ),
                  const SizedBox(height: 10),
                  if (provider.view == StockViewMode.delivered)
                    _DeliveredFilters(
                      filters: provider.filters,
                      warehouses: provider.warehouses,
                      onChanged: provider.setFilters,
                    )
                  else if (owner)
                    _UndeliveredActions(
                      warehouses: provider.warehouses,
                      deliverWarehouseId: provider.deliverWarehouseId,
                      busy: provider.busy,
                      count: provider.undelivered.length,
                      onWarehouseChanged: provider.setDeliverWarehouseId,
                      onDeliverAll: () async {
                        final messenger = ScaffoldMessenger.of(context);
                        final ok = await provider.deliverAll();
                        if (!mounted) return;
                        if (ok) {
                          messenger.showSnackBar(
                            const SnackBar(
                              content: Text('Undelivered items delivered'),
                            ),
                          );
                        }
                      },
                    )
                  else
                    const Text(
                      'Only the company owner can mark purchases delivered.',
                      style: TextStyle(color: AppColors.inkSoft),
                    ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.brand.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Text(
                      '${totals.count} item${totals.count == 1 ? '' : 's'} · '
                      '${qty(totals.units)} '
                      '${provider.view == StockViewMode.undelivered ? 'units not yet in store' : 'units on hand'}',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                  const SizedBox(height: 10),
                  if (provider.view == StockViewMode.delivered)
                    provider.visibleDelivered.isEmpty
                        ? Padding(
                            padding: const EdgeInsets.symmetric(vertical: 24),
                            child: EmptyState(
                              title: provider.filters.search.trim().isNotEmpty
                                  ? 'No items match that search'
                                  : 'No delivered stock for this filter',
                              icon: Icons.inventory_2_outlined,
                            ),
                          )
                        : _DeliveredTable(
                            rows: provider.visibleDelivered,
                            showAll: provider.showAllColumns,
                            warehouseId: provider.filters.warehouseId,
                            busy: provider.busy,
                            onAdjust: _openAdjust,
                          )
                  else
                    provider.visibleUndelivered.isEmpty
                        ? Padding(
                            padding: const EdgeInsets.symmetric(vertical: 24),
                            child: EmptyState(
                              title: provider.filters.search.trim().isNotEmpty
                                  ? 'No items match that search'
                                  : 'No undelivered purchases',
                              icon: Icons.local_shipping_outlined,
                            ),
                          )
                        : _UndeliveredTable(
                            rows: provider.visibleUndelivered,
                            showAll: provider.showAllColumns,
                            owner: owner,
                            warehouses: provider.warehouses,
                            warehouseForRow: provider.warehouseForRow,
                            onWarehouseChanged: provider.setRowWarehouse,
                            busy: provider.busy,
                            onDeliver: (row) async {
                              final messenger = ScaffoldMessenger.of(context);
                              final ok = await provider.deliverOne(row);
                              if (!mounted) return;
                              if (ok) {
                                messenger.showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      '${row.productName} delivered',
                                    ),
                                  ),
                                );
                              }
                            },
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

class _AnalyticsCard extends StatelessWidget {
  const _AnalyticsCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String value;
  final String subtitle;
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
            border: selected ? Border.all(color: Colors.white, width: 2) : null,
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
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
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
                  fontSize: 24,
                ),
              ),
              Text(
                subtitle,
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

class _DeliveredFilters extends StatelessWidget {
  const _DeliveredFilters({
    required this.filters,
    required this.warehouses,
    required this.onChanged,
  });

  final StockFilters filters;
  final List<WarehousesCacheData> warehouses;
  final ValueChanged<StockFilters> onChanged;

  Future<void> _pickDate(BuildContext context, {required bool isFrom}) async {
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
        Widget sized(Widget child) => SizedBox(width: fieldWidth, child: child);

        return Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            sized(
              FormDropdownField<String>(
                label: 'Warehouse',
                value: filters.warehouseId,
                items: [
                  const DropdownMenuItem(
                    value: '',
                    child: Text('All stores'),
                  ),
                  ...warehouses.map(
                    (w) => DropdownMenuItem(
                      value: w.id,
                      child: Text(w.name),
                    ),
                  ),
                ],
                onChanged: (value) =>
                    onChanged(filters.copyWith(warehouseId: value ?? '')),
              ),
            ),
            sized(
              OutlinedButton(
                onPressed: () => _pickDate(context, isFrom: true),
                child: Text(
                  filters.from.isEmpty
                      ? 'Delivered from'
                      : 'From ${filters.from}',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
            sized(
              OutlinedButton(
                onPressed: () => _pickDate(context, isFrom: false),
                child: Text(
                  filters.to.isEmpty ? 'Delivered to' : 'To ${filters.to}',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
            sized(
              FilterChip(
                label: const Text('Low stock only'),
                selected: filters.lowStock,
                selectedColor: AppColors.brand.withValues(alpha: 0.2),
                onSelected: (value) =>
                    onChanged(filters.copyWith(lowStock: value)),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _UndeliveredActions extends StatelessWidget {
  const _UndeliveredActions({
    required this.warehouses,
    required this.deliverWarehouseId,
    required this.busy,
    required this.count,
    required this.onWarehouseChanged,
    required this.onDeliverAll,
  });

  final List<WarehousesCacheData> warehouses;
  final String? deliverWarehouseId;
  final bool busy;
  final int count;
  final ValueChanged<String?> onWarehouseChanged;
  final VoidCallback onDeliverAll;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final sideBySide = constraints.maxWidth >= 420;
        final warehouse = FormDropdownField<String>(
          label: 'Deliver into',
          value: deliverWarehouseId,
          items: warehouses
              .map(
                (w) => DropdownMenuItem(
                  value: w.id,
                  child: Text(w.name),
                ),
              )
              .toList(),
          onChanged: onWarehouseChanged,
        );
        final button = FilledButton(
          onPressed: busy || count == 0 ? null : onDeliverAll,
          child: Text(busy ? 'Updating…' : 'Deliver all ($count)'),
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
    );
  }
}

class _DeliveredTable extends StatelessWidget {
  const _DeliveredTable({
    required this.rows,
    required this.showAll,
    required this.warehouseId,
    required this.busy,
    required this.onAdjust,
  });

  final List<StockItemRow> rows;
  final bool showAll;
  final String warehouseId;
  final bool busy;
  final ValueChanged<StockItemRow> onAdjust;

  static const _headerStyle = TextStyle(
    color: Colors.white,
    fontWeight: FontWeight.w800,
    fontSize: 12,
  );
  static const _cellStyle = TextStyle(color: AppColors.ink, fontSize: 12);

  DataColumn _col(String label) =>
      DataColumn(label: Text(label, style: _headerStyle));

  DataCell _cell(String text, {bool bold = false, Color? color}) => DataCell(
        Text(
          text,
          style: _cellStyle.copyWith(
            fontWeight: bold ? FontWeight.w800 : FontWeight.w400,
            color: color ?? AppColors.ink,
          ),
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
          constraints: BoxConstraints(minWidth: showAll ? 980 : 720),
          child: DataTable(
            headingRowColor: WidgetStateProperty.all(AppColors.brand),
            headingRowHeight: 48,
            dataRowMinHeight: 52,
            dataRowMaxHeight: 72,
            columnSpacing: 16,
            horizontalMargin: 12,
            columns: [
              _col('Item'),
              _col('Quantity'),
              _col('Selling Price'),
              _col('Last Purchase Price'),
              if (showAll) _col('Unit'),
              if (showAll) _col('In each store'),
              if (showAll) _col('Delivered'),
              _col(''),
            ],
            rows: [
              for (var i = 0; i < rows.length; i++)
                DataRow(
                  color: WidgetStateProperty.all(
                    rows[i].isLowStock
                        ? AppColors.coral.withValues(alpha: 0.08)
                        : i.isOdd
                            ? AppColors.brand.withValues(alpha: 0.07)
                            : Colors.white,
                  ),
                  cells: [
                    DataCell(
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  rows[i].name,
                                  style: _cellStyle.copyWith(
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                              if (rows[i].isLowStock) ...[
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 6,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.coral.withValues(
                                      alpha: 0.15,
                                    ),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text(
                                    'Low',
                                    style: TextStyle(
                                      color: AppColors.coral,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          if (rows[i].sku.isNotEmpty ||
                              rows[i].variantText.isNotEmpty)
                            Text(
                              [
                                if (rows[i].sku.isNotEmpty) rows[i].sku,
                                if (rows[i].variantText.isNotEmpty)
                                  rows[i].variantText,
                              ].join(' · '),
                              style: const TextStyle(
                                color: AppColors.inkSoft,
                                fontSize: 11,
                              ),
                            ),
                        ],
                      ),
                    ),
                    _cell(qty(rows[i].qtyInStore(warehouseId))),
                    _cell(moneyEtb(rows[i].sellingPrice)),
                    _cell(moneyEtb(rows[i].purchasePrice)),
                    if (showAll) _cell(rows[i].unit.isEmpty ? '—' : rows[i].unit),
                    if (showAll) _cell(rows[i].storesText),
                    if (showAll) _cell(rows[i].deliveredText),
                    DataCell(
                      FilledButton(
                        onPressed: busy ? null : () => onAdjust(rows[i]),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(0, 34),
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                        ),
                        child: const Text('Adjust'),
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

class _UndeliveredTable extends StatelessWidget {
  const _UndeliveredTable({
    required this.rows,
    required this.showAll,
    required this.owner,
    required this.warehouses,
    required this.warehouseForRow,
    required this.onWarehouseChanged,
    required this.busy,
    required this.onDeliver,
  });

  final List<UndeliveredStockRow> rows;
  final bool showAll;
  final bool owner;
  final List<WarehousesCacheData> warehouses;
  final String Function(String rowId) warehouseForRow;
  final void Function(String rowId, String warehouseId) onWarehouseChanged;
  final bool busy;
  final ValueChanged<UndeliveredStockRow> onDeliver;

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
          constraints: BoxConstraints(minWidth: showAll ? 980 : 640),
          child: DataTable(
            headingRowColor: WidgetStateProperty.all(AppColors.brand),
            headingRowHeight: 48,
            dataRowMinHeight: 56,
            dataRowMaxHeight: 72,
            columnSpacing: 16,
            horizontalMargin: 12,
            columns: [
              _col('Item'),
              _col('Remaining'),
              if (showAll) _col('Ordered'),
              if (showAll) _col('Bought from'),
              if (showAll) _col('Date'),
              if (showAll) _col('Status'),
              if (owner) _col('Deliver into'),
              if (owner) _col(''),
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
                            rows[i].productName,
                            style: _cellStyle.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          if (rows[i].document.isNotEmpty)
                            Text(
                              rows[i].document,
                              style: const TextStyle(
                                color: AppColors.inkSoft,
                                fontSize: 11,
                              ),
                            ),
                        ],
                      ),
                    ),
                    _cell(
                      '${qty(rows[i].remainingQuantity)}'
                      '${rows[i].unit.isEmpty ? '' : ' ${rows[i].unit}'}',
                    ),
                    if (showAll)
                      _cell(
                        '${qty(rows[i].quantity)}'
                        '${rows[i].unit.isEmpty ? '' : ' ${rows[i].unit}'}',
                      ),
                    if (showAll)
                      _cell(rows[i].party.isEmpty ? '—' : rows[i].party),
                    if (showAll) _cell(rows[i].dateText),
                    if (showAll)
                      _cell(deliveryStatusLabel(rows[i].deliveryStatus)),
                    if (owner)
                      DataCell(
                        DropdownButton<String>(
                          value: warehouseForRow(rows[i].id).isEmpty
                              ? null
                              : warehouseForRow(rows[i].id),
                          underline: const SizedBox.shrink(),
                          items: warehouses
                              .map(
                                (w) => DropdownMenuItem(
                                  value: w.id,
                                  child: Text(w.name),
                                ),
                              )
                              .toList(),
                          onChanged: busy
                              ? null
                              : (value) {
                                  if (value != null) {
                                    onWarehouseChanged(rows[i].id, value);
                                  }
                                },
                        ),
                      ),
                    if (owner)
                      DataCell(
                        FilledButton(
                          onPressed: busy ||
                                  warehouseForRow(rows[i].id).isEmpty
                              ? null
                              : () => onDeliver(rows[i]),
                          style: FilledButton.styleFrom(
                            minimumSize: const Size(0, 34),
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                          ),
                          child: const Text('Deliver'),
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

class _AdjustStockSheet extends StatefulWidget {
  const _AdjustStockSheet({
    required this.row,
    required this.warehouses,
    required this.defaultWarehouseId,
    required this.undeliveredQty,
    required this.onSave,
  });

  final StockItemRow row;
  final List<WarehousesCacheData> warehouses;
  final String? defaultWarehouseId;
  final double undeliveredQty;
  final Future<bool> Function({
    required String warehouseId,
    required double quantity,
  }) onSave;

  @override
  State<_AdjustStockSheet> createState() => _AdjustStockSheetState();
}

class _AdjustStockSheetState extends State<_AdjustStockSheet> {
  late String? _warehouseId;
  late final TextEditingController _qty;
  bool _saving = false;

  double get _current => widget.row.qtyInStore(_warehouseId);

  @override
  void initState() {
    super.initState();
    _warehouseId = widget.defaultWarehouseId ??
        (widget.warehouses.isNotEmpty ? widget.warehouses.first.id : null);
    _qty = TextEditingController(text: qty(_current));
  }

  @override
  void dispose() {
    _qty.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<StockProvider>();
    final nextQty = double.tryParse(_qty.text) ?? _current;
    final diff = nextQty - _current;
    final bottom = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Adjust stock',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              '${widget.row.name}${widget.row.unit.isEmpty ? '' : ' · ${widget.row.unit}'}',
              style: const TextStyle(color: AppColors.inkSoft),
            ),
            const SizedBox(height: 14),
            FormDropdownField<String>(
              label: 'Store',
              value: _warehouseId,
              items: widget.warehouses
                  .map(
                    (w) => DropdownMenuItem(
                      value: w.id,
                      child: Text(w.name),
                    ),
                  )
                  .toList(),
              onChanged: (value) {
                setState(() {
                  _warehouseId = value;
                  _qty.text = qty(widget.row.qtyInStore(value));
                });
              },
            ),
            const SizedBox(height: 10),
            InputDecorator(
              decoration: const InputDecoration(labelText: 'In this store now'),
              child: Text(
                '${qty(_current)}${widget.row.unit.isEmpty ? '' : ' ${widget.row.unit}'}',
              ),
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: _qty,
              decoration: const InputDecoration(labelText: 'New quantity'),
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 8),
            Text(
              'Undelivered purchases: ${qty(widget.undeliveredQty)}'
              '${widget.row.unit.isEmpty ? '' : ' ${widget.row.unit}'}'
              '${diff > 0 ? ' · raising by ${qty(diff)} delivers that amount from purchases' : diff < 0 ? ' · lowering by ${qty(diff.abs())} corrects store count' : ''}',
              style: const TextStyle(color: AppColors.inkSoft, fontSize: 12),
            ),
            if (provider.error != null) ...[
              const SizedBox(height: 10),
              ErrorBanner(message: provider.error!),
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
                    onPressed: _saving || _warehouseId == null
                        ? null
                        : () async {
                            final messenger = ScaffoldMessenger.of(context);
                            setState(() => _saving = true);
                            final ok = await widget.onSave(
                              warehouseId: _warehouseId!,
                              quantity: double.tryParse(_qty.text) ?? _current,
                            );
                            if (!mounted) return;
                            setState(() => _saving = false);
                            if (ok) {
                              messenger.showSnackBar(
                                const SnackBar(
                                  content: Text('Stock quantity saved'),
                                ),
                              );
                            }
                          },
                    child: Text(_saving ? 'Saving…' : 'Save quantity'),
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
