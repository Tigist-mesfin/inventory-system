import 'package:drift/drift.dart' hide Column;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';

import '../../../database/app_database.dart';
import '../../../widgets/common/connection_status_banner.dart';
import '../../../widgets/common/empty_state.dart';
import '../providers/sync_provider.dart';

class SyncScreen extends StatelessWidget {
  const SyncScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final sync = context.watch<SyncProvider>();
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: ListTile(
            leading: Icon(
              sync.deviceOnline ? Icons.cloud_done : Icons.cloud_off,
              color: sync.deviceOnline ? AppColors.primary : AppColors.offline,
            ),
            title: Text(sync.deviceOnline ? 'Online' : 'Offline'),
            subtitle: Text(sync.message ?? 'Tap sync to upload pending records'),
            trailing: ElevatedButton(
              onPressed: sync.syncing ? null : () => sync.syncNow(),
              child: sync.syncing
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Sync now'),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: ListTile(
            title: const Text('Pending transactions'),
            trailing: Text(
              '${sync.pendingCount}',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text('Local purchases', style: Theme.of(context).textTheme.titleMedium),
        _PurchaseSyncList(),
        const SizedBox(height: 16),
        Text('Local sales', style: Theme.of(context).textTheme.titleMedium),
        _SalesSyncList(),
      ],
    );
  }
}

class _PurchaseSyncList extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final db = context.read<AppDatabase>();
    return StreamBuilder<List<LocalPurchase>>(
      stream: (db.select(db.localPurchases)
            ..orderBy([(t) => OrderingTerm.desc(t.createdAt)]))
          .watch(),
      builder: (context, snapshot) {
        final rows = snapshot.data ?? [];
        if (rows.isEmpty) {
          return const EmptyState(title: 'No local purchases');
        }
        return Column(
          children: rows
              .map(
                (row) => Card(
                  child: ListTile(
                    title: Text(row.orderNumber ?? row.clientTransactionId),
                    subtitle: Text(row.lastSyncError ?? row.sourceMode),
                    trailing: SyncStatusBadge(status: row.syncStatus),
                  ),
                ),
              )
              .toList(),
        );
      },
    );
  }
}

class _SalesSyncList extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final db = context.read<AppDatabase>();
    return StreamBuilder<List<LocalSale>>(
      stream: (db.select(db.localSales)
            ..orderBy([(t) => OrderingTerm.desc(t.createdAt)]))
          .watch(),
      builder: (context, snapshot) {
        final rows = snapshot.data ?? [];
        if (rows.isEmpty) {
          return const EmptyState(title: 'No local sales');
        }
        return Column(
          children: rows
              .map(
                (row) => Card(
                  child: ListTile(
                    title: Text(row.invoiceNumber ?? row.clientTransactionId),
                    subtitle: Text(row.lastSyncError ?? row.sourceMode),
                    trailing: SyncStatusBadge(status: row.syncStatus),
                  ),
                ),
              )
              .toList(),
        );
      },
    );
  }
}
