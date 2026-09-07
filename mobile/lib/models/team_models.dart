class SalesmanStore {
  SalesmanStore({
    required this.id,
    required this.name,
    this.code = '',
  });

  factory SalesmanStore.fromJson(Map<String, dynamic> json) {
    return SalesmanStore(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
    );
  }

  final String id;
  final String name;
  final String code;
}

class SalesmanPermission {
  SalesmanPermission({
    required this.id,
    required this.name,
    required this.module,
    required this.action,
  });

  factory SalesmanPermission.fromJson(Map<String, dynamic> json) {
    return SalesmanPermission(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      module: json['module']?.toString() ?? '',
      action: json['action']?.toString() ?? '',
    );
  }

  final String id;
  final String name;
  final String module;
  final String action;
}

class SalesmanRow {
  SalesmanRow({
    required this.id,
    required this.fullName,
    required this.username,
    required this.phone,
    required this.allWarehouses,
    required this.warehouses,
    required this.permissions,
    this.status = 'ACTIVE',
  });

  factory SalesmanRow.fromJson(Map<String, dynamic> json) {
    final warehouses = (json['warehouses'] as List?)
            ?.whereType<Map>()
            .map((row) => SalesmanStore.fromJson(Map<String, dynamic>.from(row)))
            .toList() ??
        const <SalesmanStore>[];
    final permissions = (json['permissions'] as List?)
            ?.whereType<Map>()
            .map(
              (row) =>
                  SalesmanPermission.fromJson(Map<String, dynamic>.from(row)),
            )
            .toList() ??
        const <SalesmanPermission>[];
    return SalesmanRow(
      id: json['id']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? '',
      username: json['username']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      allWarehouses: json['allWarehouses'] == true,
      warehouses: warehouses,
      permissions: permissions,
      status: json['status']?.toString() ?? 'ACTIVE',
    );
  }

  final String id;
  final String fullName;
  final String username;
  final String phone;
  final bool allWarehouses;
  final List<SalesmanStore> warehouses;
  final List<SalesmanPermission> permissions;
  final String status;

  String get phoneOrUsername =>
      phone.isNotEmpty ? phone : (username.isNotEmpty ? username : '—');

  String get storesLabel {
    if (allWarehouses) return 'All stores';
    if (warehouses.isEmpty) return 'None';
    return warehouses.map((row) => row.name).join(', ');
  }

  String get accessLabel {
    if (permissions.isEmpty) return 'None';
    return permissions.map((row) => row.name).join(', ');
  }
}

class TeamModuleDef {
  const TeamModuleDef(this.key, this.label);

  final String key;
  final String label;
}

const kTeamModules = <TeamModuleDef>[
  TeamModuleDef('sales', 'Sales'),
  TeamModuleDef('purchasing', 'Purchasing'),
  TeamModuleDef('inventory', 'Stock'),
  TeamModuleDef('catalog', 'Products'),
  TeamModuleDef('warehouse', 'Stores'),
  TeamModuleDef('customers', 'Customers & suppliers'),
  TeamModuleDef('finance', 'Expenses & profit'),
  TeamModuleDef('insights', 'AI desk / reports'),
  TeamModuleDef('auth', 'Team / company'),
  TeamModuleDef('audit', 'Audit log'),
];

const kTeamActions = <String>[
  'READ',
  'CREATE',
  'UPDATE',
  'DELETE',
  'APPROVE',
  'EXPORT',
];

String teamPermissionName(String module, String action) => '$module:$action';

List<String> allTeamPermissionNames() => [
      for (final mod in kTeamModules)
        for (final action in kTeamActions) teamPermissionName(mod.key, action),
    ];
