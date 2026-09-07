import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../constants/app_colors.dart';

const kSupportPhoneDisplay = '0951050364';
const kSupportPhoneTel = '0951050364';

class AuthPageScaffold extends StatelessWidget {
  const AuthPageScaffold({
    super.key,
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFE8F8EF),
            Color(0xFFF7FBF8),
            Color(0xFFFFF8EC),
          ],
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            top: -80,
            right: -60,
            child: _Blob(
              size: 220,
              color: AppColors.brand.withValues(alpha: 0.18),
            ),
          ),
          Positioned(
            bottom: -40,
            left: -50,
            child: _Blob(
              size: 180,
              color: AppColors.saffron.withValues(alpha: 0.16),
            ),
          ),
          Positioned(
            top: 160,
            left: -30,
            child: _Blob(
              size: 90,
              color: AppColors.brand.withValues(alpha: 0.1),
            ),
          ),
          Scaffold(
            backgroundColor: Colors.transparent,
            body: SafeArea(child: child),
          ),
        ],
      ),
    );
  }
}

class AuthLogoHeader extends StatelessWidget {
  const AuthLogoHeader({
    super.key,
    required this.title,
    required this.subtitle,
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 108,
          height: 108,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(28),
            boxShadow: [
              BoxShadow(
                color: AppColors.brand.withValues(alpha: 0.22),
                blurRadius: 28,
                offset: const Offset(0, 12),
              ),
            ],
            border: Border.all(
              color: AppColors.brand.withValues(alpha: 0.15),
            ),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Image.asset(
              'assets/images/app_logo.png',
              fit: BoxFit.cover,
              errorBuilder: (_, error, stackTrace) => Image.asset(
                'assets/images/app_logo_fg.png',
                fit: BoxFit.contain,
                errorBuilder: (_, error, stackTrace) => const Icon(
                  Icons.inventory_2_rounded,
                  size: 56,
                  color: AppColors.brand,
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 18),
        Text(
          title,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w900,
                color: AppColors.ink,
                letterSpacing: -0.4,
              ),
        ),
        const SizedBox(height: 6),
        Text(
          subtitle,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: AppColors.inkSoft,
            fontSize: 14,
            height: 1.35,
          ),
        ),
      ],
    );
  }
}

class AuthFormCard extends StatelessWidget {
  const AuthFormCard({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(18, 20, 18, 18),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.brand.withValues(alpha: 0.12)),
        boxShadow: [
          BoxShadow(
            color: AppColors.ink.withValues(alpha: 0.06),
            blurRadius: 24,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: child,
    );
  }
}

class AuthHelpFooter extends StatelessWidget {
  const AuthHelpFooter({super.key});

  Future<void> _callSupport() async {
    final uri = Uri(scheme: 'tel', path: kSupportPhoneTel);
    try {
      final launched = await launchUrl(uri);
      if (!launched) {
        // Dialer unavailable — ignore.
      }
    } catch (_) {
      // No dialer on emulator / desktop — ignore.
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.brand.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.brand.withValues(alpha: 0.18)),
      ),
      child: InkWell(
        onTap: _callSupport,
        borderRadius: BorderRadius.circular(16),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.support_agent_rounded, color: AppColors.brand),
            SizedBox(width: 10),
            Flexible(
              child: Text.rich(
                TextSpan(
                  style: TextStyle(color: AppColors.inkSoft, fontSize: 13),
                  children: [
                    TextSpan(text: 'For any help call '),
                    TextSpan(
                      text: kSupportPhoneDisplay,
                      style: TextStyle(
                        color: AppColors.brand,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class AuthModeSwitcher extends StatelessWidget {
  const AuthModeSwitcher({
    super.key,
    required this.isLogin,
    required this.onLogin,
    required this.onRegister,
  });

  final bool isLogin;
  final VoidCallback onLogin;
  final VoidCallback onRegister;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.brand.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Expanded(
            child: _TabButton(
              label: 'Sign in',
              selected: isLogin,
              onTap: onLogin,
            ),
          ),
          Expanded(
            child: _TabButton(
              label: 'Register',
              selected: !isLogin,
              onTap: onRegister,
            ),
          ),
        ],
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  const _TabButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.brand : Colors.transparent,
      borderRadius: BorderRadius.circular(11),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(11),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              color: selected ? Colors.white : AppColors.inkSoft,
            ),
          ),
        ),
      ),
    );
  }
}

class _Blob extends StatelessWidget {
  const _Blob({required this.size, required this.color});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color,
      ),
    );
  }
}
