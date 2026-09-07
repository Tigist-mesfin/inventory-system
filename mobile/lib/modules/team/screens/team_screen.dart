import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../database/app_database.dart';
import '../../../models/team_models.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/loading/inventory_loading.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/services/auth_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../providers/team_provider.dart';

class TeamScreen extends StatefulWidget {
  const TeamScreen({super.key});

  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> {
  final _fullName = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  bool _allWarehouses = false;
  final Set<String> _warehouseIds = {};
  final Set<String> _permissions = {};
  String? _editingId;
  bool _obscure = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TeamProvider>().refresh();
    });
  }

  @override
  void dispose() {
    _fullName.dispose();
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  void _resetForm() {
    setState(() {
      _editingId = null;
      _fullName.clear();
      _phone.clear();
      _password.clear();
      _allWarehouses = false;
      _warehouseIds.clear();
      _permissions.clear();
      _obscure = true;
    });
  }

  void _startEdit(SalesmanRow row) {
    setState(() {
      _editingId = row.id;
      _fullName.text = row.fullName;
      _phone.text = row.phoneOrUsername == '—' ? '' : row.phoneOrUsername;
      _password.clear();
      _allWarehouses = row.allWarehouses;
      _warehouseIds
        ..clear()
        ..addAll(row.warehouses.map((store) => store.id));
      _permissions
        ..clear()
        ..addAll(row.permissions.map((p) => p.name));
    });
  }

  Future<void> _submit() async {
    final provider = context.read<TeamProvider>();
    final name = _fullName.text.trim();
    final phone = _phone.text.trim();
    final password = _password.text;
    if (name.length < 2 || phone.length < 7) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid name and phone')),
      );
      return;
    }
    if (_editingId == null && password.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password must be at least 8 characters')),
      );
      return;
    }
    if (!_allWarehouses && _warehouseIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Assign a store or allow all stores')),
      );
      return;
    }

    final wasEdit = _editingId != null;
    final ok = !wasEdit
        ? await provider.createSalesman(
            fullName: name,
            phone: phone,
            password: password,
            allWarehouses: _allWarehouses,
            warehouseIds: _warehouseIds.toList(),
            permissions: _permissions.toList(),
          )
        : await provider.updateSalesman(
            id: _editingId!,
            fullName: name,
            phone: phone,
            password: password.isEmpty ? null : password,
            allWarehouses: _allWarehouses,
            warehouseIds: _warehouseIds.toList(),
            permissions: _permissions.toList(),
          );

    if (!mounted) return;
    if (ok) {
      _resetForm();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(wasEdit ? 'Salesman updated' : 'Salesman created'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final sync = context.watch<SyncProvider>();
    final provider = context.watch<TeamProvider>();
    final online = sync.isOperatingOnline;
    final owner = PermissionHelper.isOwner(auth.user);

    if (!owner) {
      return const EmptyState(
        title: 'Owner only',
        subtitle: 'Only the company owner can manage salesmen.',
        icon: Icons.lock_outline,
      );
    }

    if (!online) {
      return const EmptyState(
        title: 'Salesmen offline',
        subtitle: 'Switch to Auto or Online to manage your team.',
        icon: Icons.groups_outlined,
      );
    }

    if (provider.loading && provider.salesmen.isEmpty) {
      return const InventoryLoading(message: 'Loading salesmen...');
    }

    return RefreshIndicator(
      onRefresh: provider.refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        children: [
          Text(
            'Salesmen',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.ink,
                ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Create a salesman, assign stores, and grant create / read / update / delete per module.',
            style: TextStyle(color: AppColors.inkSoft),
          ),
          if (provider.error != null) ...[
            const SizedBox(height: 12),
            ErrorBanner(message: provider.error!),
          ],
          const SizedBox(height: 14),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    _editingId == null ? 'New salesman' : 'Edit salesman',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _fullName,
                    decoration: const InputDecoration(
                      labelText: 'Name',
                      prefixIcon: Icon(Icons.badge_outlined),
                    ),
                    textInputAction: TextInputAction.next,
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _phone,
                    decoration: const InputDecoration(
                      labelText: 'Phone / username',
                      prefixIcon: Icon(Icons.phone_outlined),
                    ),
                    keyboardType: TextInputType.phone,
                    textInputAction: TextInputAction.next,
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _password,
                    decoration: InputDecoration(
                      labelText: _editingId == null
                          ? 'Password'
                          : 'New password (optional)',
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(
                        onPressed: () => setState(() => _obscure = !_obscure),
                        icon: Icon(
                          _obscure
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                      ),
                    ),
                    obscureText: _obscure,
                  ),
                  const SizedBox(height: 8),
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    value: _allWarehouses,
                    onChanged: (value) {
                      setState(() {
                        _allWarehouses = value ?? false;
                        if (_allWarehouses) _warehouseIds.clear();
                      });
                    },
                    title: const Text('Access all stores'),
                    controlAffinity: ListTileControlAffinity.leading,
                    activeColor: AppColors.brand,
                  ),
                  if (!_allWarehouses) ...[
                    const Text(
                      'Assigned stores',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.inkSoft,
                      ),
                    ),
                    const SizedBox(height: 6),
                    if (provider.warehouses.isEmpty)
                      const Text(
                        'Create a store first under Warehouses.',
                        style: TextStyle(color: AppColors.inkSoft),
                      )
                    else
                      ...provider.warehouses.map(
                        (store) => CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          dense: true,
                          value: _warehouseIds.contains(store.id),
                          onChanged: (checked) {
                            setState(() {
                              if (checked == true) {
                                _warehouseIds.add(store.id);
                              } else {
                                _warehouseIds.remove(store.id);
                              }
                            });
                          },
                          title: Text(_storeLabel(store)),
                          controlAffinity: ListTileControlAffinity.leading,
                          activeColor: AppColors.brand,
                        ),
                      ),
                  ],
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Expanded(
                        child: Text(
                          'Module access',
                          style: TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          setState(() {
                            _permissions
                              ..clear()
                              ..addAll(allTeamPermissionNames());
                          });
                        },
                        child: const Text('Select all'),
                      ),
                      TextButton(
                        onPressed: () {
                          setState(() => _permissions.clear());
                        },
                        child: const Text('Clear'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  _PermissionsTable(
                    selected: _permissions,
                    onToggle: (name) {
                      setState(() {
                        if (_permissions.contains(name)) {
                          _permissions.remove(name);
                        } else {
                          _permissions.add(name);
                        }
                      });
                    },
                    onToggleModule: (moduleKey, grant) {
                      setState(() {
                        for (final action in kTeamActions) {
                          final name =
                              teamPermissionName(moduleKey, action);
                          if (grant) {
                            _permissions.add(name);
                          } else {
                            _permissions.remove(name);
                          }
                        }
                      });
                    },
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton(
                          onPressed: provider.busy ? null : _submit,
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.brand,
                            minimumSize: const Size.fromHeight(48),
                          ),
                          child: Text(
                            provider.busy
                                ? 'Saving…'
                                : (_editingId == null
                                    ? 'Create salesman'
                                    : 'Save salesman'),
                          ),
                        ),
                      ),
                      if (_editingId != null) ...[
                        const SizedBox(width: 10),
                        OutlinedButton(
                          onPressed: provider.busy ? null : _resetForm,
                          child: const Text('Cancel'),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Team list',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 8),
          if (provider.salesmen.isEmpty)
            const EmptyState(
              title: 'No salesmen yet',
              icon: Icons.groups_outlined,
            )
          else
            _SalesmenTable(
              rows: provider.salesmen,
              onEdit: _startEdit,
            ),
        ],
      ),
    );
  }

  String _storeLabel(WarehousesCacheData store) {
    final code = store.code;
    if (code == null || code.isEmpty) return store.name;
    return '${store.name} ($code)';
  }
}

