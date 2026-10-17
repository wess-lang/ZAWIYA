import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../models/models.dart';
import '../services/services.dart';

enum AuthStatus { unknown, signedOut, signedIn }

/// Session state for the app. On cold start, [bootstrap] asks the
/// server "who am I?" via GET /api/me — the session cookie set by
/// /api/auth/login is persisted on disk by [ApiClient], so a user who
/// signed in previously stays signed in across app restarts, same as
/// the web app's httpOnly cookie session.
class AuthProvider extends ChangeNotifier {
  AuthProvider(this.api) : authService = AuthService(api);

  final ApiClient api;
  final AuthService authService;

  AuthStatus status = AuthStatus.unknown;
  ZUser? user;
  String? lastError;

  Future<void> bootstrap() async {
    try {
      user = await authService.me();
      status = AuthStatus.signedIn;
    } catch (_) {
      user = null;
      status = AuthStatus.signedOut;
    }
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    lastError = null;
    try {
      await authService.login(email, password);
      user = await authService.me();
      status = AuthStatus.signedIn;
      notifyListeners();
      return true;
    } catch (e) {
      lastError = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({required String name, required String email, required String password, String role = 'customer'}) async {
    lastError = null;
    try {
      await authService.register(name: name, email: email, password: password, role: role);
      user = await authService.me();
      status = AuthStatus.signedIn;
      notifyListeners();
      return true;
    } catch (e) {
      lastError = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await authService.logout();
    } catch (_) {
      // Already signed out server-side or unreachable; clear locally regardless.
    }
    await api.clearSession();
    user = null;
    status = AuthStatus.signedOut;
    notifyListeners();
  }

  Future<void> refresh() async {
    try {
      user = await authService.me();
      status = AuthStatus.signedIn;
    } catch (_) {
      user = null;
      status = AuthStatus.signedOut;
    }
    notifyListeners();
  }
}
