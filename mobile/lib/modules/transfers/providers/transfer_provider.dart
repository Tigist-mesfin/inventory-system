import 'package:flutter/foundation.dart';

import '../../../core/errors/app_exception.dart';
import '../../../models/catalog_models.dart';
import '../../sync/providers/sync_provider.dart';
import '../../warehouse/services/warehouse_service.dart';
import '../services/transfer_service.dart';

class TransferProvider extends ChangeNotifier {
  TransferProvider({
    required TransferService transferService,
    required SyncProvider sync,
  })  : _transferService = transferService,
        _sync = sync;

  final TransferService _transferService;
  final SyncProvider _sync;

  bool _loading = false;
  bool _busy = false;
  String? _error;
  List<StockTransferRow> _transfers = [];
  List<WarehouseRow> _warehouses = [];
  List<CatalogProduct> _products = [];

  bool get loading => _loading;
  bool get busy => _busy;
  String? get error => _error;
  List<StockTransferRow> get transfers => _transfers;
  List<WarehouseRow> get warehouses => _warehouses;
  List<CatalogProduct> get products => _products;

  Future<void> refresh() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      if (!_sync.isOperatingOnline) {
        _error = 'Transfers require online mode';
        return;
      }
      if (!await _sync.ensureAuthenticated()) {
        _error = 'Not signed in — log in again';
        return;
      }
      final results = await Future.wait([
        _transferService.fetchTransfers(),
        _transferService.fetchWarehouses(),
        _transferService.fetchProducts(),
      ]);
      _transfers = results[0] as List<StockTransferRow>;
      _warehouses = results[1] as List<WarehouseRow>;
      _products = results[2] as List<CatalogProduct>;
    } catch (error) {
      _error = friendlyError(error);
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> transferNow({
    required String sourceWarehouseId,
    required String destinationWarehouseId,
    required String productId,
    required double quantity,
  }) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await _transferService.transferNow(
        sourceWarehouseId: sourceWarehouseId,
        destinationWarehouseId: destinationWarehouseId,
        productId: productId,
        quantity: quantity,
      );
      await refresh();
      return true;
    } catch (error) {
      _error = friendlyError(error);
      return false;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }
}