class _PermissionsTable extends StatelessWidget {
  const _PermissionsTable({
    required this.selected,
    required this.onToggle,
    required this.onToggleModule,
  });

  final Set<String> selected;
  final ValueChanged<String> onToggle;
  final void Function(String moduleKey, bool grant) onToggleModule;

  @override
  Widget build(BuildContext context) {
    const headerStyle = TextStyle(
      color: Colors.white,
      fontWeight: FontWeight.w700,
      fontSize: 12,
    );
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.line),
        color: Colors.white,
      ),
      clipBehavior: Clip.antiAlias,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          headingRowColor: WidgetStateProperty.all(AppColors.brand),
          headingRowHeight: 42,
          dataRowMinHeight: 44,
          dataRowMaxHeight: 52,
          columnSpacing: 10,
          horizontalMargin: 10,
          columns: [
            const DataColumn(label: Text('Module', style: headerStyle)),
            ...kTeamActions.map(
              (action) => DataColumn(
                label: Text(action, style: headerStyle),
              ),
            ),
            const DataColumn(label: Text('All', style: headerStyle)),
          ],
          rows: kTeamModules.map((mod) {
            final moduleNames = kTeamActions
                .map((action) => teamPermissionName(mod.key, action))
                .toList();
            final allGranted =
                moduleNames.every(selected.contains);
            return DataRow(
              cells: [
                DataCell(
                  Text(
                    mod.label,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
                ...kTeamActions.map((action) {
                  final name = teamPermissionName(mod.key, action);
                  return DataCell(
                    Checkbox(
                      value: selected.contains(name),
                      onChanged: (_) => onToggle(name),
                      activeColor: AppColors.brand,
                    ),
                  );
                }),
                DataCell(
                  Checkbox(
                    value: allGranted,
                    onChanged: (value) =>
                        onToggleModule(mod.key, value ?? false),
                    activeColor: AppColors.brand,
                  ),
                ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }
}

class _SalesmenTable extends StatelessWidget {
  const _SalesmenTable({
    required this.rows,
    required this.onEdit,
  });

  final List<SalesmanRow> rows;
  final ValueChanged<SalesmanRow> onEdit;

  static const _headerStyle = TextStyle(
    color: Colors.white,
    fontWeight: FontWeight.w700,
  );

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.line),
        color: Colors.white,
      ),
      clipBehavior: Clip.antiAlias,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minWidth: 760),
          child: DataTable(
            headingRowColor: WidgetStateProperty.all(AppColors.brand),
            headingRowHeight: 46,
            dataRowMinHeight: 56,
            dataRowMaxHeight: 80,
            columnSpacing: 16,
            columns: const [
              DataColumn(label: Text('Name', style: _headerStyle)),
              DataColumn(label: Text('Phone', style: _headerStyle)),
              DataColumn(label: Text('Stores', style: _headerStyle)),
              DataColumn(label: Text('Access', style: _headerStyle)),
              DataColumn(label: Text('', style: _headerStyle)),
            ],
            rows: rows
                .map(
                  (row) => DataRow(
                    cells: [
                      DataCell(
                        Text(
                          row.fullName,
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                      DataCell(Text(row.phoneOrUsername)),
                      DataCell(
                        SizedBox(
                          width: 140,
                          child: Text(
                            row.storesLabel,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),
                      DataCell(
                        SizedBox(
                          width: 220,
                          child: Text(
                            row.accessLabel,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.inkSoft,
                            ),
                          ),
                        ),
                      ),
                      DataCell(
                        OutlinedButton(
                          onPressed: () => onEdit(row),
                          child: const Text('Edit'),
                        ),
                      ),
                    ],
                  ),
                )
                .toList(),
          ),
        ),
      ),
    );
  }
}
