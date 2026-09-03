import 'package:flutter/material.dart';

import '../../constants/app_colors.dart';

/// Animated loading scene matching the React `InventoryLoading` component.
class InventoryLoading extends StatefulWidget {
  const InventoryLoading({
    super.key,
    this.message = 'Loading inventory...',
    this.fullScreen = false,
  });

  final String message;
  final bool fullScreen;

  @override
  State<InventoryLoading> createState() => _InventoryLoadingState();
}

class _InventoryLoadingState extends State<InventoryLoading>
    with SingleTickerProviderStateMixin {
  late final AnimationController _spin;

  @override
  void initState() {
    super.initState();
    _spin = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    )..repeat();
  }

  @override
  void dispose() {
    _spin.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final content = SizedBox(
      width: 168,
      height: 168,
      child: Stack(
        alignment: Alignment.center,
        children: [
          RotationTransition(
            turns: _spin,
            child: SizedBox(
              width: 168,
              height: 168,
              child: CircularProgressIndicator(
                strokeWidth: 3,
                color: AppColors.brand,
                backgroundColor: AppColors.brand.withValues(alpha: 0.14),
              ),
            ),
          ),
          RotationTransition(
            turns: Tween(begin: 0.0, end: -1.0).animate(_spin),
            child: SizedBox(
              width: 140,
              height: 140,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.primaryDark,
                backgroundColor: AppColors.brand.withValues(alpha: 0.08),
              ),
            ),
          ),
          _LoadingRack(spin: _spin),
        ],
      ),
    );

    if (widget.fullScreen) {
      return Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          color: AppColors.paper2,
          gradient: RadialGradient(
            center: const Alignment(0, -0.8),
            radius: 1.1,
            colors: [
              AppColors.brand.withValues(alpha: 0.16),
              AppColors.paper2,
            ],
          ),
        ),
        child: Center(child: content),
      );
    }

    return Padding(
      padding: const EdgeInsets.all(28),
      child: Center(child: content),
    );
  }
}

class _LoadingRack extends StatelessWidget {
  const _LoadingRack({required this.spin});

  final AnimationController spin;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 108,
      height: 96,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          _post(left: 8),
          _post(right: 8),
          _shelf(top: 10),
          _shelf(top: 42),
          _shelf(top: 74),
          _animatedBox(delay: 0.0, end: const Offset(18, 56)),
          _animatedBox(delay: 0.16, end: const Offset(46, 24), dark: true),
          _animatedBox(delay: 0.24, end: const Offset(52, 56), light: true),
          _animatedBox(delay: 0.32, end: const Offset(34, -8), darkest: true),
        ],
      ),
    );
  }

  Widget _post({double? left, double? right}) {
    return Positioned(
      top: 6,
      left: left,
      right: right,
      child: Container(
        width: 6,
        height: 84,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(3),
          gradient: const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF8FB9A4), Color(0xFF5F8F78)],
          ),
        ),
      ),
    );
  }

  Widget _shelf({required double top}) {
    return Positioned(
      top: top,
      left: 8,
      right: 8,
      child: Container(
        height: 6,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(3),
          gradient: const LinearGradient(
            colors: [Color(0xFFCFE8D8), Color(0xFF7EAA92)],
          ),
          boxShadow: [
            BoxShadow(
              color: AppColors.primaryDark.withValues(alpha: 0.12),
              offset: const Offset(0, 2),
            ),
          ],
        ),
      ),
    );
  }

  Widget _animatedBox({
    required double delay,
    required Offset end,
    bool dark = false,
    bool light = false,
    bool darkest = false,
  }) {
    return AnimatedBuilder(
      animation: spin,
      builder: (context, child) {
        final t = (spin.value + delay) % 1.0;
        final phase = _boxPhase(t);
        final pos = Offset.lerp(const Offset(-54, 56), end, phase)!;
        return Positioned(left: pos.dx, top: pos.dy, child: Opacity(opacity: phase, child: child));
      },
      child: _box(dark: dark, light: light, darkest: darkest),
    );
  }

  double _boxPhase(double t) {
    if (t < 0.08) return 0;
    if (t < 0.22) return (t - 0.08) / 0.14;
    if (t < 0.78) return 1;
    if (t < 0.9) return 1 - (t - 0.78) / 0.12;
    return 0;
  }

  Widget _box({bool dark = false, bool light = false, bool darkest = false}) {
    final colors = darkest
        ? [AppColors.primaryDark, const Color(0xFF0F6B38)]
        : dark
            ? [AppColors.primaryLight, AppColors.primaryDark]
            : light
                ? [const Color(0xFF7ED9A8), AppColors.brand]
                : [const Color(0xFF4FD18A), AppColors.brand];
    return Container(
      width: 22,
      height: 18,
      decoration: BoxDecoration(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(4), bottom: Radius.circular(3)),
        gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: colors),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.18),
            blurRadius: 6,
            offset: const Offset(0, 3),
          ),
        ],
      ),
    );
  }
}

class SkeletonList extends StatelessWidget {
  const SkeletonList({super.key, this.itemCount = 6});

  final int itemCount;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      itemCount: itemCount,
      separatorBuilder: (_, index) => const SizedBox(height: 10),
      itemBuilder: (_, index) => Container(
        height: 72,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.7),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.line),
        ),
      ),
    );
  }
}
