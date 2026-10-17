import 'package:flutter/material.dart';

/// Mirrors the web app's palette (src/app/globals.css): warm stone
/// neutrals, a sage-green accent, amber for ratings.
class ZColors {
  ZColors._();

  static const background = Color(0xFFFAF7F1);
  static const foreground = Color(0xFF21201B);

  static const sage50 = Color(0xFFF1F3EC);
  static const sage100 = Color(0xFFE1E6D4);
  static const sage200 = Color(0xFFC6CFAB);
  static const sage400 = Color(0xFF8A9A6B);
  static const sage600 = Color(0xFF6B7A4F);
  static const sage700 = Color(0xFF566340);
  static const sage800 = Color(0xFF434D32);

  static const stone100 = Color(0xFFF5F5F4);
  static const stone200 = Color(0xFFE7E5E4);
  static const stone300 = Color(0xFFD6D3D1);
  static const stone500 = Color(0xFF78716C);
  static const stone600 = Color(0xFF57534E);
  static const stone900 = Color(0xFF1C1917);

  static const amber = Color(0xFFF59E0B);
  static const red = Color(0xFFDC2626);
  static const blue = Color(0xFF2563EB);
  static const purple = Color(0xFF9333EA);
}

ThemeData buildZawiyaTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: ZColors.sage600,
      primary: ZColors.sage600,
      surface: ZColors.background,
    ),
    scaffoldBackgroundColor: ZColors.background,
    fontFamily: 'Roboto',
  );
  return base.copyWith(
    appBarTheme: const AppBarTheme(
      backgroundColor: ZColors.background,
      foregroundColor: ZColors.stone900,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: ZColors.stone900,
        fontSize: 18,
        fontWeight: FontWeight.w600,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: ZColors.sage600,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: ZColors.stone300),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: ZColors.stone300),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: ZColors.sage600, width: 1.5),
      ),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: ZColors.stone200),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: Colors.white,
      selectedItemColor: ZColors.sage700,
      unselectedItemColor: ZColors.stone500,
      type: BottomNavigationBarType.fixed,
    ),
  );
}

String formatJD(num amount) => 'JD ${amount.toStringAsFixed(2)}';
