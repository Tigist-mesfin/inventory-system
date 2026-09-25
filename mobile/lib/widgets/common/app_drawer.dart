import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/app_colors.dart';
import '../../modules/auth/providers/auth_provider.dart';
import '../../modules/auth/services/auth_service.dart';

enum AppNavId {
  dashboard,
  aiDesk,
  aiAssistant,
  sales,
  purchasing,
  liveStock,
  ledger,
  customers,
  wallets,
  incomeStatement,
  team,
  products,
  vat,
  reports,
  expenses,
  otherIncome,
  warehouses,
  transfers,
  paymentMethods,
  companyProfile,
  sync,
  settings,
}

class AppNavItem {
  const AppNavItem({
    required this.id,
    required this.label,
    required this.icon,
    this.module,
    this.action,
    this.any,
    this.ownerOnly = false,
    this.alwaysShow = false,
  });

  final AppNavId id;
  final String label;
  final IconData icon;
  final String? module;
  final String? action;
  final List<(String, String)>? any;
  final bool ownerOnly;
  final bool alwaysShow;

  bool allowed(Map<String, dynamic>? user) {
    if (alwaysShow) return true;
    if (ownerOnly) return PermissionHelper.isOwner(user);
    if (any != null) return PermissionHelper.canAny(user, any!);
    if (module != null && action != null) {
      return PermissionHelper.can(user, module!, action!);
    }
    return true;
  }
}

/// Same order / labels as React `AppShell` sideLinks, plus Sync & Settings.
const kSideNavItems = <AppNavItem>[
  AppNavItem(
    id: AppNavId.dashboard,
    label: 'Dashboard',
    icon: Icons.dashboard_outlined,
  ),
  AppNavItem(
    id: AppNavId.aiDesk,
    label: 'AI desk',
    icon: Icons.auto_awesome_outlined,
    any: [
      ('sales', 'READ'),
      ('inventory', 'READ'),
      ('finance', 'READ'),
      ('purchasing', 'READ'),
      ('insights', 'READ'),
    ],
  ),
  AppNavItem(
    id: AppNavId.aiAssistant,
    label: 'AI assistant',
    icon: Icons.smart_toy_outlined,
    any: [
      ('sales', 'READ'),
      ('inventory', 'READ'),
      ('finance', 'READ'),
      ('purchasing', 'READ'),
      ('insights', 'READ'),
    ],
  ),
  AppNavItem(
    id: AppNavId.sales,
    label: 'Sales',
    icon: Icons.point_of_sale_outlined,
    module: 'sales',
    action: 'READ',
  ),
  AppNavItem(
    id: AppNavId.purchasing,
    label: 'Purchasing',
    icon: Icons.shopping_cart_outlined,
    module: 'purchasing',
    action: 'READ',
  ),
  AppNavItem(
    id: AppNavId.liveStock,
    label: 'Live stock',
    icon: Icons.inventory_2_outlined,
    module: 'inventory',
    action: 'READ',
  ),
  AppNavItem(
    id: AppNavId.ledger,
    label: 'Debit & credit',
    icon: Icons.account_balance_outlined,
    any: [('sales', 'READ'), ('purchasing', 'READ')],
  ),
  AppNavItem(
    id: AppNavId.customers,
    label: 'Customers & suppliers',
    icon: Icons.groups_outlined,
    module: 'customers',
    action: 'READ',
  ),
  AppNavItem(
    id: AppNavId.wallets,
    label: 'Customer wallets',
    icon: Icons.account_balance_wallet_outlined,
    module: 'customers',
    action: 'READ',
  ),
  AppNavItem(
    id: AppNavId.incomeStatement,
    label: 'Income statement',
    icon: Icons.insights_outlined,
    module: 'finance',
    action: 'READ',
  ),
  AppNavItem(
    id: AppNavId.team,
    label: 'Salesmen',
    icon: Icons.badge_outlined,
    ownerOnly: true,
  ),
  AppNavItem(
    id: AppNavId.products,
    label: 'Products',
    icon: Icons.category_outlined,
    module: 'catalog',
    action: 'READ',
  ),
  AppNavItem(
    id: AppNavId.vat,
    label: 'VAT data',
    icon: Icons.receipt_long_outlined,
    any: [
      ('sales', 'READ'),
      ('purchasing', 'READ'),
      ('finance', 'READ'),
      ('insights', 'READ'),
    ],
  ),
  AppNavItem(
    id: AppNavId.expenses,
    label: 'Expenses',
    icon: Icons.money_off_outlined,
    module: 'finance',
    action: 'READ',
  ),
  AppNavItem(
    id: AppNavId.otherIncome,
    label: 'Other income',
    icon: Icons.attach_money,
    module: 'finance',
    action: 'READ',
  ),
  AppNavItem(
    id: AppNavId.warehouses,
    label: 'Warehouses',
    icon: Icons.warehouse_outlined,
    module: 'warehouse',
    action: 'READ',
  ),
  AppNavItem(
    id: AppNavId.transfers,
    label: 'Transfers',
    icon: Icons.swap_horiz,
    module: 'inventory',
    action: 'READ',
  ),
  AppNavItem(
    id: AppNavId.paymentMethods,
    label: 'Payment methods',
    icon: Icons.payments_outlined,
    module: 'sales',
    action: 'READ',
  ),
  AppNavItem(
    id: AppNavId.companyProfile,
    label: 'Company profile',
    icon: Icons.business_outlined,
    ownerOnly: true,
  ),
  AppNavItem(
    id: AppNavId.sync,
    label: 'Sync',
    icon: Icons.sync,
    alwaysShow: true,
  ),
  AppNavItem(
    id: AppNavId.settings,
    label: 'Settings',
    icon: Icons.settings_outlined,
    alwaysShow: true,
  ),
];

