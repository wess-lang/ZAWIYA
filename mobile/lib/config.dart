import 'dart:io';
import 'package:shared_preferences/shared_preferences.dart';

/// Points the app at the ZAWIYA Next.js server. The web app and the API
/// live on the same origin, so this one value is both the API base
/// (`$origin/api/...`) and the static-asset base (`$origin/products/...`
/// for the generated product illustrations).
///
/// There's no single correct default for "the dev machine running
/// `npm run dev`" from a mobile device/emulator, so this is editable at
/// runtime from the Account tab (see ServerSettingsScreen) and persisted
/// in SharedPreferences.
class AppConfig {
  AppConfig._();

  static const _prefsKey = 'zawiya.server_origin';

  /// Compile-time override, e.g.
  /// `flutter run --dart-define=ZAWIYA_SERVER=http://localhost:3005`
  /// (handy in dev, or in CI). Takes priority over the platform guess,
  /// but a value the user saved from the Account > Server screen still
  /// wins over both.
  static const _envOverride = String.fromEnvironment('ZAWIYA_SERVER');

  /// Best-effort default. `npm run dev`/`start` pin the server to port
  /// 3005 (see package.json) specifically so this default stays valid
  /// instead of racing Next's "pick whatever port is free" behavior:
  /// - Android emulator maps the host loopback to 10.0.2.2.
  /// - iOS simulator and macOS/desktop can reach the host via localhost.
  /// - A real device needs the dev machine's LAN IP, set from the
  ///   Account tab's "Server" field — localhost on a phone means the
  ///   phone itself, not your computer.
  static String get platformDefault {
    if (_envOverride.isNotEmpty) return _envOverride;
    if (Platform.isAndroid) return 'http://10.0.2.2:3005';
    return 'http://localhost:3005';
  }

  static String _origin = platformDefault;

  static String get origin => _origin;

  static String get apiBase => '$_origin/api';

  /// Resolves a relative asset path (e.g. "/products/prod_x.svg", as
  /// returned by the catalogue API) to a fully-qualified URL.
  static String asset(String path) {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return '$_origin$path';
  }

  static Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _origin = prefs.getString(_prefsKey) ?? platformDefault;
  }

  static Future<void> setOrigin(String value) async {
    var v = value.trim();
    if (v.endsWith('/')) v = v.substring(0, v.length - 1);
    _origin = v;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, v);
  }
}
