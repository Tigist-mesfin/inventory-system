import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../constants/app_mode.dart';
import '../../../core/utils/money_format.dart';
import '../../../database/app_database.dart';
import '../../../modules/sync/providers/sync_provider.dart';
import '../../../widgets/common/catalog_required_gate.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/common/form_dropdown.dart';
import '../../../widgets/loading/inventory_loading.dart';
import '../providers/sales_provider.dart';
import '../services/sales_service.dart';

class SaleFormScreen extends StatefulWidget {
  const SaleFormScreen({super.key});

  @override
  State<SaleFormScreen> createState() => _SaleFormScreenState();
}

class _Line {
  String? productId;
  String? productName;
  double quantity = 1;
  double unitPrice = 0;
  double stock = 0;
}

class _SaleFormScreenState extends State<SaleFormScreen> {
  bool _loading = true;
  String? _loadError;
  String? _warehouseId;
  String _warehouseName = '';
  bool _registeredCustomer = true;
  String? _customerId;
  String _walkInCustomerName = '';
  String? _paymentMethod;
  final _paidController = TextEditingController();
  final _lines = [_Line()];

  List<WarehousesCacheData> _warehouses = [];
  List<ProductsCacheData> _allProducts = [];
  List<ProductsCacheData> _products = [];
  List<CustomersCacheData> _customers = [];
  List<PaymentMethodsCacheData> _methods = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _paidController.dispose();
    super.dispose();
  }

  double get _subtotal =>
      _lines.fold(0, (sum, line) => sum + line.quantity * line.unitPrice);

  double get _grandTotal => withVat(_subtotal);

  void _syncPaidDefault() {
    final next = _grandTotal > 0 ? _grandTotal.toStringAsFixed(2) : '';
    if (_paidController.text != next) {
      _paidController.text = next;
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    final provider = context.read<SalesProvider>();
    final sync = context.read<SyncProvider>();
    final refreshed = await provider.ensureReferenceData();
    final results = await Future.wait([
      provider.warehouses(),
      provider.customers(),
      provider.paymentMethods(),
      provider.allProducts(),
    ]);
    if (!mounted) return;
    setState(() {
      _warehouses = results[0] as List<WarehousesCacheData>;
      _customers = results[1] as List<CustomersCacheData>;
      _methods = results[2] as List<PaymentMethodsCacheData>;
      _allProducts = results[3] as List<ProductsCacheData>;
      if (_warehouses.isNotEmpty && sync.isOperatingOnline) {
        _warehouseId = _warehouses.first.id;
        _warehouseName = _warehouses.first.name;
      }
      _paymentMethod = _resolvePaymentMethod();
      if (!refreshed &&
          sync.isOperatingOnline &&
          sync.message != null &&
          (_warehouses.isEmpty || _allProducts.isEmpty)) {
        _loadError = sync.message;
      }
      _loading = false;
      _syncPaidDefault();
    });
    await _reloadProducts();
  }

  String? _resolvePaymentMethod() {
    if (_methods.isNotEmpty) return _methods.first.name;
    return kDefaultPaymentMethods.first;
  }

  List<DropdownMenuItem<String>> get _paymentItems {
    if (_methods.isNotEmpty) {
      return _methods
          .map((m) => DropdownMenuItem(value: m.name, child: Text(m.name)))
          .toList();
    }
    return kDefaultPaymentMethods
        .map((name) => DropdownMenuItem(value: name, child: Text(name)))
        .toList();
  }

  bool get _useOfflineWarehouse {
    final sync = context.read<SyncProvider>();
    return sync.userMode == AppOperationMode.offline || !sync.isOperatingOnline;
  }

  Future<void> _reloadProducts() async {
    final provider = context.read<SalesProvider>();
    if (_useOfflineWarehouse) {
      final products = await provider.productsForWarehouse(
        'local:offline',
        includeAllProducts: true,
      );
      if (!mounted) return;
      setState(() {
        _products = products;
        for (final line in _lines) {
          line.productId = null;
          line.productName = null;
          line.stock = 0;
        }
        _syncPaidDefault();
      });
      return;
    }

    if (_warehouseId == null) return;
    final products = await provider.productsForWarehouse(
      _warehouseId!,
      includeAllProducts: false,
    );
    if (!mounted) return;
    setState(() {
      _products = products.isEmpty ? _allProducts : products;
      for (final line in _lines) {
        line.productId = null;
        line.productName = null;
        line.stock = 0;
      }
      _syncPaidDefault();
    });
  }

  Future<void> _submit() async {
    final provider = context.read<SalesProvider>();
    final sync = context.read<SyncProvider>();
    final online = sync.isOperatingOnline;

    String? warehouseId = _warehouseId;
    String? warehouseName = _warehouseName;

    if (_useOfflineWarehouse) {
      if (_warehouseName.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Enter warehouse name')),
        );
        return;
      }
      warehouseId = await provider.resolveWarehouseId(_warehouseName.trim());
      warehouseName = _warehouseName.trim();
    } else if (warehouseId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select a warehouse')),
      );
      return;
    }

    final items = <SaleLineInput>[];
    for (final line in _lines) {
      if (line.productId == null || line.quantity <= 0) continue;
      if (line.quantity > line.stock && online) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Quantity exceeds stock for ${line.productName ?? 'item'}',
            ),
          ),
        );
        return;
      }
      items.add(
        SaleLineInput(
          productId: line.productId!,
          productName: line.productName ?? '',
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        ),
      );
    }
    if (items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add at least one product line')),
      );
      return;
    }

    final paid = double.tryParse(_paidController.text) ?? _grandTotal;

    final ok = await provider.createSale(
      warehouseId: warehouseId!,
      warehouseName: warehouseName,
      customerId: _registeredCustomer && online ? _customerId : null,
      customerName: _registeredCustomer
          ? null
          : (_walkInCustomerName.trim().isEmpty
              ? null
              : _walkInCustomerName.trim()),
      paymentMethod: _paymentMethod ?? kDefaultPaymentMethods.first,
      paidAmount: paid,
      items: items,
    );
    if (!mounted) return;
    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(provider.success ?? 'Saved')),
      );
      Navigator.pop(context);
    }
  }

  Future<void> _updateLineStock(_Line line) async {
    if (line.productId == null) return;
    final provider = context.read<SalesProvider>();
    var warehouseKey = _warehouseId ?? 'local:offline';
    if (_useOfflineWarehouse && _warehouseName.trim().isNotEmpty) {
      warehouseKey =
          await provider.resolveWarehouseId(_warehouseName.trim()) ??
              warehouseKey;
    }
    final stock = await provider.stockFor(line.productId!, warehouseKey);
    if (!mounted) return;
    setState(() => line.stock = stock);
  }

  @override
  Widget build(BuildContext context) {
    final sync = context.watch<SyncProvider>();
    final online = sync.isOperatingOnline;

    if (_loading) {
      return const Scaffold(body: InventoryLoading());
    }

    return CatalogRequiredGate(
      hasProducts: _allProducts.isNotEmpty,
      loadError: _loadError,
      onRetry: online ? _load : null,
      appBarTitle: 'New sale',
      child: Scaffold(
        appBar: AppBar(title: const Text('Add new sale')),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_loadError != null) ErrorBanner(message: _loadError!),
            if (online)
              FormDropdownField<String>(
                label: 'Warehouse',
                value: _warehouseId,
                hint: 'Download warehouses while online',
                items: _warehouses
                    .map(
                      (w) => DropdownMenuItem(
                        value: w.id,
                        child: Text(w.name),
                      ),
                    )
                    .toList(),
                onChanged: (value) async {
                  final warehouse =
                      _warehouses.firstWhere((w) => w.id == value);
                  setState(() {
                    _warehouseId = value;
                    _warehouseName = warehouse.name;
                  });
                  await _reloadProducts();
                },
              )
            else
              TextFormField(
                decoration: const InputDecoration(
                  labelText: 'Warehouse name',
                  hintText: 'Type store / warehouse name',
                ),
                onChanged: (value) {
                  _warehouseName = value;
                  _reloadProducts();
                },
              ),
            const SizedBox(height: 12),
            if (online) ...[
              Row(
                children: [
                  Expanded(
                    child: FilledButton(
                      onPressed: () =>
                          setState(() => _registeredCustomer = true),
                      style: FilledButton.styleFrom(
                        backgroundColor: _registeredCustomer
                            ? AppColors.brand
                            : AppColors.brand.withValues(alpha: 0.18),
                        foregroundColor: _registeredCustomer
                            ? AppColors.onBrand
                            : AppColors.primaryDark,
                      ),
                      child: const Text('Registered customer'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton(
                      onPressed: () =>
                          setState(() => _registeredCustomer = false),
                      style: FilledButton.styleFrom(
                        backgroundColor: !_registeredCustomer
                            ? AppColors.brand
                            : AppColors.brand.withValues(alpha: 0.18),
                        foregroundColor: !_registeredCustomer
                            ? AppColors.onBrand
                            : AppColors.primaryDark,
                      ),
                      child: const Text('Walk-in'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (_registeredCustomer)
                FormDropdownField<String>(
                  label: 'Customer',
                  value: _customerId,
                  hint: 'Optional — or leave empty',
                  items: [
                    const DropdownMenuItem(
                      value: '',
                      child: Text('No customer / cash'),
                    ),
                    ..._customers.map(
                      (c) => DropdownMenuItem(
                        value: c.id,
                        child: Text(c.name),
                      ),
                    ),
                  ],
                  onChanged: (value) => setState(
                    () => _customerId =
                        (value == null || value.isEmpty) ? null : value,
                  ),
                )
              else
                TextFormField(
                  decoration: const InputDecoration(
                    labelText: 'Walk-in customer name',
                  ),
                  onChanged: (value) => _walkInCustomerName = value,
                ),
            ] else
              TextFormField(
                decoration: const InputDecoration(
                  labelText: 'Customer name (optional)',
                ),
                onChanged: (value) => _walkInCustomerName = value,
              ),
            const SizedBox(height: 12),
            FormDropdownField<String>(
              label: 'Payment method',
              value: _paymentMethod,
              items: _paymentItems,
              onChanged: (value) =>
                  setState(() => _paymentMethod = value ?? _paymentMethod),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _paidController,
              decoration: InputDecoration(
                labelText: 'Amount paid (ETB)',
                helperText: 'Grand total with VAT: ${moneyEtb(_grandTotal)}',
              ),
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
            ),
            const SizedBox(height: 18),
            Text(
              'Items sold',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            if (_products.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  'No products with stock in this warehouse.',
                  style: TextStyle(color: AppColors.warning),
                ),
              ),
            ..._lines.asMap().entries.map((entry) {
              final index = entry.key;
              final line = entry.value;
              final lineTotal = line.quantity * line.unitPrice;
              return Card(
                margin: const EdgeInsets.only(top: 10),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      FormDropdownField<String>(
                        label: 'Product',
                        value: line.productId,
                        items: _products
                            .map(
                              (p) => DropdownMenuItem(
                                value: p.id,
                                child: Text(p.name),
                              ),
                            )
                            .toList(),
                        onChanged: (value) async {
                          final product =
                              _products.firstWhere((p) => p.id == value);
                          setState(() {
                            line.productId = value;
                            line.productName = product.name;
                            line.unitPrice = product.sellingPrice;
                            _syncPaidDefault();
                          });
                          await _updateLineStock(line);
                        },
                      ),
                      const SizedBox(height: 6),
                      Text(
                        online
                            ? 'In stock: ${qty(line.stock)}'
                            : 'Offline — stock checked on sync',
                        style: const TextStyle(color: AppColors.inkSoft),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              key: ValueKey('qty-$index-${line.productId}'),
                              initialValue: qty(line.quantity),
                              decoration:
                                  const InputDecoration(labelText: 'Qty'),
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                decimal: true,
                              ),
                              onChanged: (value) {
                                setState(() {
                                  line.quantity =
                                      double.tryParse(value) ?? 0;
                                  _syncPaidDefault();
                                });
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              key: ValueKey(
                                'price-$index-${line.productId}-${line.unitPrice}',
                              ),
                              initialValue: money(line.unitPrice),
                              decoration: const InputDecoration(
                                labelText: 'Unit price',
                              ),
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                decimal: true,
                              ),
                              onChanged: (value) {
                                setState(() {
                                  line.unitPrice =
                                      double.tryParse(value) ?? 0;
                                  _syncPaidDefault();
                                });
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Line: ${moneyEtb(lineTotal)} · With VAT: ${moneyEtb(withVat(lineTotal))}',
                        style: const TextStyle(
                          color: AppColors.inkSoft,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (_lines.length > 1)
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: () => setState(() {
                              _lines.removeAt(index);
                              _syncPaidDefault();
                            }),
                            child: const Text('Remove line'),
                          ),
                        ),
                    ],
                  ),
                ),
              );
            }),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: () => setState(() {
                _lines.add(_Line());
                _syncPaidDefault();
              }),
              icon: const Icon(Icons.add, color: AppColors.brand),
              label: const Text('Add other item'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.brand,
                side: const BorderSide(color: AppColors.brand),
              ),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.brand.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: AppColors.brand.withValues(alpha: 0.25),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Subtotal: ${moneyEtb(_subtotal)}',
                    style: const TextStyle(color: AppColors.inkSoft),
                  ),
                  Text(
                    'VAT ${kVatRate.toStringAsFixed(0)}%: ${moneyEtb(vatOf(_subtotal))}',
                    style: const TextStyle(color: AppColors.inkSoft),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Grand total: ${moneyEtb(_grandTotal)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                      color: AppColors.ink,
                    ),
                  ),
                  Text(
                    'Remaining if partial: ${moneyEtb((_grandTotal - (double.tryParse(_paidController.text) ?? _grandTotal)).clamp(0, double.infinity))}',
                    style: const TextStyle(color: AppColors.inkSoft),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Consumer<SalesProvider>(
              builder: (context, provider, _) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (provider.error != null)
                      ErrorBanner(message: provider.error!),
                    FilledButton(
                      onPressed: provider.busy ? null : _submit,
                      child: provider.busy
                          ? const SizedBox(
                              height: 22,
                              width: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Save sale'),
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
