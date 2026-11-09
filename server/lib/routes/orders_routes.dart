import 'package:shelf/shelf.dart';
import 'package:shelf_router/shelf_router.dart';

import '../auth.dart';
import '../db.dart';
import '../helpers.dart';

const _validStatuses = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

Router buildOrdersRouter() {
  final router = Router();

  // GET /api/orders — FR-11, newest first, with shopName enriched per sub-order.
  router.get('/', (Request req) async {
    final user = getCurrentUser(req);
    if (user == null) return errorResponse('Sign in first.', status: 401);

    final db = readDb();
    final shopsById = {for (final s in listOf(db, 'shops')) s['id'] as String: s};
    final orders = listOf(db, 'orders').where((o) => o['userId'] == user['id']).toList()
      ..sort((a, b) => (b['createdAt'] as String).compareTo(a['createdAt'] as String));

    final enriched = orders.map((o) {
      final subOrders = (o['subOrders'] as List).cast<Map<String, dynamic>>().map((s) {
        return {...s, 'shopName': shopsById[s['shopId']]?['name'] ?? 'Shop'};
      }).toList();
      return {...o, 'subOrders': subOrders};
    }).toList();

    return jsonResponse({'orders': enriched});
  });

  // POST /api/orders/checkout — FR-08/09/10
  router.post('/checkout', (Request req) async {
    final user = getCurrentUser(req);
    if (user == null) return errorResponse('Sign in first.', status: 401);

    final body = await readJsonBody(req);
    if (body == null) return errorResponse('Invalid request body.');
    final addressId = body['addressId'] as String?;
    final paymentMethod = body['paymentMethod'] as String?;
    final lines = (body['lines'] as List?)?.cast<Map<String, dynamic>>();
    if (addressId == null || paymentMethod == null || lines == null || lines.isEmpty) {
      return errorResponse('addressId, paymentMethod, and at least one cart line are required.');
    }
    if (!['card', 'cliq', 'cod'].contains(paymentMethod)) {
      return errorResponse('Unsupported payment method.');
    }

    String? error;
    Map<String, dynamic>? createdOrder;
    mutateDb((db) {
      Map<String, dynamic>? address;
      for (final a in listOf(db, 'addresses')) {
        if (a['id'] == addressId && a['userId'] == user['id']) {
          address = a;
          break;
        }
      }
      if (address == null) {
        error = 'Address not found.';
        return;
      }

      final products = listOf(db, 'products');
      final byShop = <String, List<Map<String, dynamic>>>{};
      for (final line in lines) {
        final qty = (line['qty'] as num?)?.toInt() ?? 0;
        if (qty <= 0) continue;
        final productId = line['productId'];
        Map<String, dynamic>? product;
        for (final p in products) {
          if (p['id'] == productId) {
            product = p;
            break;
          }
        }
        if (product == null) {
          error = 'Product $productId not found.';
          return;
        }
        if ((product['stock'] as num) < qty) {
          error = '"${product['name']}" only has ${product['stock']} in stock.';
          return;
        }
        final item = {
          'productId': product['id'],
          'productName': product['name'],
          'shopId': product['shopId'],
          'unitPrice': product['price'],
          'qty': qty,
        };
        byShop.putIfAbsent(product['shopId'] as String, () => []).add(item);
      }
      if (error != null) return;
      if (byShop.isEmpty) {
        error = 'Cart is empty.';
        return;
      }

      for (final items in byShop.values) {
        for (final item in items) {
          for (final p in products) {
            if (p['id'] == item['productId']) {
              p['stock'] = (p['stock'] as num) - (item['qty'] as num);
              break;
            }
          }
        }
      }

      final orderId = newId('ord');
      final subOrders = byShop.entries.map((entry) {
        final items = entry.value;
        final subtotal = items.fold<num>(0, (sum, i) => sum + (i['unitPrice'] as num) * (i['qty'] as num));
        return {
          'id': newId('sub'),
          'orderId': orderId,
          'shopId': entry.key,
          'status': 'placed',
          'items': items,
          'subtotal': subtotal,
        };
      }).toList();

      final order = {
        'id': orderId,
        'userId': user['id'],
        'addressId': address!['id'],
        'addressSnapshot': {'label': address!['label'], 'city': address!['city'], 'details': address!['details']},
        'paymentMethod': paymentMethod,
        'subOrders': subOrders,
        'totalAmount': subOrders.fold<num>(0, (sum, s) => sum + (s['subtotal'] as num)),
        'createdAt': nowIso(),
      };
      listOf(db, 'orders').add(order);
      createdOrder = order;
    });

    if (error != null) return errorResponse(error!, status: 400);
    return jsonResponse({'order': createdOrder}, status: 201);
  });

  // PUT /api/orders/<id>/suborders/<subId>/status — FR-14
  router.put('/<id>/suborders/<subId>/status', (Request req, String id, String subId) async {
    final user = getCurrentUser(req);
    if (user == null) return errorResponse('Sign in first.', status: 401);

    final body = await readJsonBody(req);
    if (body == null) return errorResponse('Invalid request body.');
    final status = body['status'] as String?;
    if (status == null || !_validStatuses.contains(status)) {
      return errorResponse('Invalid status.');
    }

    String? error;
    Map<String, dynamic>? updated;
    mutateDb((db) {
      Map<String, dynamic>? order;
      for (final o in listOf(db, 'orders')) {
        if (o['id'] == id) {
          order = o;
          break;
        }
      }
      if (order == null) {
        error = 'Order not found.';
        return;
      }
      Map<String, dynamic>? subOrder;
      for (final s in (order['subOrders'] as List).cast<Map<String, dynamic>>()) {
        if (s['id'] == subId) {
          subOrder = s;
          break;
        }
      }
      if (subOrder == null) {
        error = 'Sub-order not found.';
        return;
      }
      Map<String, dynamic>? shop;
      for (final s in listOf(db, 'shops')) {
        if (s['id'] == subOrder!['shopId']) {
          shop = s;
          break;
        }
      }
      if (shop == null || (shop['ownerId'] != user['id'] && user['role'] != 'admin')) {
        error = "You do not manage this shop's orders.";
        return;
      }
      subOrder['status'] = status;
      updated = subOrder;
    });

    if (error != null) {
      return errorResponse(error!, status: error!.contains('manage') ? 403 : 404);
    }
    return jsonResponse({'subOrder': updated});
  });

  return router;
}
