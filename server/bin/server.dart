import 'dart:io';
import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as shelf_io;
import 'package:shelf_router/shelf_router.dart';

import '../lib/env.dart';

import '../lib/routes/auth_routes.dart';
import '../lib/routes/products_routes.dart';
import '../lib/routes/shops_routes.dart';
import '../lib/routes/addresses_routes.dart';
import '../lib/routes/orders_routes.dart';
import '../lib/routes/reviews_routes.dart';
import '../lib/routes/wishlist_routes.dart';
import '../lib/routes/rooms_routes.dart';

Middleware _cors() {
  return (Handler innerHandler) {
    return (Request request) async {
      if (request.method == 'OPTIONS') {
        return Response.ok('', headers: _corsHeaders);
      }
      final response = await innerHandler(request);
      return response.change(headers: {...response.headers, ..._corsHeaders});
    };
  };
}

const _corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Cookie',
  'Access-Control-Allow-Credentials': 'true',
};

void main(List<String> args) async {
  final app = Router();

  app.mount('/api/auth', buildAuthRouter().call);
  app.mount('/api/me', buildMeRouter().call);
  app.mount('/api/products', buildProductsRouter().call);
  app.mount('/api/shops', buildShopsRouter().call);
  app.mount('/api/admin/shops', buildAdminShopsRouter().call);
  app.mount('/api/addresses', buildAddressesRouter().call);
  app.mount('/api/orders', buildOrdersRouter().call);
  app.mount('/api/reviews', buildReviewsRouter().call);
  app.mount('/api/wishlist', buildWishlistRouter().call);
  app.mount('/api/rooms', buildRoomsRouter().call);

  app.get('/api/health', (Request req) => Response.ok('{"ok":true}', headers: {'content-type': 'application/json'}));

  final handler = const Pipeline()
      .addMiddleware(logRequests())
      .addMiddleware(_cors())
      .addHandler(app.call);

  final port = int.tryParse(env['PORT'] ?? '') ?? 3005;
  final server = await shelf_io.serve(handler, InternetAddress.anyIPv4, port);
  print('ZAWIYA Dart server listening on http://${server.address.host}:${server.port}');
  print('(Serving the same data/db.json the Next.js app seeded — no migration needed.)');
}
