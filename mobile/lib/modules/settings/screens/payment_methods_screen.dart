import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/loading/inventory_loading.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/services/auth_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../providers/payment_method_provider.dart';

class PaymentMethodsScreen extends StatefulWidget {
  const PaymentMethodsScreen({super.key});

  @override
  State<PaymentMethodsScreen> createState() => _PaymentMethodsScreenState();
}

class _PaymentMethodsScreenState extends State<PaymentMethodsScreen> {
  final _name = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PaymentMethodProvider>().refresh();
    });
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _name.text.trim();
    if (name.length < 2) return;
    final ok = await context.read<PaymentMethodProvider>().create(name);
    if (!mounted) return;
    if (ok) {
      _name.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Payment method added')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<PaymentMethodProvider>();
    final sync = context.watch<SyncProvider>();
    final auth = context.watch<AuthProvider>();
    final canUpdate = PermissionHelper.can(auth.user, 'sales', 'UPDATE');

    if (!sync.isOperatingOnline) {
      return const EmptyState(
        title: 'Payment methods offline',
        subtitle: 'Switch to Auto or Online to manage methods.',
        icon: Icons.payments_outlined,
      );
    }

    if (provider.loading && provider.methods.isEmpty) {
      return const InventoryLoading(message: 'Loading payment methods...');
    }

    return RefreshIndicator(
      onRefresh: provider.refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        children: [
          Text(
            'Payment methods',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.ink,
                ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Admin-managed methods used when approving customer orders and sales.',
            style: TextStyle(color: AppColors.inkSoft),
          ),
          if (provider.error != null) ...[
            const SizedBox(height: 12),
            ErrorBanner(message: provider.error!),
          ],
          if (canUpdate) ...[
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
                        labelText: 'New method name',
                        hintText: 'e.g. Telebirr',
                      ),
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: provider.busy ? null : _submit,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.saffron,
                        foregroundColor: Colors.white,
                        minimumSize: const Size.fromHeight(48),
                      ),
                      child: Text(provider.busy ? 'Saving…' : 'Add method'),
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 16),
          if (provider.methods.isEmpty)
            const EmptyState(
              title: 'No payment methods',
              icon: Icons.payments_outlined,
            )
          else
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.line),
              ),
              clipBehavior: Clip.antiAlias,
              child: DataTable(
                headingRowColor: WidgetStateProperty.all(AppColors.brand),
                columns: const [
                  DataColumn(
                    label: Text(
                      'Name',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'Status',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      '',
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                ],
                rows: provider.methods
                    .map(
                      (row) => DataRow(
                        cells: [
                          DataCell(
                            Text(
                              row.name,
                              style:
                                  const TextStyle(fontWeight: FontWeight.w800),
                            ),
                          ),
                          DataCell(
                            Text(
                              row.status,
                              style: TextStyle(
                                color: row.isActive
                                    ? AppColors.brand
                                    : AppColors.inkSoft,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          DataCell(
                            canUpdate
                                ? OutlinedButton(
                                    onPressed: provider.busy
                                        ? null
                                        : () => provider.toggle(row),
                                    child: Text(
                                      row.isActive
                                          ? 'Deactivate'
                                          : 'Activate',
                                    ),
                                  )
                                : const SizedBox.shrink(),
                          ),
                        ],
                      ),
                    )
                    .toList(),
              ),
            ),
        ],
      ),
    );
  }
}
