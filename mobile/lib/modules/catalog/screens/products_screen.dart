import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../core/utils/money_format.dart';
import '../../../models/catalog_models.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/common/form_dropdown.dart';
import '../../../widgets/loading/inventory_loading.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/services/auth_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../providers/catalog_provider.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final _search = TextEditingController();
  final _name = TextEditingController();
  final _brand = TextEditingController();
  final _serial = TextEditingController();
  final _color = TextEditingController();
  final _price = TextEditingController();
  String _unit = 'PCS';
  String? _editingId;
  bool _formOpen = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CatalogProvider>().refresh();
    });
  }

  @override
  void dispose() {
    _search.dispose();
    _name.dispose();
    _brand.dispose();
    _serial.dispose();
    _color.dispose();
    _price.dispose();
    super.dispose();
  }

  void _resetForm() {
    setState(() {
      _editingId = null;
      _formOpen = false;
      _name.clear();
      _brand.clear();
      _serial.clear();
      _color.clear();
      _price.clear();
      _unit = 'PCS';
    });
  }

  void _openForm({CatalogProduct? product}) {
    setState(() {
      _formOpen = true;
      if (product == null) {
        _editingId = null;
        _name.clear();
        _brand.clear();
        _serial.clear();
        _color.clear();
        _price.clear();
        _unit = 'PCS';
      } else {
        _editingId = product.id;
        _name.text = product.name;
        _brand.text = product.brand;
        _serial.text = product.barcode;
        _color.text = product.color;
        _price.text = product.sellingPrice > 0
            ? money(product.sellingPrice)
            : '';
        _unit = product.unit;
      }
    });
  }

  Future<void> _submit() async {
    final name = _name.text.trim();
    if (name.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter an item name')),
      );
      return;
    }
    final ok = await context.read<CatalogProvider>().saveProduct(
          id: _editingId,
          name: name,
          unit: _unit,
          brand: _brand.text.trim(),
          serialNumber: _serial.text.trim(),
          color: _color.text.trim(),
          sellingPrice: double.tryParse(_price.text.trim()) ?? 0,
        );
    if (!mounted) return;
    if (ok) {
      final wasEdit = _editingId != null;
      _resetForm();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(wasEdit ? 'Item updated' : 'Item registered')),
      );
    }
  }

  Future<void> _delete(CatalogProduct product) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete item'),
        content: Text('Delete “${product.name}”?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.coral),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    final ok =
        await context.read<CatalogProvider>().deleteProduct(product.id);
    if (!mounted) return;
    if (ok) {
      if (_editingId == product.id) _resetForm();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Item deleted')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CatalogProvider>();
    final sync = context.watch<SyncProvider>();
    final auth = context.watch<AuthProvider>();
    final online = sync.isOperatingOnline;
    final canDelete = PermissionHelper.can(auth.user, 'catalog', 'DELETE');
    final canRead = PermissionHelper.can(auth.user, 'catalog', 'READ') ||
        PermissionHelper.isOwner(auth.user);

    if (!canRead && !PermissionHelper.isOwner(auth.user)) {
      return const EmptyState(
        title: 'No access',
        subtitle: 'You need catalog read permission.',
        icon: Icons.lock_outline,
      );
    }

    if (!online) {
      return const EmptyState(
        title: 'Products offline',
        subtitle: 'Switch to Auto or Online to manage items.',
        icon: Icons.inventory_2_outlined,
      );
    }

    if (provider.loading && provider.products.isEmpty) {
      return const InventoryLoading(message: 'Loading products...');
    }

    final rows = provider.visible;

    return RefreshIndicator(
      onRefresh: provider.refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Item registration',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.ink,
                      ),
                ),
              ),
              FilledButton(
                onPressed: () {
                  if (_formOpen) {
                    _resetForm();
                  } else {
                    _openForm();
                  }
                },
                style: FilledButton.styleFrom(backgroundColor: AppColors.brand),
                child: Text(_formOpen ? 'Close form' : 'Register item'),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Registered items first. Open the form only when you need to add one.',
            style: TextStyle(color: AppColors.inkSoft),
          ),
          if (provider.error != null) ...[
            const SizedBox(height: 12),
            ErrorBanner(message: provider.error!),
          ],
          if (_formOpen) ...[
            const SizedBox(height: 14),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      _editingId == null ? 'New item' : 'Edit item',
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _name,
                      decoration: const InputDecoration(labelText: 'Item name'),
                    ),
                    const SizedBox(height: 10),
                    FormDropdownField<String>(
                      label: 'Unit',
                      value: _unit,
                      items: kProductUnits
                          .map(
                            (u) => DropdownMenuItem(
                              value: u.code,
                              child: Text(u.label),
                            ),
                          )
                          .toList(),
                      onChanged: (value) =>
                          setState(() => _unit = value ?? 'PCS'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _price,
                      decoration: const InputDecoration(
                        labelText: 'Selling price (ETB)',
                      ),
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _brand,
                      decoration: const InputDecoration(labelText: 'Brand'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _serial,
                      decoration: const InputDecoration(
                        labelText: 'Serial number / barcode',
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _color,
                      decoration: const InputDecoration(labelText: 'Color'),
                    ),
                    const SizedBox(height: 14),
                    FilledButton(
                      onPressed: provider.busy ? null : _submit,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.brand,
                        minimumSize: const Size.fromHeight(48),
                      ),
                      child: Text(
                        provider.busy
                            ? 'Saving…'
                            : (_editingId == null ? 'Save item' : 'Update item'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 14),
          TextField(
            controller: _search,
            decoration: const InputDecoration(
              labelText: 'Search name, brand, color, barcode',
              prefixIcon: Icon(Icons.search),
            ),
            onChanged: provider.setSearch,
          ),
          const SizedBox(height: 12),
          if (rows.isEmpty)
            const EmptyState(
              title: 'No products yet',
              icon: Icons.inventory_2_outlined,
            )
          else
            ...rows.map(
              (row) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  title: Text(
                    row.name,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  subtitle: Text(
                    [
                      row.unitLabel,
                      if (row.brand.isNotEmpty) row.brand,
                      if (row.color.isNotEmpty) row.color,
                      if (row.barcode.isNotEmpty) row.barcode,
                    ].join(' · '),
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        moneyEtb(row.sellingPrice),
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          color: AppColors.brand,
                        ),
                      ),
                      IconButton(
                        tooltip: 'Edit',
                        onPressed: () => _openForm(product: row),
                        icon: const Icon(Icons.edit_outlined),
                      ),
                      if (canDelete)
                        IconButton(
                          tooltip: 'Delete',
                          onPressed:
                              provider.busy ? null : () => _delete(row),
                          icon: const Icon(
                            Icons.delete_outline,
                            color: AppColors.coral,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
