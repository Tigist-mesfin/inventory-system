import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../database/app_database.dart';
import '../providers/auth_provider.dart';
import '../services/auth_service.dart';

/// Confirmation + password re-auth for App Store Guideline 5.1.1(v).
class DeleteAccountScreen extends StatefulWidget {
  const DeleteAccountScreen({super.key});

  @override
  State<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends State<DeleteAccountScreen> {
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _obscure = true;
  bool _understood = false;
  String? _localError;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  bool get _isOwner {
    final user = context.read<AuthProvider>().user;
    return PermissionHelper.isOwner(user);
  }

  Future<void> _submit() async {
    setState(() => _localError = null);
    final password = _passwordController.text;
    final confirm = _confirmController.text.trim();

    if (!_understood) {
      setState(() => _localError = 'Confirm that you understand this is permanent.');
      return;
    }
    if (password.isEmpty) {
      setState(() => _localError = 'Enter your password to continue.');
      return;
    }
    if (confirm != 'DELETE') {
      setState(() => _localError = 'Type DELETE in capital letters to confirm.');
      return;
    }

    final auth = context.read<AuthProvider>();
    final ok = await auth.deleteAccount(password: password);
    if (!mounted) return;

    if (!ok) {
      setState(() => _localError = auth.error ?? 'Deletion failed. Your account was not deleted.');
      return;
    }

    try {
      await context.read<AppDatabase>().clearAllLocalData();
    } catch (_) {
      // Session already cleared; local wipe is best-effort.
    }

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Your account has been permanently deleted.'),
      ),
    );
    // AuthProvider.user is null → root navigator shows login.
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final busy = auth.deletingAccount || auth.loading;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Delete account'),
        backgroundColor: AppColors.brand,
        foregroundColor: AppColors.onBrand,
      ),
      body: AbsorbPointer(
        absorbing: busy,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              color: AppColors.coral.withValues(alpha: 0.08),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.warning_amber_rounded, color: AppColors.coral),
                        const SizedBox(width: 8),
                        Text(
                          'Permanent deletion',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                                color: AppColors.coral,
                              ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Deleting your Nigd Stock account is permanent and cannot be undone.',
                      style: TextStyle(color: AppColors.ink, height: 1.45),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'What happens to your personal data',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.ink,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const _Bullet(
                      'Your name, phone, username, and password are removed or anonymized so you can no longer sign in.',
                    ),
                    const _Bullet(
                      'Your active sessions and tokens are revoked immediately.',
                    ),
                    const _Bullet(
                      'You may register again later with the same phone number if registration rules allow.',
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'What is not deleted',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.ink,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const _Bullet(
                      'Company inventory, products, sales, purchases, invoices, and other business records stay with the company for legal and operational retention.',
                    ),
                    const _Bullet(
                      'Other team members’ accounts are not deleted.',
                    ),
                    if (_isOwner) ...[
                      const SizedBox(height: 10),
                      Text(
                        'Company owners',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: AppColors.ink,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const _Bullet(
                        'If you are the only owner and still have active team members, deletion is blocked until you promote another owner or remove those members.',
                      ),
                      const _Bullet(
                        'If you are the only user, your personal login is deleted and the company workspace is closed. Historical business records are retained without your login details.',
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            CheckboxListTile(
              value: _understood,
              onChanged: busy
                  ? null
                  : (value) => setState(() => _understood = value ?? false),
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
              activeColor: AppColors.coral,
              title: const Text(
                'I understand this permanently deletes my personal account',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _passwordController,
              obscureText: _obscure,
              enabled: !busy,
              decoration: InputDecoration(
                labelText: 'Current password',
                hintText: 'Re-enter your password',
                suffixIcon: IconButton(
                  onPressed: () => setState(() => _obscure = !_obscure),
                  icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off),
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _confirmController,
              enabled: !busy,
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(
                labelText: 'Type DELETE to confirm',
                hintText: 'DELETE',
              ),
            ),
            if (_localError != null || auth.error != null) ...[
              const SizedBox(height: 12),
              Text(
                _localError ?? auth.error!,
                style: const TextStyle(color: AppColors.error, height: 1.4),
              ),
            ],
            const SizedBox(height: 20),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.coral,
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(48),
              ),
              onPressed: busy ? null : _submit,
              child: busy
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.4,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Delete my account permanently'),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: busy ? null : () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
          ],
        ),
      ),
    );
  }
}

class _Bullet extends StatelessWidget {
  const _Bullet(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('•  ', style: TextStyle(height: 1.4)),
          Expanded(
            child: Text(
              text,
              style: TextStyle(color: AppColors.inkSoft, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}
