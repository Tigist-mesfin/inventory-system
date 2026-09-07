import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/loading/inventory_loading.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/services/auth_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../providers/warehouse_provider.dart';

class WarehousesScreen extends StatefulWidget {
  const WarehousesScreen({super.key});

  @override
  State<WarehousesScreen> createState() => _WarehousesScreenState();
}

class _WarehousesScreenState extends State<WarehousesScreen> {
  final _name = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<WarehouseProvider>().refresh();
    });
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _name.text.trim();
    if (name.isEmpty) return;
    final ok = await context.read<WarehouseProvider>().createWarehouse(name);
    if (!mounted) return;
    if (ok) {
      _name.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Warehouse added')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<WarehouseProvider>();
    final sync = context.watch<SyncProvider>();
    final auth = context.watch<AuthProvider>();
    final canCreate = PermissionHelper.can(auth.user, 'warehouse', 'CREATE');

    if (!sync.isOperatingOnline) {
      return const EmptyState(
        title: 'Warehouses offline',
        subtitle: 'Switch to Auto or Online to manage stores.',
        icon: Icons.store_outlined,
      );
    }

    if (provider.loading && provider.warehouses.isEmpty) {
      return const InventoryLoading(message: 'Loading warehouses...');
    }

    return RefreshIndicator(
      onRefresh: provider.refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        children: [
          Text(
            'Warehouses',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.ink,
                ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Register a store by name.',
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
                    TextField(
                      controller: _name,
                      decoration: const InputDecoration(
                        labelText: 'Warehouse name',
                        hintText: 'Main store',
                      ),
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: provider.busy ? null : _submit,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.brand,
                        minimumSize: const Size.fromHeight(48),
                      ),
                      child: Text(
                        provider.busy ? 'Saving…' : 'Add warehouse',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 16),
          if (provider.warehouses.isEmpty)
            const EmptyState(
              title: 'No warehouses yet',
              icon: Icons.store_outlined,
            )
          else
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: provider.warehouses
                  .map(
                    (w) => Container(
                      width: 160,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: AppColors.brand.withValues(alpha: 0.18),
                        ),
                        gradient: LinearGradient(
                          colors: [
                            AppColors.brand.withValues(alpha: 0.12),
                            Colors.white,
                          ],
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.storefront, color: AppColors.brand),
                          const SizedBox(height: 8),
                          Text(
                            w.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                            ),
                          ),
                          if (w.code.isNotEmpty)
                            Text(
                              w.code,
                              style: const TextStyle(
                                color: AppColors.inkSoft,
                                fontSize: 12,
                              ),
                            ),
                        ],
                      ),
                    ),
                  )
                  .toList(),
            ),
        ],
      ),
    );
  }
}
