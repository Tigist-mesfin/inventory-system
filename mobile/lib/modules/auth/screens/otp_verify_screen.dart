import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../../constants/app_colors.dart';
import '../../../widgets/common/empty_state.dart';
import '../models/otp_models.dart';
import '../providers/auth_provider.dart';
import '../widgets/auth_brand.dart';

/// Shared 4-digit OTP verification UI for registration, login, and password reset.
class OtpVerifyScreen extends StatefulWidget {
  const OtpVerifyScreen({
    super.key,
    required this.phone,
    required this.purpose,
    this.title = 'Verify your phone',
    this.subtitle,
    this.onVerified,
    this.initialCooldownSeconds = 60,
  });

  final String phone;
  final OtpPurpose purpose;
  final String title;
  final String? subtitle;
  final FutureOr<void> Function(BuildContext context)? onVerified;
  final int initialCooldownSeconds;

  @override
  State<OtpVerifyScreen> createState() => _OtpVerifyScreenState();
}

class _OtpVerifyScreenState extends State<OtpVerifyScreen> {
  final _otp = TextEditingController();
  Timer? _timer;
  int _cooldown = 0;

  @override
  void initState() {
    super.initState();
    _startCooldown(widget.initialCooldownSeconds);
  }

  @override
  void dispose() {
    _timer?.cancel();
    _otp.dispose();
    super.dispose();
  }

  void _startCooldown(int seconds) {
    _timer?.cancel();
    setState(() => _cooldown = seconds < 0 ? 0 : seconds);
    if (_cooldown <= 0) return;
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_cooldown <= 1) {
        timer.cancel();
        setState(() => _cooldown = 0);
      } else {
        setState(() => _cooldown -= 1);
      }
    });
  }

  String get _maskedPhone {
    final phone = widget.phone;
    if (phone.length <= 4) return phone;
    return '${'*' * (phone.length - 4)}${phone.substring(phone.length - 4)}';
  }

  Future<void> _verify() async {
    final code = _otp.text.trim();
    if (code.length != 4) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Enter the 4-digit OTP'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final auth = context.read<AuthProvider>();
    final ok = await auth.verifyOtp(
      purpose: widget.purpose,
      phone: widget.phone,
      otp: code,
    );
    if (!mounted) return;
    if (!ok) return;

    if (widget.onVerified != null) {
      await widget.onVerified!(context);
    } else {
      Navigator.of(context).popUntil((route) => route.isFirst);
    }
  }

  Future<void> _resend() async {
    if (_cooldown > 0) return;
    final auth = context.read<AuthProvider>();
    final challenge = await auth.resendOtp(
      purpose: widget.purpose,
      phone: widget.phone,
    );
    if (!mounted) return;
    if (challenge != null) {
      _otp.clear();
      _startCooldown(60);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('A new OTP was sent'),
          backgroundColor: AppColors.brand,
        ),
      );
      return;
    }

    final seconds = auth.resendCooldownSeconds();
    if (auth.errorCode == 'OTP_RESEND_COOLDOWN' ||
        (auth.error?.toLowerCase().contains('wait') ?? false)) {
      _startCooldown(seconds);
    }
  }

  @override
  Widget build(BuildContext context) {
    final subtitle = widget.subtitle ??
        'We sent a 4-digit code to $_maskedPhone. Enter it below to continue.';

    return AuthPageScaffold(
      child: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: IconButton(
                  onPressed: auth.loading
                      ? null
                      : () {
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
              AuthLogoHeader(
                title: widget.title,
                subtitle: subtitle,
              ),
              const SizedBox(height: 22),
              AuthFormCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Enter OTP',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: AppColors.ink,
                          ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Use the 4-digit code from your SMS.',
                      style: TextStyle(color: AppColors.inkSoft, height: 1.35),
                    ),
                    const SizedBox(height: 18),
                    TextField(
                      controller: _otp,
                      decoration: const InputDecoration(
                        labelText: '4-digit OTP',
                        prefixIcon: Icon(Icons.sms_outlined),
                        counterText: '',
                      ),
                      keyboardType: TextInputType.number,
                      textInputAction: TextInputAction.done,
                      maxLength: 4,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(4),
                      ],
                      onSubmitted: (_) {
                        if (!auth.loading) _verify();
                      },
                    ),
                    if (auth.error != null) ...[
                      const SizedBox(height: 12),
                      ErrorBanner(message: auth.error!),
                    ],
                    const SizedBox(height: 18),
                    FilledButton(
                      onPressed: auth.loading ? null : _verify,
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
                              'Verify',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 16,
                              ),
                            ),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed:
                          auth.loading || _cooldown > 0 ? null : _resend,
                      child: Text(
                        _cooldown > 0
                            ? 'Resend OTP in ${_cooldown}s'
                            : 'Resend OTP',
                        style: TextStyle(
                          color: _cooldown > 0
                              ? AppColors.inkSoft
                              : AppColors.brand,
                          fontWeight: FontWeight.w800,
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
