import 'dart:io';
import 'package:shelf/shelf.dart';
import 'package:shelf_router/shelf_router.dart';

import '../auth.dart';
import '../db.dart';
import '../helpers.dart';
import '../room_vision_service.dart';
import '../room_compositing_service.dart';
import '../env.dart';

const _errorStatus = {
  'INVALID_IMAGE': 400,
  'TIMEOUT': 504,
  'RATE_LIMITED': 429,
  'AUTH_ERROR': 500,
  'PROVIDER_ERROR': 502,
  'MODEL_REFUSED': 422,
  'UNPARSEABLE_RESPONSE': 502,
  'NO_IMAGE_RETURNED': 502,
  'UNKNOWN': 500,
};

String _mimeTypeForPath(String imagePath) {
  if (imagePath.endsWith('.svg')) return 'image/svg+xml';
  if (imagePath.endsWith('.png')) return 'image/png';
  if (imagePath.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

bool _hasGeminiKey() => (env['GEMINI_API_KEY'] ?? env['GOOGLE_API_KEY'] ?? '').isNotEmpty;

Router buildRoomsRouter() {
  final router = Router();
  final visionService = RoomVisionService();
  final compositingService = RoomCompositingService();

  // POST /api/rooms/analyze-v2 — free-tier vision analysis + catalog matching.
  router.post('/analyze-v2', (Request req) async {
    final user = getCurrentUser(req);
    if (user == null) return errorResponse('Sign in first.', status: 401);
    if (!_hasGeminiKey()) {
      return errorResponse('GEMINI_API_KEY is not set on the server. Add it and restart.', status: 500);
    }

    final body = await readJsonBody(req);
    if (body == null) return errorResponse('Invalid request body.');
    final imageB64 = body['image'] as String?;
    final mediaType = body['mediaType'] as String?;
    if (imageB64 == null || mediaType == null) {
      return errorResponse('Expected { image: base64String, mediaType: string }.');
    }
    final style = body['style'] as String?;
    final colors = (body['colors'] as List?)?.whereType<String>().toList();

    final imageBytes = _b64decode(imageB64);
    final result = await visionService.analyzeRoom(imageBytes, mediaType, style: style, colors: colors);

    if (!result.ok) {
      if (result.error!.code == 'LOW_CONFIDENCE') {
        return jsonResponse({'lowConfidence': true, 'message': result.error!.message});
      }
      return errorResponse(result.error!.message,
          status: _errorStatus[result.error!.code] ?? 500, code: result.error!.code, retryable: result.error!.retryable);
    }

    final db = readDb();
    final productsById = {for (final p in listOf(db, 'products')) p['id'] as String: p};
    final shopsById = {for (final s in listOf(db, 'shops')) s['id'] as String: s};

    final rawPlacements = (result.data!['placements'] as List).cast<Map<String, dynamic>>();
    final placements = rawPlacements.map((placement) {
      final productId = placement['productId'] as String?;
      final product = productId != null ? productsById[productId] : null;
      final shop = product != null ? shopsById[product['shopId']] : null;
      return {
        'spaceId': placement['spaceId'],
        'description': placement['description'],
        'category': placement['category'],
        'orientation': placement['orientation'],
        'boundingBox': placement['boundingBox'],
        'matchConfidence': placement['matchConfidence'],
        'fallback': placement['fallback'],
        'product': product != null
            ? {
                'id': product['id'],
                'name': product['name'],
                'price': product['price'],
                'image': product['image'],
                'shopId': product['shopId'],
                'stock': product['stock'],
              }
            : null,
        'shopName': shop != null ? shop['name'] : null,
      };
    }).toList();

    return jsonResponse({
      'lowConfidence': false,
      'roomType': result.data!['roomType'],
      'styleTags': result.data!['styleTags'],
      'analysisConfidence': result.data!['analysisConfidence'],
      'roomBoundary': result.data!['roomBoundary'],
      'placements': placements,
    });
  });

  // POST /api/rooms/compose — PAID image generation. Not called by the
  // assistant that wrote this port; test this one yourself to control spend.
  router.post('/compose', (Request req) async {
    final user = getCurrentUser(req);
    if (user == null) return errorResponse('Sign in first.', status: 401);
    if (!_hasGeminiKey()) {
      return errorResponse('GEMINI_API_KEY is not set on the server. Add it and restart.', status: 500);
    }

    final body = await readJsonBody(req);
    if (body == null) return errorResponse('Invalid request body.');
    final roomImageB64 = body['roomImage'] as String?;
    final roomMediaType = body['roomMediaType'] as String?;
    final items = (body['items'] as List?)?.cast<Map<String, dynamic>>();
    final styleNote = body['styleNote'] as String?;
    if (roomImageB64 == null || roomMediaType == null || items == null || items.isEmpty) {
      return errorResponse(
          'Expected { roomImage: base64String, roomMediaType: string, items: [{ productId: string, placementHint?: string, orientation?: string }] } with at least one item.');
    }

    final db = readDb();
    final products = <CompositeProduct>[];
    for (final item in items) {
      final productId = item['productId'] as String?;
      if (productId == null) return errorResponse('Every item needs a productId.');
      Map<String, dynamic>? product;
      for (final p in listOf(db, 'products')) {
        if (p['id'] == productId) {
          product = p;
          break;
        }
      }
      if (product == null) return errorResponse('Unknown product: $productId', status: 404);

      final mimeType = _mimeTypeForPath(product['image'] as String);
      if (mimeType == 'image/svg+xml') {
        return errorResponse(
            '"${product['name']}" only has a generated placeholder illustration, not a real photo, so it can\'t be composited into a room photo yet.',
            status: 422);
      }

      List<int> imageBytes;
      try {
        final filePath = _resolvePublicPath(product['image'] as String);
        imageBytes = File(filePath).readAsBytesSync();
      } catch (_) {
        return errorResponse('Could not read the image file for "${product['name']}".', status: 500);
      }

      products.add(CompositeProduct(
        image: imageBytes,
        mimeType: mimeType,
        label: product['name'] as String,
        placementHint: item['placementHint'] as String?,
        orientation: item['orientation'] as String?,
      ));
    }

    final roomBytes = _b64decode(roomImageB64);
    final result = await compositingService.compose(
      roomImage: roomBytes,
      roomMimeType: roomMediaType,
      products: products,
      styleNote: styleNote,
    );

    if (!result.ok) {
      return errorResponse(result.error!.message,
          status: _errorStatus[result.error!.code] ?? 500, code: result.error!.code, retryable: result.error!.retryable);
    }
    return jsonResponse({'image': result.image!.data, 'mimeType': result.image!.mimeType});
  });

  // POST /api/rooms/compose/refine — PAID iterative edit.
  router.post('/compose/refine', (Request req) async {
    final user = getCurrentUser(req);
    if (user == null) return errorResponse('Sign in first.', status: 401);
    if (!_hasGeminiKey()) {
      return errorResponse('GEMINI_API_KEY is not set on the server. Add it and restart.', status: 500);
    }

    final body = await readJsonBody(req);
    if (body == null) return errorResponse('Invalid request body.');
    final baseImageB64 = body['baseImage'] as String?;
    final baseMediaType = body['baseMediaType'] as String?;
    final instruction = body['instruction'] as String?;
    if (baseImageB64 == null || baseMediaType == null || instruction == null) {
      return errorResponse('Expected { baseImage: base64String, baseMediaType: string, instruction: string }.');
    }

    final result = await compositingService.refine(
      baseImage: _b64decode(baseImageB64),
      baseMimeType: baseMediaType,
      instruction: instruction,
    );

    if (!result.ok) {
      return errorResponse(result.error!.message,
          status: _errorStatus[result.error!.code] ?? 500, code: result.error!.code, retryable: result.error!.retryable);
    }
    return jsonResponse({'image': result.image!.data, 'mimeType': result.image!.mimeType});
  });

  return router;
}

List<int> _b64decode(String input) {
  // Mirrors Buffer.from(image, 'base64') leniency — standard base64, padded or not.
  var s = input;
  final mod = s.length % 4;
  if (mod != 0) s += '=' * (4 - mod);
  return Uri.parse('data:;base64,$s').data!.contentAsBytes();
}

String _resolvePublicPath(String imagePath) {
  final here = Directory.current.path;
  final root = here.endsWith('server') ? '$here/..' : here;
  final clean = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  return '$root/public/$clean';
}
