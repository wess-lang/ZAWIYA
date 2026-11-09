import 'package:shelf/shelf.dart';
import 'package:shelf_router/shelf_router.dart';

import '../auth.dart';
import '../db.dart';
import '../helpers.dart';

Router buildAddressesRouter() {
  final router = Router();

  router.get('/', (Request req) async {
    final user = getCurrentUser(req);
    if (user == null) return errorResponse('Sign in first.', status: 401);
    final db = readDb();
    final addresses = listOf(db, 'addresses').where((a) => a['userId'] == user['id']).toList();
    return jsonResponse({'addresses': addresses});
  });

  router.post('/', (Request req) async {
    final user = getCurrentUser(req);
    if (user == null) return errorResponse('Sign in first.', status: 401);
    final body = await readJsonBody(req);
    if (body == null) return errorResponse('Invalid request body.');
    final label = (body['label'] as String?)?.trim();
    final city = (body['city'] as String?)?.trim();
    final details = (body['details'] as String?)?.trim();
    if (label == null || label.isEmpty || city == null || city.isEmpty || details == null || details.isEmpty) {
      return errorResponse('Label, city, and details are required.');
    }
    final address = mutateDb((db) {
      final a = {'id': newId('addr'), 'userId': user['id'], 'label': label, 'city': city, 'details': details};
      listOf(db, 'addresses').add(a);
      return a;
    });
    return jsonResponse({'address': address});
  });

  return router;
}
