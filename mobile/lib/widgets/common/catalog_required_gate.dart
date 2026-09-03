import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/app_mode.dart';
import '../../modules/settings/screens/settings_screen.dart';
import '../../modules/sync/providers/sync_provider.dart';
import 'empty_state.dart';

/// Blocks purchase/sale forms until products exist locally.
class CatalogRequiredGate extends StatelessWidget {
  const CatalogRequiredGate({
    super.key,
    required this.hasProducts,
    required this.child,
    this.loading = false,
    this.loadError,
    this.onRetry,
    this.appBarTitle,
  });

  final bool hasProducts;
  final bool loading;
  final String? loadError;
  final VoidCallback? onRetry;
  final String? appBarTitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (loading) return child;

    final sync = context.watch<SyncProvider>();
    final offline = sync.userMode == AppOperationMode.offline ||
        !sync.isOperatingOnline;

    if (!hasProducts) {
      return Scaffold(
        appBar: AppBar(title: Text(appBarTitle ?? '')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                EmptyState(
                  icon: Icons.inventory_2_outlined,
                  title: offline
                      ? 'Sync items first'
                      : 'Catalog not loaded',
                  subtitle: offline
                      ? 'You need products on this device before offline purchase or sale. Connect online once, then open Settings or Sync to download the catalog.'
                      : (loadError ??
                          'Could not load products from the server.'),
                ),
                const SizedBox(height: 16),
                if (onRetry != null)
                  FilledButton.icon(
                    onPressed: onRetry,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Retry download'),
                  ),
                if (offline) ...[
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const SettingsScreen()),
                    ),
                    child: const Text('Open settings'),
                  ),
                ],
              ],
            ),
          ),
        ),
      );
    }

    return child;
  }
}
