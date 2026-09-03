import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../core/utils/money_format.dart';
import '../../../database/app_database.dart';
import '../../../modules/sync/providers/sync_provider.dart';
import '../../../widgets/common/catalog_required_gate.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/common/form_dropdown.dart';
import '../../../widgets/loading/inventory_loading.dart';
import '../providers/purchase_provider.dart';
import '../services/purchase_service.dart';

class PurchaseFormScreen extends StatefulWidget {
  const PurchaseFormScreen({super.key});

  @override
  State<PurchaseFormScreen> createState() => _PurchaseFormScreenState();
}

class _Line {
  String? productId;
  String? productName;
  double quantity = 1;
  double unitPrice = 0;
}

class _PurchaseFormScreenState extends State<PurchaseFormScreen> {
  bool _loading = true;
  String? _loadError;
  bool _registeredSupplier = true;
  String? _supplierId;
  String _walkInName = '';
  String? _paymentMethod;
  final _paidController = TextEditingController();
  final _lines = [_Line()];

  List<ProductsCacheData> _products = [];
  List<SuppliersCacheData> _suppliers = [];
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
    final provider = context.read<PurchaseProvider>();
    final sync = context.read<SyncProvider>();
    final refreshed = await provider.ensureReferenceData();
    final results = await Future.wait([
      provider.products(),
      provider.suppliers(),
      provider.paymentMethods(),
    ]);
    if (!mounted) return;
    setState(() {
      _products = results[0] as List<ProductsCacheData>;
      _suppliers = (results[1] as List<SuppliersCacheData>)
          .where((s) => s.name.toLowerCase() != 'walk-in')
          .toList();
      _methods = results[2] as List<PaymentMethodsCacheData>;
      if (_suppliers.isNotEmpty) _supplierId = _suppliers.first.id;
      _paymentMethod = _resolvePaymentMethod();
      if (!refreshed &&
          sync.isOperatingOnline &&
          _products.isEmpty &&
          sync.message != null) {
        _loadError = sync.message;
      }
      _loading = false;
      _syncPaidDefault();
    });
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

  Future<void> _submit() async {
    final items = _lines
        .where((line) => line.productId != null && line.quantity > 0)
        .map(
          (line) => PurchaseLineInput(
            productId: line.productId!,
            productName: line.productName ?? '',
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          ),
        )
        .toList();
    if (items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add at least one product line')),
      );
      return;
    }
    if (_registeredSupplier && (_supplierId == null || _supplierId!.isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select a supplier')),
      );
      return;
    }
    if (!_registeredSupplier && _walkInName.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter walk-in seller name')),
      );
      return;
    }

    final paid =
        double.tryParse(_paidController.text) ?? _grandTotal;

    final ok = await context.read<PurchaseProvider>().createPurchase(
          supplierId: _registeredSupplier ? _supplierId : null,
          walkInName: _registeredSupplier ? null : _walkInName.trim(),
          paymentMethod: _paymentMethod ?? kDefaultPaymentMethods.first,
          paidAmount: paid,
          items: items,
        );
    if (!mounted) return;
    final provider = context.read<PurchaseProvider>();
    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(provider.success ?? 'Saved')),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sync = context.watch<SyncProvider>();
    final online = sync.isOperatingOnline;

    if (_loading) {
      return const Scaffold(body: InventoryLoading());
    }

    return CatalogRequiredGate(
      hasProducts: _products.isNotEmpty,
      loadError: _loadError,
      onRetry: online ? _load : null,
      appBarTitle: 'New purchase',
      child: Scaffold(
        appBar: AppBar(title: const Text('Add purchase')),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_loadError != null) ErrorBanner(message: _loadError!),
            if (online && _suppliers.isEmpty)
              const Padding(
                padding: EdgeInsets.only(bottom: 12),
                child: Text(
                  'No suppliers loaded yet. You can use walk-in seller instead.',
                  style: TextStyle(color: AppColors.warning),
                ),
              ),
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    onPressed: () =>
                        setState(() => _registeredSupplier = true),
                    style: FilledButton.styleFrom(
                      backgroundColor: _registeredSupplier
                          ? AppColors.brand
                          : AppColors.brand.withValues(alpha: 0.18),
                      foregroundColor: _registeredSupplier
                          ? AppColors.onBrand
                          : AppColors.primaryDark,
                    ),
                    child: const Text('Registered supplier'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton(
                    onPressed: () =>
                        setState(() => _registeredSupplier = false),
                    style: FilledButton.styleFrom(
                      backgroundColor: !_registeredSupplier
                          ? AppColors.brand
                          : AppColors.brand.withValues(alpha: 0.18),
                      foregroundColor: !_registeredSupplier
                          ? AppColors.onBrand
                          : AppColors.primaryDark,
                    ),
                    child: const Text('Walk-in seller'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            if (_registeredSupplier)
              FormDropdownField<String>(
                label: 'Supplier',
                value: _supplierId,
                hint: online
                    ? 'Download suppliers while online'
                    : 'No suppliers cached',
                items: _suppliers
                    .map(
                      (s) => DropdownMenuItem(
                        value: s.id,
                        child: Text(s.name),
                      ),
                    )
                    .toList(),
                onChanged: (value) => setState(() => _supplierId = value),
              )
            else
              TextFormField(
                decoration: const InputDecoration(
                  labelText: 'Walk-in seller name',
                  hintText: 'Name of the person you bought from',
                ),
                onChanged: (value) => _walkInName = value,
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
                helperText:
                    'Grand total with VAT: ${moneyEtb(_grandTotal)}',
              ),
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
            ),
            const SizedBox(height: 18),
            Text(
              'Items bought',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
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
                        onChanged: (value) {
                          final product =
                              _products.firstWhere((p) => p.id == value);
                          setState(() {
                            line.productId = value;
                            line.productName = product.name;
                            line.unitPrice = product.purchasePrice;
                            _syncPaidDefault();
                          });
                        },
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
                              key: ValueKey('price-$index-${line.productId}-${line.unitPrice}'),
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
                border: Border.all(color: AppColors.brand.withValues(alpha: 0.25)),
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
                    'Grand total cost: ${moneyEtb(_grandTotal)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                      color: AppColors.ink,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Consumer<PurchaseProvider>(
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
                          : const Text('Save purchase'),
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
