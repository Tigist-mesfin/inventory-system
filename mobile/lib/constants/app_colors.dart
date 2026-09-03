import 'package:flutter/material.dart';

/// App palette — brand green `0xFF2BB767` is the main color.
class AppColors {
  /// Main brand color (buttons, headers, accents).
  static const brand = Color(0xFF2BB767);
  static const primary = brand;
  static const primaryDark = Color(0xFF1F9A54);
  static const primaryLight = Color(0xFF4BC882);

  static const ink = Color(0xFF13211F);
  static const inkSoft = Color(0xFF3D524E);
  static const paper = Color(0xFFF6F1E6);
  static const paper2 = Color(0xFFFFFDF8);
  static const teal = brand;
  static const tealMid = Color(0xFF239A58);
  static const saffron = Color(0xFFE2A12B);
  static const saffronDeep = Color(0xFFC48416);
  static const sage = Color(0xFF6F8F7D);
  static const coral = Color(0xFFC44B32);
  static const card = paper2;
  static const textPrimary = ink;
  static const textSecondary = inkSoft;
  static const error = coral;
  static const warning = saffron;
  static const offline = Color(0xFFEF6C00);
  static const syncing = tealMid;
  static const line = Color(0x1A13211F);
  static const tableHeader = brand;
  static const onBrand = Colors.white;

  static BoxDecoration pageBackground = BoxDecoration(
    gradient: RadialGradient(
      center: const Alignment(-0.8, -1),
      radius: 1.2,
      colors: [
        brand.withValues(alpha: 0.12),
        Colors.transparent,
      ],
      stops: const [0, 0.45],
    ),
  );
}
