import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/app_colors.dart';
import '../../modules/sync/providers/sync_provider.dart';

class ConnectionStatusBanner extends StatelessWidget {
  const ConnectionStatusBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<SyncProvider>(
      builder: (context, sync, _) {
        final (label, color, icon) = switch (sync.uiState) {
          ConnectionUiState.online => ('Connected · online', AppColors.primary, Icons.cloud_done),
          ConnectionUiState.offline => ('Offline mode', AppColors.offline, Icons.cloud_off),
          ConnectionUiState.autoOffline => (
              'Auto · offline fallback',
              AppColors.warning,
              Icons.cloud_off,
            ),
          ConnectionUiState.syncing => ('Synchronizing...', AppColors.syncing, Icons.sync),
          ConnectionUiState.synced => ('Online · synced', AppColors.primary, Icons.check_circle),
          ConnectionUiState.pending => (
              '${sync.pendingCount} waiting to sync',
              AppColors.warning,
              Icons.pending_actions,
            ),
        };

        return Material(
          color: color.withValues(alpha: 0.12),
          child: InkWell(
            onTap: () => sync.syncNow(),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                children: [
                  Icon(icon, color: color, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          sync.message ?? label,
                          style: TextStyle(
                            color: color,
                            fontWeight: FontWeight.w700,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          sync.modeLabel,
                          style: TextStyle(
                            color: AppColors.inkSoft,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (sync.syncing)
                    SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: color),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class SyncStatusBadge extends StatelessWidget {
  const SyncStatusBadge({super.key, required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      'synced' => ('Synced', AppColors.primary),
      'syncing' => ('Syncing', AppColors.syncing),
      'failed' => ('Failed', AppColors.error),
      _ => ('Pending', AppColors.warning),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }
}
