import 'package:shelf/shelf.dart';
import 'package:shelf_router/shelf_router.dart';

import '../auth.dart';
import '../db.dart';
import '../helpers.dart';

Router buildProductsRouter() {
  final router = Router();

  // GET /api/products?q=&category=&shopId=&maxPrice=&shopOwnerId=
  router.get('/', (Request req) async {
    final params = req.url.queryParameters;
    final q = params['q']?.trim().toLowerCase();
    final category = params['category'];
    final shopId = params['shopId'];
    final maxPrice = params['maxPrice'];
    final shopOwnerId = params['shopOwnerId'];

    final db = readDb();
    final activeShopIds = listOf(db, 'shops')
        .where((s) => s['status'] == 'active')
        .map((s) => s['id'] as String)
        .toSet();

    var products = listOf(db, 'products').where((p) {
      if (shopOwnerId != null) return true;
      return activeShopIds.contains(p['shopId']);
    }).toList();

    if (shopOwnerId != null) {
      final ownShopIds = listOf(db, 'shops')
          .where((s) => s['ownerId'] == shopOwnerId)
          .map((s) => s['id'] as String)
          .toSet();
      products = products.where((p) => ownShopIds.contains(p['shopId'])).toList();
    }

    if (q != null && q.isNotEmpty) {
      products = products.where((p) {
        final name = (p['name'] as String? ?? '').toLowerCase();
        final desc = (p['description'] as String? ?? '').toLowerCase();
        final styleTags = (p['styleTags'] as List?)?.cast<String>() ?? [];
        final colorTags = (p['colorTags'] as List?)?.cast<String>() ?? [];
        return name.contains(q) ||
            desc.contains(q) ||
            styleTags.any((t) => t.toLowerCase().contains(q)) ||
            colorTags.any((t) => t.toLowerCase().contains(q));
      }).toList();
    }
    if (category != null) {
      products = products.where((p) => p['category'] == category).toList();
    }
    if (shopId != null) {
      products = products.where((p) => p['shopId'] == shopId).toList();
    }
    if (maxPrice != null) {
      final max = double.tryParse(maxPrice);
      if (max != null) {
        products = products.where((p) => (p['price'] as num) <= max).toList();
      }
    }

    return jsonResponse({'products': products});
  });

  // POST /api/products — FR-13 create
  router.post('/', (Request req) async {
    final user = getCurrentUser(req);
    if (user == null || !(user['role'] == 'shop_owner' || user['role'] == 'admin')) {
      return errorResponse('Shop owner access required.', status: 403);
    }

    final body = await readJsonBody(req);
    if (body == null) return errorResponse('Invalid request body.');

    final shopId = body['shopId'] as String?;
    final name = body['name'] as String?;
    final category = body['category'] as String?;
    final price = body['price'];
    if (shopId == null || name == null || category == null || price == null) {
      return errorResponse('shopId, name, category, and price are required.');
    }
    final priceNum = (price as num).toDouble();
    final stockNum = ((body['stock'] as num?) ?? 0).toInt();
    if (priceNum < 0 || stockNum < 0) {
      return errorResponse('Price and stock must be non-negative.');
    }

    String? error;
    Map<String, dynamic>? created;
    mutateDb((db) {
      final shops = listOf(db, 'shops');
      Map<String, dynamic>? shop;
      for (final s in shops) {
        if (s['id'] == shopId) {
          shop = s;
          break;
        }
      }
      if (shop == null) {
        error = 'Shop not found.';
        return;
      }
      if (shop!['ownerId'] != user['id'] && user['role'] != 'admin') {
        error = 'You do not own this shop.';
        return;
      }
      final id = newId('prod');
      final product = {
        'id': id,
        'shopId': shopId,
        'name': name.trim(),
        'category': category,
        'price': priceNum,
        'stock': stockNum,
        'styleTags': ((body['styleTags'] as List?) ?? []).whereType<String>().toList(),
        'colorTags': ((body['colorTags'] as List?) ?? []).whereType<String>().toList(),
        'roomTags': ((body['roomTags'] as List?) ?? []).whereType<String>().toList(),
        'dimensions': (body['dimensions'] as String?)?.trim(),
        'description': (body['description'] as String?)?.trim() ?? '',
        'image': (body['image'] as String?)?.trim().isNotEmpty == true
            ? (body['image'] as String).trim()
            : '/products/$id.svg',
      };
      listOf(db, 'products').add(product);
      created = product;
    });

    if (error != null) {
      return errorResponse(error!, status: error!.contains('own') ? 403 : 404);
    }
    return jsonResponse({'product': created});
  });

  // GET /api/products/<id>
  router.get('/<id>', (Request req, String id) async {
    final db = readDb();
    Map<String, dynamic>? product;
    for (final p in listOf(db, 'products')) {
      if (p['id'] == id) {
        product = p;
        break;
      }
    }
    if (product == null) return errorResponse('Not found.', status: 404);
    Map<String, dynamic>? shop;
    for (final s in listOf(db, 'shops')) {
      if (s['id'] == product['shopId']) {
        shop = s;
        break;
      }
    }
    final reviews = listOf(db, 'reviews').where((r) => r['productId'] == id).toList();
    return jsonResponse({'product': product, 'shop': shop, 'reviews': reviews});
  });

  // PUT /api/products/<id> — FR-13 edit
  router.put('/<id>', (Request req, String id) async {
    final user = getCurrentUser(req);
    if (user == null) return errorResponse('Sign in first.', status: 401);

    final body = await readJsonBody(req);
    if (body == null) return errorResponse('Invalid request body.');

    String? error;
    Map<String, dynamic>? updated;
    mutateDb((db) {
      Map<String, dynamic>? product;
      for (final p in listOf(db, 'products')) {
        if (p['id'] == id) {
          product = p;
          break;
        }
      }
      if (product == null) {
        error = 'Not found.';
        return;
      }
      Map<String, dynamic>? shop;
      for (final s in listOf(db, 'shops')) {
        if (s['id'] == product!['shopId']) {
          shop = s;
          break;
        }
      }
      if (shop == null || (shop['ownerId'] != user['id'] && user['role'] != 'admin')) {
        error = 'You do not own this product.';
        return;
      }
      if (body.containsKey('name')) product!['name'] = (body['name'] as String).trim();
      if (body.containsKey('category')) product!['category'] = body['category'];
      if (body.containsKey('price')) {
        product!['price'] = ((body['price'] as num).toDouble()).clamp(0, double.infinity);
      }
      if (body.containsKey('stock')) {
        product!['stock'] = ((body['stock'] as num).toInt()).clamp(0, 1 << 30);
      }
      if (body.containsKey('styleTags')) {
        product!['styleTags'] = ((body['styleTags'] as List?) ?? []).whereType<String>().where((s) => s.isNotEmpty).toList();
      }
      if (body.containsKey('colorTags')) {
        product!['colorTags'] = ((body['colorTags'] as List?) ?? []).whereType<String>().where((s) => s.isNotEmpty).toList();
      }
      if (body.containsKey('roomTags')) {
        product!['roomTags'] = ((body['roomTags'] as List?) ?? []).whereType<String>().where((s) => s.isNotEmpty).toList();
      }
      if (body.containsKey('dimensions')) product!['dimensions'] = (body['dimensions'] as String).trim();
      if (body.containsKey('description')) product!['description'] = (body['description'] as String).trim();
      if (body.containsKey('image') && (body['image'] as String).trim().isNotEmpty) {
        product!['image'] = (body['image'] as String).trim();
      }
      updated = product;
    });

    if (error != null) {
      return errorResponse(error!, status: error!.contains('own') ? 403 : 404);
    }
    return jsonResponse({'product': updated});
  });

  // DELETE /api/products/<id>
  router.delete('/<id>', (Request req, String id) async {
    final user = getCurrentUser(req);
    if (user == null) return errorResponse('Sign in first.', status: 401);

    String? error;
    mutateDb((db) {
      final products = listOf(db, 'products');
      Map<String, dynamic>? product;
      for (final p in products) {
        if (p['id'] == id) {
          product = p;
          break;
        }
      }
      if (product == null) {
        error = 'Not found.';
        return;
      }
      Map<String, dynamic>? shop;
      for (final s in listOf(db, 'shops')) {
        if (s['id'] == product!['shopId']) {
          shop = s;
          break;
        }
      }
      if (shop == null || (shop['ownerId'] != user['id'] && user['role'] != 'admin')) {
        error = 'You do not own this product.';
        return;
      }
      products.removeWhere((p) => p['id'] == id);
    });

    if (error != null) {
      return errorResponse(error!, status: error!.contains('own') ? 403 : 404);
    }
    return jsonResponse({'ok': true});
  });

  return router;
}
