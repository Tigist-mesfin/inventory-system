enum AppOperationMode {
  auto,
  online,
  offline,
}

extension AppOperationModeX on AppOperationMode {
  String get label => switch (this) {
        AppOperationMode.auto => 'Auto',
        AppOperationMode.online => 'Online',
        AppOperationMode.offline => 'Offline',
      };

  String get description => switch (this) {
        AppOperationMode.auto =>
          'Try the server first. If the connection fails, save locally and sync later.',
        AppOperationMode.online =>
          'Always use the server (same as the web app). Requires internet.',
        AppOperationMode.offline =>
          'Always save locally. Sync manually when you choose.',
      };

  static AppOperationMode parse(String? raw) {
    switch (raw?.toLowerCase()) {
      case 'online':
        return AppOperationMode.online;
      case 'offline':
        return AppOperationMode.offline;
      default:
        return AppOperationMode.auto;
    }
  }

  String get storageValue => name;
}
