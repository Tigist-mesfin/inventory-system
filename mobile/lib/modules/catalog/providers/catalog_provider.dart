import 'package:flutter/foundation.dart';

import '../../../constants/app_mode.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/services/api_logger.dart';
import '../../../models/catalog_models.dart';
import '../../../network/api_endpoints.dart';
import '../../../services/cache_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../services/catalog_service.dart';

class CatalogProvider extends ChangeNotifier {
  CatalogProvider({
    required CatalogService catalogService,
    required CacheService cache,
    required SyncProvider sync,
  })  : _catalogService = catalogService,
        _cache = cache,
        _sync = sync;

  final CatalogService _catalogService;
  final CacheService _cache;
  final SyncProvider _sync;

  bool _loading = false;
  bool _busy = false;
  String? _error;
  String _search = '';
  List<CatalogProduct> _products = [];

  bool get loading => _loading;
  bool get busy => _busy;
  String? get error => _error;
  String get search => _search;
  List<CatalogProduct> get products => _products;

  List<CatalogProduct> get visible =>
      _products.where((row) => row.matches(_search)).toList();

  Future<void> refresh({String? search}) async {
    _loading = true;
    _error = null;
    if (search != null) _search = search;
    notifyListeners();
    try {
      if (!_sync.isOperatingOnline) {
        _error = 'Products require online mode';
        _products = [];
        return;
      }
      if (!await _sync.ensureAuthenticated()) {
        _error = 'Not signed in — log in again';
        return;
      }
      _products = await _catalogService.fetchProducts();
    } catch (error) {
      _error = friendlyError(error);
      ApiLogger.error('GET', ApiEndpoints.products, error);
      if (_sync.userMode == AppOperationMode.auto) {
        _sync.markServerUnreachable();
      }
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void setSearch(String value) {
    _search = value;
    notifyListeners();
  }

  Future<bool> saveProduct({
    String? id,
    required String name,
    required String unit,
    String brand = '',
    String serialNumber = '',
    String color = '',
    double sellingPrice = 0,
  }) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      if (id == null) {
        await _catalogService.createProduct(
          name: name,
          unit: unit,
          brand: brand,
          serialNumber: serialNumber,
          color: color,
          sellingPrice: sellingPrice,
        );
      } else {
        await _catalogService.updateProduct(
          id: id,
          name: name,
          unit: unit,
          brand: brand,
          serialNumber: serialNumber,
          color: color,
          sellingPrice: sellingPrice,
        );
      }
      try {
        await _cache.refreshProducts();
      } catch (_) {}
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

  Future<bool> deleteProduct(String id) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await _catalogService.deleteProduct(id);
      try {
        await _cache.refreshProducts();
      } catch (_) {}
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
