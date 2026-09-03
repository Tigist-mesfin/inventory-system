import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../constants/app_mode.dart';
import '../../../core/theme/app_theme.dart';
import '../../../widgets/common/app_drawer.dart';
import '../../../widgets/common/empty_state.dart';
import '../../dashboard/screens/dashboard_screen.dart';
import '../../purchases/screens/purchase_form_screen.dart';
import '../../purchases/screens/purchases_screen.dart';
import '../../sales/screens/sale_form_screen.dart';
import '../../sales/screens/sales_screen.dart';
import '../../settings/screens/settings_screen.dart';
import '../../stock/screens/stock_screen.dart';
import '../../ledger/screens/ledger_screen.dart';
import '../../parties/screens/parties_screen.dart';
import '../../parties/screens/customer_wallets_screen.dart';
import '../../finance/screens/income_statement_screen.dart';
import '../../sync/providers/sync_provider.dart';
import '../../sync/screens/sync_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  AppNavId _current = AppNavId.dashboard;

  static const _onlineTabs = [
    AppNavId.dashboard,
    AppNavId.purchasing,
    AppNavId.sales,
    AppNavId.liveStock,
    AppNavId.aiDesk,
  ];

  static const _offlineTabs = [
    AppNavId.purchasing,
    AppNavId.sales,
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SyncProvider>().onAuthenticated();
    });
  }

  bool _isOfflineOnly(SyncProvider sync) =>
      sync.userMode == AppOperationMode.offline;

  String get _title {
    for (final item in kSideNavItems) {
      if (item.id == _current) return item.label;
    }
    return 'Invontory';
  }

  void _select(AppNavId id) {
    final sync = context.read<SyncProvider>();
    if (_isOfflineOnly(sync) &&
        id != AppNavId.sales &&
        id != AppNavId.purchasing &&
        id != AppNavId.settings &&
        id != AppNavId.sync) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Offline mode — only Buy, Sell, Sync, and Settings are available.',
          ),
        ),
      );
      return;
    }
    setState(() => _current = id);
  }

  Widget _bodyFor(AppNavId id) {
    return switch (id) {
      AppNavId.dashboard => DashboardScreen(
          onOpenPurchasing: () => _select(AppNavId.purchasing),
          onOpenStock: () => _select(AppNavId.liveStock),
          onOpenIncomeStatement: () => _select(AppNavId.incomeStatement),
        ),
      AppNavId.sales => const SalesScreen(),
      AppNavId.purchasing => const PurchasesScreen(),
      AppNavId.sync => const SyncScreen(),
      AppNavId.settings => const SettingsScreen(),
      AppNavId.aiDesk => const _EmbeddedPlaceholder(title: 'AI desk'),
      AppNavId.aiAssistant => const _EmbeddedPlaceholder(title: 'AI assistant'),
      AppNavId.liveStock => const StockScreen(),
      AppNavId.ledger => const LedgerScreen(),
      AppNavId.customers => PartiesScreen(
          onOpenWallets: () => _select(AppNavId.wallets),
        ),
      AppNavId.wallets => const CustomerWalletsScreen(),
      AppNavId.incomeStatement => const IncomeStatementScreen(),
      AppNavId.team => const _EmbeddedPlaceholder(title: 'Salesmen'),
      AppNavId.products => const _EmbeddedPlaceholder(title: 'Products'),
      AppNavId.vat => const _EmbeddedPlaceholder(title: 'VAT data'),
      AppNavId.reports => const _EmbeddedPlaceholder(title: 'Reports'),
      AppNavId.expenses => const _EmbeddedPlaceholder(title: 'Expenses'),
      AppNavId.otherIncome => const _EmbeddedPlaceholder(title: 'Other income'),
      AppNavId.warehouses => const _EmbeddedPlaceholder(title: 'Warehouses'),
      AppNavId.transfers => const _EmbeddedPlaceholder(title: 'Transfers'),
      AppNavId.paymentMethods =>
        const _EmbeddedPlaceholder(title: 'Payment methods'),
      AppNavId.companyProfile =>
        const _EmbeddedPlaceholder(title: 'Company profile'),
    };
  }

  List<AppNavId> _tabs(bool offlineOnly) =>
      offlineOnly ? _offlineTabs : _onlineTabs;

  int _bottomIndex(bool offlineOnly) {
    final tabs = _tabs(offlineOnly);
    final index = tabs.indexOf(_current);
    return index < 0 ? 0 : index;
  }

  void _onBottomSelected(int index, bool offlineOnly) {
    final tabs = _tabs(offlineOnly);
    if (index < 0 || index >= tabs.length) return;
    _select(tabs[index]);
  }

  @override
  Widget build(BuildContext context) {
    final sync = context.watch<SyncProvider>();
    final offlineOnly = _isOfflineOnly(sync);
    final online = sync.isOperatingOnline;

    if (offlineOnly &&
        _current != AppNavId.sales &&
        _current != AppNavId.purchasing &&
        _current != AppNavId.settings &&
        _current != AppNavId.sync) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _current = AppNavId.purchasing);
      });
    }

    return Container(
      decoration: AppTheme.scaffoldDecoration,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        drawer: AppDrawer(
          selected: _current,
          onSelect: _select,
        ),
        appBar: AppBar(
          title: Text(_title),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Center(
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: (online ? AppColors.primary : AppColors.offline)
                        .withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        online ? Icons.cloud_done : Icons.cloud_off,
                        size: 14,
                        color: online ? AppColors.primaryLight : AppColors.offline,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        online ? 'Online' : 'Offline',
                        style: TextStyle(
                          color: online ? Colors.white : AppColors.offline,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        body: _bodyFor(_current),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _bottomIndex(offlineOnly),
          onDestinationSelected: (value) =>
              _onBottomSelected(value, offlineOnly),
          destinations: offlineOnly
              ? const [
                  NavigationDestination(
                    icon: Icon(Icons.shopping_cart_outlined),
                    label: 'Buy',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.point_of_sale),
                    label: 'Sell',
                  ),
                ]
              : const [
                  NavigationDestination(
                    icon: Icon(Icons.dashboard_outlined),
                    label: 'Home',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.shopping_cart_outlined),
                    label: 'Buy',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.point_of_sale),
                    label: 'Sell',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.inventory_2_outlined),
                    label: 'Stock',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.auto_awesome_outlined),
                    label: 'AI',
                  ),
                ],
        ),
        floatingActionButton: _fabForCurrent(),
      ),
    );
  }

  Widget? _fabForCurrent() {
    if (_current == AppNavId.purchasing) {
      return FloatingActionButton.extended(
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const PurchaseFormScreen()),
        ),
        icon: const Icon(Icons.add),
        label: const Text('Purchase'),
      );
    }
    if (_current == AppNavId.sales) {
      return FloatingActionButton.extended(
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const SaleFormScreen()),
        ),
        icon: const Icon(Icons.add),
        label: const Text('Sale'),
      );
    }
    return null;
  }
}

class _EmbeddedPlaceholder extends StatelessWidget {
  const _EmbeddedPlaceholder({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      title: title,
      subtitle:
          'Open this on the web app for now. Mobile screen coming soon.',
      icon: Icons.construction_outlined,
    );
  }
}
