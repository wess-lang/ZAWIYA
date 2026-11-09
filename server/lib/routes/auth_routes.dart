import 'package:shelf/shelf.dart';
import 'package:shelf_router/shelf_router.dart';

import '../auth.dart';
import '../db.dart';
import '../helpers.dart';

Router buildAuthRouter() {
  final router = Router();

  router.post('/login', (Request req) async {
    final body = await readJsonBody(req);
    if (body == null) return errorResponse('Invalid request body.');
    final email = (body['email'] as String?)?.trim().toLowerCase();
    final password = body['password'] as String?;
    if (email == null || email.isEmpty || password == null || password.isEmpty) {
      return errorResponse('Email and password are required.');
    }

    final db = readDb();
    Map<String, dynamic>? user;
    for (final u in listOf(db, 'users')) {
      if (u['email'] == email) {
        user = u;
        break;
      }
    }
    if (user == null || !verifyPassword(password, user['passwordHash'] as String)) {
      return errorResponse('Incorrect email or password.', status: 401);
    }

    final token = signSessionToken(user['id'] as String);
    return jsonResponse(
      {'ok': true, 'role': user['role']},
      headers: {'set-cookie': buildSetCookieHeader(token)},
    );
  });

  router.post('/register', (Request req) async {
    final body = await readJsonBody(req);
    if (body == null) return errorResponse('Invalid request body.');

    final name = (body['name'] as String?)?.trim();
    final email = (body['email'] as String?)?.trim().toLowerCase();
    final password = body['password'] as String?;
    final roleIn = body['role'] as String?;
    final role = roleIn == 'shop_owner' ? 'shop_owner' : 'customer';

    if (name == null || name.isEmpty || email == null || email.isEmpty || password == null || password.isEmpty) {
      return errorResponse('Name, email, and password are required.');
    }
    if (password.length < 6) {
      return errorResponse('Password must be at least 6 characters.');
    }
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email)) {
      return errorResponse('Enter a valid email address.');
    }

    String? userId;
    String? error;
    mutateDb((db) {
      final users = listOf(db, 'users');
      final exists = users.any((u) => u['email'] == email);
      if (exists) {
        error = 'An account with this email already exists.';
        return;
      }
      final id = newId('usr');
      users.add({
        'id': id,
        'name': name,
        'email': email,
        'passwordHash': hashPassword(password),
        'role': role,
        'createdAt': nowIso(),
      });
      userId = id;
    });

    if (error != null) return errorResponse(error!, status: 409);

    final token = signSessionToken(userId!);
    return jsonResponse({'ok': true}, headers: {'set-cookie': buildSetCookieHeader(token)});
  });

  router.post('/logout', (Request req) async {
    return jsonResponse({'ok': true}, headers: {'set-cookie': buildClearCookieHeader()});
  });

  return router;
}

Router buildMeRouter() {
  final router = Router();
  router.get('/', (Request req) async {
    final user = getCurrentUser(req);
    if (user == null) return errorResponse('Not signed in.', status: 401);
    return jsonResponse({'user': user});
  });
  return router;
}
