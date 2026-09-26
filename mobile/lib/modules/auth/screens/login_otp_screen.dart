import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../core/config/app_config.dart';
import '../../../widgets/common/empty_state.dart';
import '../models/otp_models.dart';
import '../providers/auth_provider.dart';
import '../widgets/auth_brand.dart';
import 'otp_verify_screen.dart';

class LoginOtpScreen extends StatefulWidget {
  const LoginOtpScreen({super.key});

  @override
  State<LoginOtpScreen> createState() => _LoginOtpScreenState();
}

class _LoginOtpScreenState extends State<LoginOtpScreen> {
  final _phone = TextEditingController();
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
    _phone.dispose();
    _baseUrl.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    final phone = _phone.text.trim();
    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Enter your phone number'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final auth = context.read<AuthProvider>();
    final challenge = await auth.requestLoginOtp(
      phone: phone,
      baseUrl: _showUrlOverride ? _baseUrl.text.trim() : null,
    );
    if (!mounted || challenge == null) return;

    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => OtpVerifyScreen(
          phone: challenge.phone.isNotEmpty ? challenge.phone : phone,
          purpose: OtpPurpose.login,
          title: 'Verify your phone',
          subtitle:
              'We sent a 4-digit login code to your phone. Enter it to sign in.',
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
                title: 'Login with OTP',
                subtitle: 'We will text a 4-digit code to your phone.',
              ),
              const SizedBox(height: 22),
              AuthFormCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Phone number',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: AppColors.ink,
                          ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Registered or new — we will text a code to sign you in.',
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
                      controller: _phone,
                      decoration: const InputDecoration(
                        labelText: 'Phone',
                        prefixIcon: Icon(Icons.phone_outlined),
                      ),
                      keyboardType: TextInputType.phone,
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) {
                        if (!auth.loading) _sendOtp();
                      },
                    ),
                    if (auth.error != null) ...[
                      const SizedBox(height: 12),
                      ErrorBanner(message: auth.error!),
                    ],
                    const SizedBox(height: 18),
                    FilledButton(
                      onPressed: auth.loading ? null : _sendOtp,
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
                              'Send OTP',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 16,
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
