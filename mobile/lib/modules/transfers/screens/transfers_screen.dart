import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/common/form_dropdown.dart';
import '../../../widgets/loading/inventory_loading.dart';
import '../../sync/providers/sync_provider.dart';
import '../providers/transfer_provider.dart';
import '../services/transfer_service.dart';

class TransfersScreen extends StatefulWidget {
  const TransfersScreen({super.key});

  @override
  State<TransfersScreen> createState() => _TransfersScreenState();
}

class _TransfersScreenState extends State<TransfersScreen> {
  String? _sourceId;
  String? _destId;
  String? _productId;
  final _qty = TextEditingController(text: '1');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final provider = context.read<TransferProvider>();
      await provider.refresh();
      if (!mounted) return;
      setState(() {
        if (provider.warehouses.isNotEmpty) {
          _sourceId = provider.warehouses.first.id;
          _destId = provider.warehouses.length > 1
              ? provider.warehouses[1].id
              : provider.warehouses.first.id;
        }
      });
    });
  }

  @override
  void dispose() {
    _qty.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_sourceId == null || _destId == null || _productId == null) return;
    if (_sourceId == _destId) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Source and destination must differ')),
      );
      return;
    }
    final qty = parseTransferQty(_qty.text);
    if (qty < 0.001) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid quantity')),
      );
      return;
    }
    final ok = await context.read<TransferProvider>().transferNow(
          sourceWarehouseId: _sourceId!,
          destinationWarehouseId: _destId!,
          productId: _productId!,
          quantity: qty,
        );
    if (!mounted) return;
    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Transfer completed')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<TransferProvider>();
    final sync = context.watch<SyncProvider>();

    if (!sync.isOperatingOnline) {
      return const EmptyState(
        title: 'Transfers offline',
        subtitle: 'Switch to Auto or Online to move stock between stores.',
        icon: Icons.swap_horiz,
      );
    }

    if (provider.loading && provider.transfers.isEmpty) {
      return const InventoryLoading(message: 'Loading transfers...');
    }

    return RefreshIndicator(
      onRefresh: provider.refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        children: [
          Text(
            'Branch transfers',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.ink,
                ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Move stock between shops in one step. Source out, destination in — no in-transit quantity.',
            style: TextStyle(color: AppColors.inkSoft),
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
                  FormDropdownField<String>(
                    label: 'From warehouse',
                    value: _sourceId,
                    items: provider.warehouses
                        .map(
                          (w) => DropdownMenuItem(
                            value: w.id,
                            child: Text(w.name),
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setState(() => _sourceId = v),
                  ),
                  const SizedBox(height: 10),
                  FormDropdownField<String>(
                    label: 'To warehouse',
                    value: _destId,
                    items: provider.warehouses
                        .map(
                          (w) => DropdownMenuItem(
                            value: w.id,
                            child: Text(w.name),
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setState(() => _destId = v),
                  ),
                  const SizedBox(height: 10),
                  FormDropdownField<String>(
                    label: 'Product',
                    value: _productId,
                    items: provider.products
                        .map(
                          (p) => DropdownMenuItem(
                            value: p.id,
                            child: Text(p.name),
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setState(() => _productId = v),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _qty,
                    decoration: const InputDecoration(labelText: 'Quantity'),
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: provider.busy ? null : _submit,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.brand,
                      minimumSize: const Size.fromHeight(48),
                    ),
                    child: Text(
                      provider.busy ? 'Transferring…' : 'Transfer now',
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Transfer history',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 8),
          if (provider.transfers.isEmpty)
            const EmptyState(
              title: 'No transfers yet',
              icon: Icons.swap_horiz,
            )
          else
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.line),
              ),
              clipBehavior: Clip.antiAlias,
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  headingRowColor: WidgetStateProperty.all(AppColors.brand),
                  columns: const [
                    DataColumn(
                      label: Text(
                        'Number',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    DataColumn(
                      label: Text(
                        'From',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    DataColumn(
                      label: Text(
                        'To',
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
                  ],
                  rows: provider.transfers
                      .map(
                        (t) => DataRow(
                          cells: [
                            DataCell(Text(t.transferNumber)),
                            DataCell(Text(t.sourceName)),
                            DataCell(Text(t.destinationName)),
                            DataCell(
                              Text(
                                t.status,
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: t.status == 'COMPLETED'
                                      ? AppColors.brand
                                      : AppColors.inkSoft,
                                ),
                              ),
                            ),
                          ],
                        ),
                      )
                      .toList(),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
