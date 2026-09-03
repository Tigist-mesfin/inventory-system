import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../core/config/app_config.dart';
import '../../../core/theme/app_theme.dart';
import '../../../widgets/common/empty_state.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _username = TextEditingController();
  final _password = TextEditingController();
  late final TextEditingController _baseUrl = TextEditingController(
    text: AppConfig.apiBaseUrl,
  );

  bool get _showUrlOverride => AppConfig.allowUrlOverride;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final saved = context.read<AuthProvider>().baseUrl;
      if (saved.isNotEmpty) {
        _baseUrl.text = saved;
      }
    });
  }

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    _baseUrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final auth = context.read<AuthProvider>();
    await auth.login(
      username: _username.text.trim(),
      password: _password.text,
      baseUrl: _showUrlOverride ? _baseUrl.text.trim() : null,
    );
  }

  Future<void> _testConnection() async {
    final auth = context.read<AuthProvider>();
    final url = _showUrlOverride ? _baseUrl.text.trim() : auth.baseUrl;
    final ok = await auth.testConnection(url);
    if (!mounted) return;
    final message = ok ? auth.connectionMessage : auth.error;
    if (message != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: ok ? AppColors.primary : AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: AppTheme.scaffoldDecoration,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Consumer<AuthProvider>(
          builder: (context, auth, _) {
            return ListView(
              padding: const EdgeInsets.all(24),
              children: [
                const SizedBox(height: 40),
                Icon(
                  Icons.inventory_2,
                  size: 72,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(height: 16),
                Text(
                  'Inventory Mobile',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Sign in to manage purchases and sales online or offline.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                if (_showUrlOverride) ...[
                  TextField(
                    controller: _baseUrl,
                    decoration: const InputDecoration(
                      labelText: 'Server URL (dev only)',
                      hintText: 'http://10.0.2.2:3000',
                      helperText: 'Override for local backend testing',
                    ),
                    keyboardType: TextInputType.url,
                  ),
                  const SizedBox(height: 8),
                ] else
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.cloud, color: AppColors.primary),
                      title: const Text('Production API'),
                      subtitle: Text(auth.baseUrl),
                    ),
                  ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: auth.testingConnection ? null : _testConnection,
                  icon: auth.testingConnection
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.wifi_find),
                  label: const Text('Test server connection'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _username,
                  decoration: const InputDecoration(labelText: 'Username'),
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _password,
                  decoration: const InputDecoration(labelText: 'Password'),
                  obscureText: true,
                  onSubmitted: (_) => _submit(),
                ),
                if (auth.error != null) ...[
                  const SizedBox(height: 12),
                  ErrorBanner(message: auth.error!),
                ],
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: auth.loading ? null : _submit,
                  child: auth.loading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Sign in'),
                ),
              ],
            );
          },
        ),
        ),
      ),
    );
  }
}
