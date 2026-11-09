import 'dart:convert';
import 'package:bcrypt/bcrypt.dart';
import 'package:crypto/crypto.dart';
import 'package:shelf/shelf.dart';

import 'env.dart';
import 'db.dart';

const _cookieName = 'zawiya_session';
const _sessionTtlSeconds = 60 * 60 * 24 * 14; // 14 days

List<int> get _secretBytes {
  final secret =
      env['JWT_SECRET'] ?? 'dev-only-insecure-secret-change-me-in-production';
  return utf8.encode(secret);
}

String _b64urlEncode(List<int> bytes) {
  return base64Url.encode(bytes).replaceAll('=', '');
}

List<int> _b64urlDecode(String input) {
  var s = input.replaceAll('-', '+').replaceAll('_', '/');
  switch (s.length % 4) {
    case 2:
      s += '==';
      break;
    case 3:
      s += '=';
      break;
  }
  return base64.decode(s);
}

String hashPassword(String password) => BCrypt.hashpw(password, BCrypt.gensalt());

bool verifyPassword(String password, String hash) {
  try {
    return BCrypt.checkpw(password, hash);
  } catch (_) {
    return false;
  }
}

/// Signs a minimal HS256 JWT carrying { sub: userId, iat, exp } — same
/// shape jose produced on the Next.js side, just signed independently
/// (this server fully replaces that one, so cross-compatibility with
/// old sessions isn't required).
String signSessionToken(String userId) {
  final header = {'alg': 'HS256', 'typ': 'JWT'};
  final now = DateTime.now().toUtc().millisecondsSinceEpoch ~/ 1000;
  final payload = {'sub': userId, 'iat': now, 'exp': now + _sessionTtlSeconds};

  final headerSeg = _b64urlEncode(utf8.encode(jsonEncode(header)));
  final payloadSeg = _b64urlEncode(utf8.encode(jsonEncode(payload)));
  final signingInput = '$headerSeg.$payloadSeg';
  final sig = Hmac(sha256, _secretBytes).convert(utf8.encode(signingInput));
  final sigSeg = _b64urlEncode(sig.bytes);
  return '$signingInput.$sigSeg';
}

/// Verifies signature + expiry, returns the userId (`sub`) or null.
String? verifySessionToken(String token) {
  final parts = token.split('.');
  if (parts.length != 3) return null;
  final signingInput = '${parts[0]}.${parts[1]}';
  final expectedSig = Hmac(sha256, _secretBytes).convert(utf8.encode(signingInput)).bytes;
  List<int> actualSig;
  try {
    actualSig = _b64urlDecode(parts[2]);
  } catch (_) {
    return null;
  }
  if (actualSig.length != expectedSig.length) return null;
  var diff = 0;
  for (var i = 0; i < actualSig.length; i++) {
    diff |= actualSig[i] ^ expectedSig[i];
  }
  if (diff != 0) return null; // constant-time-ish compare

  Map<String, dynamic> payload;
  try {
    payload = jsonDecode(utf8.decode(_b64urlDecode(parts[1]))) as Map<String, dynamic>;
  } catch (_) {
    return null;
  }
  final exp = payload['exp'];
  final now = DateTime.now().toUtc().millisecondsSinceEpoch ~/ 1000;
  if (exp is int && now >= exp) return null;
  final sub = payload['sub'];
  return sub is String ? sub : null;
}

String buildSetCookieHeader(String token) {
  return '$_cookieName=$token; HttpOnly; Path=/; Max-Age=$_sessionTtlSeconds; SameSite=Lax';
}

String buildClearCookieHeader() {
  return '$_cookieName=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax';
}

String? _readCookieToken(Request req) {
  final cookieHeader = req.headers['cookie'];
  if (cookieHeader == null) return null;
  for (final part in cookieHeader.split(';')) {
    final trimmed = part.trim();
    if (trimmed.startsWith('$_cookieName=')) {
      return trimmed.substring(_cookieName.length + 1);
    }
  }
  return null;
}

/// Returns the signed-in user (without passwordHash), or null — mirrors
/// auth.ts's getCurrentUser().
Map<String, dynamic>? getCurrentUser(Request req) {
  final token = _readCookieToken(req);
  if (token == null) return null;
  final userId = verifySessionToken(token);
  if (userId == null) return null;
  final db = readDb();
  final users = listOf(db, 'users');
  Map<String, dynamic>? user;
  for (final u in users) {
    if (u['id'] == userId) {
      user = u;
      break;
    }
  }
  if (user == null) return null;
  final safe = Map<String, dynamic>.from(user);
  safe.remove('passwordHash');
  return safe;
}
