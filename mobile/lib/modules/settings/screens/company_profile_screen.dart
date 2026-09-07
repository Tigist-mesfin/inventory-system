import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/loading/inventory_loading.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/services/auth_service.dart';
import '../../sync/providers/sync_provider.dart';
import '../providers/company_profile_provider.dart';

class CompanyProfileScreen extends StatefulWidget {
  const CompanyProfileScreen({super.key});

  @override
  State<CompanyProfileScreen> createState() => _CompanyProfileScreenState();
}

class _CompanyProfileScreenState extends State<CompanyProfileScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _tin = TextEditingController();
  final _address = TextEditingController();
  bool _filled = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await context.read<CompanyProfileProvider>().refresh();
      if (!mounted) return;
      _fillFromProvider();
    });
  }

  void _fillFromProvider() {
    final profile = context.read<CompanyProfileProvider>().profile;
    if (profile == null || _filled) return;
    _name.text = profile.name;
    _phone.text = profile.phone;
    _email.text = profile.email;
    _tin.text = profile.tin;
    _address.text = profile.address;
    _filled = true;
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _tin.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final ok = await context.read<CompanyProfileProvider>().save(
          name: _name.text.trim(),
          phone: _phone.text.trim(),
          email: _email.text.trim(),
          tin: _tin.text.trim(),
          address: _address.text.trim(),
        );
    if (!mounted) return;
    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Company details saved')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CompanyProfileProvider>();
    final sync = context.watch<SyncProvider>();
    final auth = context.watch<AuthProvider>();
    final owner = PermissionHelper.isOwner(auth.user);

    if (!owner) {
      return const EmptyState(
        title: 'Owner only',
        subtitle: 'Only the company owner can edit the company profile.',
        icon: Icons.lock_outline,
      );
    }

    if (!sync.isOperatingOnline) {
      return const EmptyState(
        title: 'Company profile offline',
        subtitle: 'Switch to Auto or Online to edit company details.',
        icon: Icons.business_outlined,
      );
    }

    if (provider.loading && provider.profile == null) {
      return const InventoryLoading(message: 'Loading company profile...');
    }

    if (!_filled && provider.profile != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _fillFromProvider());
    }

    return RefreshIndicator(
      onRefresh: () async {
        _filled = false;
        await provider.refresh();
        if (mounted) _fillFromProvider();
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        children: [
          Text(
            'Company profile',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.ink,
                ),
          ),
          const SizedBox(height: 4),
          const Text(
            'This information is printed at the top of every invoice. You can fill it now or later.',
            style: TextStyle(color: AppColors.inkSoft),
          ),
          if (provider.error != null) ...[
            const SizedBox(height: 12),
            ErrorBanner(message: provider.error!),
          ],
          if (provider.savedMessage != null) ...[
            const SizedBox(height: 12),
            Text(
              provider.savedMessage!,
              style: const TextStyle(color: AppColors.brand),
            ),
          ],
          const SizedBox(height: 14),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: _name,
                    decoration:
                        const InputDecoration(labelText: 'Company name'),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _phone,
                    decoration: const InputDecoration(labelText: 'Phone'),
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _email,
                    decoration: const InputDecoration(labelText: 'Email'),
                    keyboardType: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _tin,
                    decoration: const InputDecoration(labelText: 'TIN'),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _address,
                    decoration: const InputDecoration(labelText: 'Address'),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: provider.busy ? null : _save,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.saffron,
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(48),
                    ),
                    child: Text(
                      provider.busy ? 'Saving…' : 'Save company details',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
