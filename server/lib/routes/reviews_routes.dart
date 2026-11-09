import 'package:shelf/shelf.dart';
import 'package:shelf_router/shelf_router.dart';

import '../auth.dart';
import '../db.dart';
import '../helpers.dart';

Router buildReviewsRouter() {
  final router = Router();

  router.post('/', (Request req) async {
    final user = getCurrentUser(req);
    if (user == null) return errorResponse('Sign in first.', status: 401);

    final body = await readJsonBody(req);
    if (body == null) return errorResponse('Invalid request body.');
    final productId = body['productId'] as String?;
    final rating = body['rating'];
    final comment = body['comment'] as String?;
    if (productId == null || rating == null || (rating as num) < 1 || rating > 5) {
      return errorResponse('productId and a rating between 1 and 5 are required.');
    }

    String? error;
    Map<String, dynamic>? review;
    mutateDb((db) {
      final hasProduct = listOf(db, 'products').any((p) => p['id'] == productId);
      if (!hasProduct) {
        error = 'Product not found.';
        return;
      }
      final reviews = listOf(db, 'reviews');
      Map<String, dynamic>? existing;
      for (final r in reviews) {
        if (r['productId'] == productId && r['userId'] == user['id']) {
          existing = r;
          break;
        }
      }
      if (existing != null) {
        existing['rating'] = rating;
        existing['comment'] = comment?.trim() ?? '';
        existing['createdAt'] = nowIso();
        review = existing;
        return;
      }
      final r = {
        'id': newId('rev'),
        'userId': user['id'],
        'userName': user['name'],
        'productId': productId,
        'rating': rating,
        'comment': comment?.trim() ?? '',
        'createdAt': nowIso(),
      };
      reviews.add(r);
      review = r;
    });

    if (error != null) return errorResponse(error!, status: 404);
    return jsonResponse({'review': review}, status: 201);
  });

  return router;
}
