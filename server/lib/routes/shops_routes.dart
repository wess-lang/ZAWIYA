import 'dart:math';
import 'package:shelf/shelf.dart';
import 'package:shelf_router/shelf_router.dart';

import '../auth.dart';
import '../db.dart';
import '../helpers.dart';

final _palette = [
  '#6B7A4F',
  '#3E6F6B',
  '#A6763E',
  '#B8860B',
  '#6B3F2A',
  '#4C7A3D',
  '#7A4F6B',
];

Router buildShopsRouter() {
  final router = Router();

  router.get('/', (Request req) async {
    final db = readDb();
    final shops = listOf(db, 'shops').where((s) => s['status'] == 'active').toList();
    return jsonResponse({'shops': shops});
  });

  router.post('/', (Request req) async {
    final user = getCurrentUser(req);
    if (user == null) return errorResponse('Sign in first.', status: 401);

    final body = await readJsonBody(req);
    if (body == null) return errorResponse('Invalid request body.');
    final name = (body['name'] as String?)?.trim();
    final tagline = (body['tagline'] as String?)?.trim() ?? '';
    final city = (body['city'] as String?)?.trim();
    if (name == null || name.isEmpty || city == null || city.isEmpty) {
      return errorResponse('Shop name and city are required.');
    }

    final shop = mutateDb((db) {
      for (final u in listOf(db, 'users')) {
        if (u['id'] == user['id'] && u['role'] == 'customer') {
          u['role'] = 'shop_owner';
          break;
        }
      }
      final s = {
        'id': newId('shop'),
        'ownerId': user['id'],
        'name': name,
        'tagline': tagline,
        'city': city,
        'accent': _palette[Random().nextInt(_palette.length)],
        'styleTags': ((body['styleTags'] as List?) ?? []).whereType<String>().toList(),
        'status': 'pending',
        'createdAt': nowIso(),
      };
      listOf(db, 'shops').add(s);
      return s;
    });

    return jsonResponse({'shop': shop});
  });

  // GET /api/shops/mine
  router.get('/mine', (Request req) async {
    final user = getCurrentUser(req);
    if (user == null) return errorResponse('Sign in first.', status: 401);

    final db = readDb();
    final shops = listOf(db, 'shops').where((s) => s['ownerId'] == user['id']).map((shop) {
      final productCount = listOf(db, 'products').where((p) => p['shopId'] == shop['id']).length;
      final pendingOrders = listOf(db, 'orders')
          .expand((o) => (o['subOrders'] as List).cast<Map<String, dynamic>>())
          .where((s) => s['shopId'] == shop['id'] && s['status'] == 'placed')
          .length;
      return {...shop, 'productCount': productCount, 'pendingOrders': pendingOrders};
    }).toList();

    return jsonResponse({'shops': shops});
  });

  // GET /api/shops/<id>/orders
  router.get('/<id>/orders', (Request req, String id) async {
    final user = getCurrentUser(req);
    if (user == null) return errorResponse('Sign in first.', status: 401);

    final db = readDb();
    Map<String, dynamic>? shop;
    for (final s in listOf(db, 'shops')) {
      if (s['id'] == id) {
        shop = s;
        break;
      }
    }
    if (shop == null) return errorResponse('Shop not found.', status: 404);
    if (shop['ownerId'] != user['id'] && user['role'] != 'admin') {
      return errorResponse('You do not manage this shop.', status: 403);
    }

    final usersById = {for (final u in listOf(db, 'users')) u['id'] as String: u};
    final rows = <Map<String, dynamic>>[];
    for (final order in listOf(db, 'orders')) {
      for (final subOrder in (order['subOrders'] as List).cast<Map<String, dynamic>>()) {
        if (subOrder['shopId'] != id) continue;
        rows.add({
          'orderId': order['id'],
          'subOrder': subOrder,
          'customerName': usersById[order['userId']]?['name'] ?? 'Customer',
          'addressSnapshot': order['addressSnapshot'],
          'createdAt': order['createdAt'],
        });
      }
    }
    rows.sort((a, b) => (b['createdAt'] as String).compareTo(a['createdAt'] as String));

    return jsonResponse({'rows': rows});
  });

  // POST /api/shops/<id>/approval — FR-15
  router.post('/<id>/approval', (Request req, String id) async {
    final user = getCurrentUser(req);
    if (user == null || user['role'] != 'admin') {
      return errorResponse('Admin access required.', status: 403);
    }
    final body = await readJsonBody(req);
    if (body == null) return errorResponse('Invalid request body.');
    final action = body['action'];
    if (action != 'approve' && action != 'reject') {
      return errorResponse("action must be 'approve' or 'reject'.");
    }

    String? error;
    Map<String, dynamic>? updated;
    mutateDb((db) {
      Map<String, dynamic>? shop;
      for (final s in listOf(db, 'shops')) {
        if (s['id'] == id) {
          shop = s;
          break;
        }
      }
      if (shop == null) {
        error = 'Shop not found.';
        return;
      }
      shop['status'] = action == 'approve' ? 'active' : 'rejected';
      if (action == 'reject') shop['rejectionReason'] = body['reason'] ?? 'Not specified.';
      updated = shop;
    });

    if (error != null) return errorResponse(error!, status: 404);
    return jsonResponse({'shop': updated});
  });

  return router;
}

Router buildAdminShopsRouter() {
  final router = Router();
  router.get('/', (Request req) async {
    final user = getCurrentUser(req);
    if (user == null || user['role'] != 'admin') {
      return errorResponse('Admin access required.', status: 403);
    }
    final db = readDb();
    final usersById = {for (final u in listOf(db, 'users')) u['id'] as String: u};
    final shops = listOf(db, 'shops').toList()
      ..sort((a, b) => (b['createdAt'] as String).compareTo(a['createdAt'] as String));
    final withOwner = shops
        .map((s) => {...s, 'ownerName': usersById[s['ownerId']]?['name'] ?? 'Unknown'})
        .toList();
    return jsonResponse({'shops': withOwner});
  });
  return router;
}
