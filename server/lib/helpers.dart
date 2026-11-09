import 'dart:convert';
import 'package:shelf/shelf.dart';
import 'package:uuid/uuid.dart';

const _uuid = Uuid();

String newId([String? prefix]) {
  final id = _uuid.v4();
  return prefix != null ? '${prefix}_$id' : id;
}

Response jsonResponse(Object? body, {int status = 200, Map<String, String>? headers}) {
  return Response(
    status,
    body: jsonEncode(body),
    headers: {'content-type': 'application/json', ...?headers},
  );
}

Response errorResponse(String message, {int status = 400, String? code, bool? retryable}) {
  final body = <String, dynamic>{'error': message};
  if (code != null) body['code'] = code;
  if (retryable != null) body['retryable'] = retryable;
  return jsonResponse(body, status: status);
}

Future<Map<String, dynamic>?> readJsonBody(Request req) async {
  try {
    final text = await req.readAsString();
    if (text.isEmpty) return {};
    final decoded = jsonDecode(text);
    return decoded is Map<String, dynamic> ? decoded : null;
  } catch (_) {
    return null;
  }
}

String nowIso() => DateTime.now().toUtc().toIso8601String();
