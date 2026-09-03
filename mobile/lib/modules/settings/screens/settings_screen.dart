import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../constants/app_mode.dart';
import '../../sync/providers/sync_provider.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<SyncProvider>(
      builder: (context, sync, _) {
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Connection mode',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: AppColors.ink,
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Choose how the app talks to the server. Auto tries online first (like the web app), then falls back to offline if the connection fails.',
                      style: TextStyle(color: AppColors.inkSoft, height: 1.4),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            ...AppOperationMode.values.map(
              (mode) => Card(
                margin: const EdgeInsets.only(bottom: 10),
                child: RadioListTile<AppOperationMode>(
                  value: mode,
                  groupValue: sync.userMode,
                  activeColor: AppColors.brand,
                  title: Text(
                    mode.label,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: Text(mode.description),
                  onChanged: (value) {
                    if (value != null) sync.setUserMode(value);
                  },
                ),
              ),
            ),
            const SizedBox(height: 8),
            Card(
              child: ListTile(
                leading: const Icon(Icons.info_outline, color: AppColors.primary),
                title: const Text('Current status'),
                subtitle: Text('${sync.modeLabel}\n${sync.message ?? ''}'),
                isThreeLine: true,
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: sync.syncing ? null : () => sync.syncNow(),
              icon: const Icon(Icons.sync),
              label: const Text('Sync pending now'),
            ),
          ],
        );
      },
    );
  }
}
