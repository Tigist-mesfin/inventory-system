import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../core/config/app_config.dart';
import '../../../widgets/common/empty_state.dart';
import '../models/otp_models.dart';
import '../providers/auth_provider.dart';
import '../widgets/auth_brand.dart';
import 'otp_verify_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _address = TextEditingController();
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
    _name.dispose();
    _phone.dispose();
    _address.dispose();
    _password.dispose();
    _baseUrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final auth = context.read<AuthProvider>();
    final phone = _phone.text.trim();
    final challenge = await auth.registerCompany(
      name: _name.text.trim(),
      phone: phone,
      address: _address.text.trim(),
      password: _password.text,
      baseUrl: _showUrlOverride ? _baseUrl.text.trim() : null,
    );
    if (!mounted) return;

    if (challenge == null) {
      // Pending account already exists (e.g. SMS failed earlier) — continue verification.
      if (auth.errorCode == 'ACCOUNT_PENDING' && phone.isNotEmpty) {
        auth.clearError();
        await Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => OtpVerifyScreen(
              phone: phone,
              purpose: OtpPurpose.registration,
              title: 'Verify your phone',
              subtitle:
                  'This phone is pending verification. Enter the OTP or resend a new code.',
              initialCooldownSeconds: 0,
              onVerified: (context) {
                Navigator.of(context).popUntil((route) => route.isFirst);
              },
            ),
          ),
        );
      }
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => OtpVerifyScreen(
          phone: challenge.phone.isNotEmpty ? challenge.phone : phone,
          purpose: OtpPurpose.registration,
          title: 'Verify your phone',
          subtitle:
              'We sent a 4-digit OTP to your phone. Verify to activate your company.',
          onVerified: (context) {
            Navigator.of(context).popUntil((route) => route.isFirst);
          },
        ),
      ),
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
              Align(
                alignment: Alignment.centerLeft,
                child: IconButton(
                  onPressed: () {
                    auth.clearError();
                    Navigator.of(context).maybePop();
                  },
                  icon: const Icon(Icons.arrow_back_rounded),
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: AppColors.ink,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              const AuthLogoHeader(
                title: 'Register your company',
                subtitle: 'Then add stores and salesmen.',
              ),
              const SizedBox(height: 22),
              AuthModeSwitcher(
                isLogin: false,
                onLogin: () {
                  auth.clearError();
                  Navigator.of(context).maybePop();
                },
                onRegister: () {},
              ),
              const SizedBox(height: 16),
              AuthFormCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Create your workspace',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: AppColors.ink,
                          ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Set up your company account in a minute.',
                      style: TextStyle(color: AppColors.inkSoft, height: 1.35),
                    ),
                    const SizedBox(height: 18),
                    if (_showUrlOverride) ...[
                      TextField(
                        controller: _baseUrl,
                        decoration: const InputDecoration(
                          labelText: 'Server URL (dev only)',
                          prefixIcon: Icon(Icons.dns_outlined),
                        ),
                        keyboardType: TextInputType.url,
                      ),
                      const SizedBox(height: 12),
                    ],
                    TextField(
                      controller: _name,
                      decoration: const InputDecoration(
                        labelText: 'Company name',
                        prefixIcon: Icon(Icons.storefront_outlined),
                      ),
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _phone,
                      decoration: const InputDecoration(
                        labelText: 'Phone',
                        prefixIcon: Icon(Icons.phone_outlined),
                      ),
                      keyboardType: TextInputType.phone,
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _address,
                      decoration: const InputDecoration(
                        labelText: 'Address (optional)',
                        prefixIcon: Icon(Icons.location_on_outlined),
                      ),
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _password,
                      decoration: InputDecoration(
                        labelText: 'Password (min 8 characters)',
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
                              'Create company',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 16,
                              ),
                            ),
                    ),
                    const SizedBox(height: 14),
                    TextButton(
                      onPressed: auth.loading
                          ? null
                          : () {
                              auth.clearError();
                              Navigator.of(context).maybePop();
                            },
                      child: const Text.rich(
                        TextSpan(
                          style: TextStyle(color: AppColors.inkSoft),
                          children: [
                            TextSpan(text: 'Already registered? '),
                            TextSpan(
                              text: 'Sign in',
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
