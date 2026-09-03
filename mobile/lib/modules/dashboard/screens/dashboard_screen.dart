import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/loading/inventory_loading.dart';
import '../../purchases/screens/purchase_form_screen.dart';
import '../../sync/providers/sync_provider.dart';
import '../providers/dashboard_provider.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({
    super.key,
    this.onOpenPurchasing,
    this.onOpenStock,
    this.onOpenIncomeStatement,
  });

  final VoidCallback? onOpenPurchasing;
  final VoidCallback? onOpenStock;
  final VoidCallback? onOpenIncomeStatement;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DashboardProvider>().load();
    });
  }

  String _money(dynamic value) {
    final amount =
        value is num ? value.toDouble() : double.tryParse('$value') ?? 0;
    return '${amount.toStringAsFixed(2)} ETB';
  }

  String _qty(dynamic value) {
    final amount =
        value is num ? value.toDouble() : double.tryParse('$value') ?? 0;
    if (amount == amount.roundToDouble()) {
      return amount.toInt().toString();
    }
    return amount.toStringAsFixed(2);
  }

  String _date(dynamic value) {
    if (value == null) return '—';
    final text = value.toString();
    return text.length >= 10 ? text.substring(0, 10) : text;
  }

  Map<String, dynamic> _map(dynamic value) =>
      value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};

  List<Map<String, dynamic>> _list(dynamic value) {
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((row) => Map<String, dynamic>.from(row))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<DashboardProvider, SyncProvider>(
      builder: (context, provider, sync, _) {
        if (provider.loading && provider.data == null) {
          return const InventoryLoading();
        }

        final data = provider.data;
        if (data == null) {
          return RefreshIndicator(
            onRefresh: provider.load,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                SizedBox(
                  height: MediaQuery.of(context).size.height * 0.55,
                  child: EmptyState(
                    title: provider.error ??
                        (sync.isOperatingOnline
                            ? 'Dashboard unavailable'
                            : 'Dashboard offline'),
                    subtitle: sync.isOperatingOnline
                        ? 'Pull down to retry loading live insights.'
                        : 'Switch to Auto or Online in Settings, then refresh.',
                    icon: Icons.dashboard_outlined,
                  ),
                ),
              ],
            ),
          );
        }

        final purchases = _map(data['purchases']);
        final purchasesToday = _map(purchases['today']);
        final purchasesWeek = _map(purchases['week']);
        final profit = _map(data['grossProfit']);
        final stores = _list(data['stockByWarehouse']);
        final recentlyAdded = _list(data['recentlyAdded']);
        final recentPurchases = _list(data['recentPurchases']);
        final warehouseCount =
            (data['warehouseCount'] as num?)?.toInt() ?? stores.length;

        return RefreshIndicator(
          onRefresh: provider.load,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            children: [
              Text(
                'Company dashboard',
                style: TextStyle(
                  color: AppColors.brand,
                  fontWeight: FontWeight.w800,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Stock, purchases, and profit',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.ink,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Your company’s live totals for today and this week.',
                style: TextStyle(color: AppColors.inkSoft),
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilledButton.icon(
                    onPressed: () {
                      if (widget.onOpenPurchasing != null) {
                        widget.onOpenPurchasing!();
                      }
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const PurchaseFormScreen(),
                        ),
                      );
                    },
                    icon: const Icon(Icons.add),
                    label: const Text('New purchase'),
                  ),
                  OutlinedButton.icon(
                    onPressed: widget.onOpenStock,
                    icon: const Icon(Icons.inventory_2_outlined),
                    label: const Text('Live stock'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.brand,
                      side: const BorderSide(color: AppColors.brand),
                    ),
                  ),
                  OutlinedButton.icon(
                    onPressed: widget.onOpenIncomeStatement,
                    icon: const Icon(Icons.insights_outlined),
                    label: const Text('Income statement'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.brand,
                      side: const BorderSide(color: AppColors.brand),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                'Stock by warehouse',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 8),
              _StatCard(
                title: 'Total stock',
                value: _qty(data['totalStock']),
                subtitle: warehouseCount == 1
                    ? '1 warehouse'
                    : '$warehouseCount warehouses',
                icon: Icons.inventory,
              ),
              ...stores.map(
                (store) => _StatCard(
                  title: store['name']?.toString() ?? 'Warehouse',
                  value: _qty(store['quantity']),
                  subtitle: (store['itemCount'] as num?)?.toInt() == 1
                      ? '1 item in store'
                      : '${store['itemCount'] ?? 0} items in store',
                  icon: Icons.warehouse_outlined,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Today & this week',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 8),
              _StatCard(
                title: 'Today total purchase',
                value: _money(purchasesToday['total']),
                subtitle: (purchasesToday['count'] as num?)?.toInt() == 1
                    ? '1 purchase'
                    : '${purchasesToday['count'] ?? 0} purchases',
                icon: Icons.shopping_cart_outlined,
              ),
              _StatCard(
                title: 'This week total purchase',
                value: _money(purchasesWeek['total']),
                subtitle: (purchasesWeek['count'] as num?)?.toInt() == 1
                    ? '1 purchase'
                    : '${purchasesWeek['count'] ?? 0} purchases',
                icon: Icons.calendar_view_week,
              ),
              _StatCard(
                title: 'Total low stock items',
                value: _qty(data['lowStockCount'] ?? 0),
                subtitle: 'At or below reorder level',
                icon: Icons.warning_amber_outlined,
              ),
              _StatCard(
                title: 'Out-of-stock items',
                value: _qty(data['outOfStockCount'] ?? 0),
                subtitle: 'Zero quantity in a store',
                icon: Icons.highlight_off,
                danger: true,
              ),
              _StatCard(
                title: 'Recently added items',
                value: _qty(data['recentlyAddedCount'] ?? 0),
                subtitle: 'New catalog items this week',
                icon: Icons.new_releases_outlined,
              ),
              _StatCard(
                title: 'Gross profit today',
                value: _money(profit['today']),
                subtitle: 'Sales minus cost of goods',
                icon: Icons.trending_up,
              ),
              _StatCard(
                title: 'Gross profit this week',
                value: _money(profit['week']),
                subtitle: 'Sales minus cost of goods',
                icon: Icons.show_chart,
              ),
              const SizedBox(height: 12),
              _SectionCard(
                title: 'Recently added items',
                emptyText: 'No new items this week.',
                children: recentlyAdded
                    .map(
                      (row) => _ListRow(
                        title: row['name']?.toString() ?? 'Item',
                        subtitle: [
                          row['sku'],
                          row['brand'],
                        ].where((v) => v != null && '$v'.isNotEmpty).join(' · '),
                        trailing: _date(row['createdAt']),
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 12),
              _SectionCard(
                title: 'Recent purchases this week',
                emptyText: 'No purchases recorded this week.',
                children: recentPurchases.map((row) {
                  final supplier = _map(row['supplier']);
                  return _ListRow(
                    title: row['orderNumber']?.toString() ?? 'Purchase',
                    subtitle: [
                      supplier['name'],
                      _date(row['orderDate']),
                    ].where((v) => v != null && '$v'.isNotEmpty).join(' · '),
                    trailing: _money(row['totalAmount']),
                    trailingBold: true,
                  );
                }).toList(),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    this.danger = false,
  });

  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final accent = danger ? AppColors.coral : AppColors.brand;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: accent),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: danger ? AppColors.coral : AppColors.inkSoft,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    value,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: danger ? AppColors.coral : AppColors.ink,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: AppColors.inkSoft,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.emptyText,
    required this.children,
  });

  final String title;
  final String emptyText;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 8),
            if (children.isEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  emptyText,
                  style: const TextStyle(color: AppColors.inkSoft),
                ),
              )
            else
              ...children,
          ],
        ),
      ),
    );
  }
}

class _ListRow extends StatelessWidget {
  const _ListRow({
    required this.title,
    required this.subtitle,
    required this.trailing,
    this.trailingBold = false,
  });

  final String title;
  final String subtitle;
  final String trailing;
  final bool trailingBold;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.line)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                if (subtitle.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: AppColors.inkSoft,
                      fontSize: 12,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            trailing,
            style: TextStyle(
              fontWeight: trailingBold ? FontWeight.w800 : FontWeight.w500,
              color: trailingBold ? AppColors.ink : AppColors.inkSoft,
            ),
          ),
        ],
      ),
    );
  }
}
