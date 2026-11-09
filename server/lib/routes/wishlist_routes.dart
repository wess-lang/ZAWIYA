import 'package:shelf/shelf.dart';
import 'package:shelf_router/shelf_router.dart';

import '../auth.dart';
import '../db.dart';
import '../helpers.dart';

Router buildWishlistRouter() {
  final router = Router();

  router.get('/', (Request req) async {
    final user = getCurrentUser(req);
    if (user == null) return errorResponse('Sign in first.', status: 401);
    final db = readDb();
    final productIds = listOf(db, 'wishlist')
        .where((w) => w['userId'] == user['id'])
        .map((w) => w['productId'] as String)
        .toSet();
    final products = listOf(db, 'products').where((p) => productIds.contains(p['id'])).toList();
    return jsonResponse({'products': products});
  });

  router.post('/', (Request req) async {
    final user = getCurrentUser(req);
    if (user == null) return errorResponse('Sign in first.', status: 401);
    final body = await readJsonBody(req);
    if (body == null) return errorResponse('Invalid request body.');
    final productId = body['productId'] as String?;
    if (productId == null) return errorResponse('productId is required.');

    mutateDb((db) {
      final wishlist = listOf(db, 'wishlist');
      final already = wishlist.any((w) => w['userId'] == user['id'] && w['productId'] == productId);
      if (!already) {
        wishlist.add({'userId': user['id'], 'productId': productId, 'createdAt': nowIso()});
      }
    });
    return jsonResponse({'ok': true});
  });

  router.delete('/', (Request req) async {
    final user = getCurrentUser(req);
    if (user == null) return errorResponse('Sign in first.', status: 401);
    final productId = req.url.queryParameters['productId'];
    if (productId == null) return errorResponse('productId query param is required.');

    mutateDb((db) {
      final wishlist = listOf(db, 'wishlist');
      wishlist.removeWhere((w) => w['userId'] == user['id'] && w['productId'] == productId);
    });
    return jsonResponse({'ok': true});
  });

  return router;
}
