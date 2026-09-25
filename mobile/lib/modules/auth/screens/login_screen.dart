import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../core/config/app_config.dart';
import '../../../widgets/common/empty_state.dart';
import '../providers/auth_provider.dart';
import '../widgets/auth_brand.dart';
import 'register_screen.dart';

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
  bool _obscure = true;

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

  Future<void> _openRegister() async {
    context.read<AuthProvider>().clearError();
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const RegisterScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AuthPageScaffold(
      child: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
            children: [
              const AuthLogoHeader(
                title: 'Nigd Stock',
                subtitle: 'Know every sack, size, and shilling.',
              ),
              const SizedBox(height: 22),
              AuthModeSwitcher(
                isLogin: true,
                onLogin: () {},
                onRegister: _openRegister,
              ),
              const SizedBox(height: 16),
              AuthFormCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Welcome back',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: AppColors.ink,
                          ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Sign in to manage purchases and sales online or offline.',
                      style: TextStyle(color: AppColors.inkSoft, height: 1.35),
                    ),
                    const SizedBox(height: 18),
                    if (_showUrlOverride) ...[
                      TextField(
                        controller: _baseUrl,
                        decoration: const InputDecoration(
                          labelText: 'Server URL (dev only)',
                          hintText: 'http://10.0.2.2:3000',
                          prefixIcon: Icon(Icons.dns_outlined),
                        ),
                        keyboardType: TextInputType.url,
                      ),
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        onPressed:
                            auth.testingConnection ? null : _testConnection,
                        icon: auth.testingConnection
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.wifi_find_rounded),
                        label: const Text('Test server connection'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.brand,
                          side: BorderSide(
                            color: AppColors.brand.withValues(alpha: 0.35),
                          ),
                          minimumSize: const Size.fromHeight(46),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],
                    TextField(
                      controller: _username,
                      decoration: const InputDecoration(
                        labelText: 'Phone or username',
                        prefixIcon: Icon(Icons.person_outline_rounded),
                      ),
                      textInputAction: TextInputAction.next,
                      keyboardType: TextInputType.text,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _password,
                      decoration: InputDecoration(
                        labelText: 'Password',
                        prefixIcon: const Icon(Icons.lock_outline_rounded),
                        suffixIcon: IconButton(
                          onPressed: () =>
                              setState(() => _obscure = !_obscure),
                          icon: Icon(
                            _obscure
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                        ),
                      ),
                      obscureText: _obscure,
                      onSubmitted: (_) => _submit(),
                    ),
                    if (auth.error != null) ...[
                      const SizedBox(height: 12),
                      ErrorBanner(message: auth.error!),
                    ],
                    const SizedBox(height: 18),
                    FilledButton(
                      onPressed: auth.loading ? null : _submit,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.brand,
                        foregroundColor: Colors.white,
                        minimumSize: const Size.fromHeight(52),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: auth.loading
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.4,
                                color: Colors.white,
                              ),
                            )
                          : const Text(
                              'Enter the desk',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 16,
                              ),
                            ),
                    ),
                    const SizedBox(height: 14),
                    TextButton(
                      onPressed: auth.loading ? null : _openRegister,
                      child: const Text.rich(
                        TextSpan(
                          style: TextStyle(color: AppColors.inkSoft),
                          children: [
                            TextSpan(text: 'New company? '),
                            TextSpan(
                              text: 'Register',
                              style: TextStyle(
                                color: AppColors.brand,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              const AuthHelpFooter(),
            ],
          );
        },
      ),
    );
  }
}