class AppDrawer extends StatelessWidget {
  const AppDrawer({
    super.key,
    required this.selected,
    required this.onSelect,
  });

  final AppNavId selected;
  final ValueChanged<AppNavId> onSelect;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final company = user?['company'];
    final companyName = company is Map
        ? company['name']?.toString()
        : null;
    final role = user?['role'];
    final roleName = role is Map ? role['name']?.toString() : null;
    final roleLabel =
        roleName == 'SALESMAN' ? 'Salesman' : 'Company desk';
    final fullName = user?['fullName']?.toString() ?? 'User';

    final items = kSideNavItems.where((item) => item.allowed(user)).toList();

    return Drawer(
      backgroundColor: AppColors.brand,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'Iv',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          companyName ?? 'Invontory',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                            color: Colors.white,
                          ),
                        ),
                        Text(
                          roleLabel,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.85),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: Colors.white.withValues(alpha: 0.25)),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                itemCount: items.length,
                itemBuilder: (context, index) {
                  final item = items[index];
                  final active = item.id == selected;
                  return ListTile(
                    leading: Icon(
                      item.icon,
                      color: Colors.white,
                    ),
                    title: Text(
                      item.label,
                      style: TextStyle(
                        fontWeight: active ? FontWeight.w800 : FontWeight.w500,
                        color: Colors.white,
                      ),
                    ),
                    selected: active,
                    selectedTileColor: Colors.white.withValues(alpha: 0.18),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    onTap: () {
                      Navigator.of(context).pop();
                      onSelect(item.id);
                    },
                  );
                },
              ),
            ),
            Divider(height: 1, color: Colors.white.withValues(alpha: 0.25)),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    fullName,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: () async {
                      Navigator.of(context).pop();
                      await auth.logout();
                    },
                    icon: const Icon(Icons.logout),
                    label: const Text('Sign out'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: BorderSide(color: Colors.white.withValues(alpha: 0.7)),
                      minimumSize: const Size.fromHeight(44),
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
