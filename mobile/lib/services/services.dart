import 'dart:convert';

import '../core/api_client.dart';
import '../models/models.dart';

/// Thin service layer: one class per resource, each a direct mapping to
/// a route under src/app/api/** on the ZAWIYA Next.js backend. Kept
/// close to the JSON shapes those routes already return/accept.
class AuthService {
  final ApiClient api;
  AuthService(this.api);

  Future<String> login(String email, String password) async {
    final res = await api.post('/auth/login', body: {'email': email, 'password': password});
    return res['role'] as String;
  }

  Future<void> register({required String name, required String email, required String password, String role = 'customer'}) {
    return api.post('/auth/register', body: {'name': name, 'email': email, 'password': password, 'role': role});
  }

  Future<void> logout() => api.post('/auth/logout');

  Future<ZUser> me() async {
    final res = await api.get('/me');
    return ZUser.fromJson(res['user']);
  }
}

class CatalogService {
  final ApiClient api;
  CatalogService(this.api);

  Future<List<ZProduct>> listProducts({String? q, String? category, String? shopId, double? maxPrice, String? shopOwnerId}) async {
    final res = await api.get('/products', query: {
      if (q != null && q.isNotEmpty) 'q': q,
      if (category != null) 'category': category,
      if (shopId != null) 'shopId': shopId,
      if (maxPrice != null) 'maxPrice': maxPrice,
      if (shopOwnerId != null) 'shopOwnerId': shopOwnerId,
    });
    return (res['products'] as List).map((e) => ZProduct.fromJson(e)).toList();
  }

  Future<(ZProduct, ZShop?, List<ZReview>)> getProduct(String id) async {
    final res = await api.get('/products/$id');
    final product = ZProduct.fromJson(res['product']);
    final shop = res['shop'] != null ? ZShop.fromJson(res['shop']) : null;
    final reviews = (res['reviews'] as List).map((e) => ZReview.fromJson(e)).toList();
    return (product, shop, reviews);
  }

  Future<ZProduct> createProduct(Map<String, dynamic> body) async {
    final res = await api.post('/products', body: body);
    return ZProduct.fromJson(res['product']);
  }

  Future<ZProduct> updateProduct(String id, Map<String, dynamic> body) async {
    final res = await api.put('/products/$id', body: body);
    return ZProduct.fromJson(res['product']);
  }

  Future<void> deleteProduct(String id) => api.delete('/products/$id');
}

class ShopService {
  final ApiClient api;
  ShopService(this.api);

  Future<List<ZShop>> listShops() async {
    final res = await api.get('/shops');
    return (res['shops'] as List).map((e) => ZShop.fromJson(e)).toList();
  }

  Future<ZShop> createShop({required String name, required String tagline, required String city, List<String> styleTags = const []}) async {
    final res = await api.post('/shops', body: {'name': name, 'tagline': tagline, 'city': city, 'styleTags': styleTags});
    return ZShop.fromJson(res['shop']);
  }

  Future<List<ZShop>> listMyShops() async {
    final res = await api.get('/shops/mine');
    return (res['shops'] as List).map((e) => ZShop.fromJson(e)).toList();
  }

  Future<List<ZShop>> listAdminShops() async {
    final res = await api.get('/admin/shops');
    return (res['shops'] as List).map((e) => ZShop.fromJson(e)).toList();
  }

  Future<ZShop> setApproval(String shopId, {required bool approve, String? reason}) async {
    final res = await api.post('/shops/$shopId/approval', body: {
      'action': approve ? 'approve' : 'reject',
      if (reason != null) 'reason': reason,
    });
    return ZShop.fromJson(res['shop']);
  }

  Future<List<ZShopOrderRow>> listShopOrders(String shopId) async {
    final res = await api.get('/shops/$shopId/orders');
    return (res['rows'] as List).map((e) => ZShopOrderRow.fromJson(e)).toList();
  }
}

class OrderService {
  final ApiClient api;
  OrderService(this.api);

  Future<ZOrder> checkout({required String addressId, required String paymentMethod, required List<Map<String, dynamic>> lines}) async {
    final res = await api.post('/orders/checkout', body: {
      'addressId': addressId,
      'paymentMethod': paymentMethod,
      'lines': lines,
    });
    return ZOrder.fromJson(res['order']);
  }

  Future<List<ZOrder>> listOrders() async {
    final res = await api.get('/orders');
    return (res['orders'] as List).map((e) => ZOrder.fromJson(e)).toList();
  }

  Future<ZSubOrder> updateSubOrderStatus(String orderId, String subOrderId, String status) async {
    final res = await api.put('/orders/$orderId/suborders/$subOrderId/status', body: {'status': status});
    return ZSubOrder.fromJson(res['subOrder']);
  }
}

class ReviewService {
  final ApiClient api;
  ReviewService(this.api);

  Future<ZReview> addReview({required String productId, required int rating, String comment = ''}) async {
    final res = await api.post('/reviews', body: {'productId': productId, 'rating': rating, 'comment': comment});
    return ZReview.fromJson(res['review']);
  }
}

class WishlistService {
  final ApiClient api;
  WishlistService(this.api);

  Future<List<ZProduct>> list() async {
    final res = await api.get('/wishlist');
    return (res['products'] as List).map((e) => ZProduct.fromJson(e)).toList();
  }

  Future<void> add(String productId) => api.post('/wishlist', body: {'productId': productId});

  Future<void> remove(String productId) => api.delete('/wishlist', query: {'productId': productId});
}

class AddressService {
  final ApiClient api;
  AddressService(this.api);

  Future<List<ZAddress>> list() async {
    final res = await api.get('/addresses');
    return (res['addresses'] as List).map((e) => ZAddress.fromJson(e)).toList();
  }

  Future<ZAddress> create({required String label, required String city, required String details}) async {
    final res = await api.post('/addresses', body: {'label': label, 'city': city, 'details': details});
    return ZAddress.fromJson(res['address']);
  }
}

class RoomFitResult {
  final bool lowConfidence;
  final double confidence;
  final String? message;
  final String? roomType;
  final List<String> styleTags;
  final List<String> palette;
  final List<ZRecommendation> recommendations;

  RoomFitResult({
    required this.lowConfidence,
    required this.confidence,
    this.message,
    this.roomType,
    this.styleTags = const [],
    this.palette = const [],
    this.recommendations = const [],
  });

  factory RoomFitResult.fromJson(Json j) => RoomFitResult(
        lowConfidence: j['lowConfidence'] == true,
        confidence: (j['confidence'] as num?)?.toDouble() ?? 0,
        message: j['message'],
        roomType: j['roomType'],
        styleTags: (j['styleTags'] as List?)?.map((e) => e.toString()).toList() ?? [],
        palette: (j['palette'] as List?)?.map((e) => e.toString()).toList() ?? [],
        recommendations: (j['recommendations'] as List?)?.map((e) => ZRecommendation.fromJson(e)).toList() ?? [],
      );
}

class RoomFitService {
  final ApiClient api;
  RoomFitService(this.api);

  Future<RoomFitResult> analyze({required List<int> imageBytes, required String mediaType, double? budget}) async {
    final res = await api.post('/rooms/analyze', body: {
      'image': base64Encode(imageBytes),
      'mediaType': mediaType,
      if (budget != null) 'budget': budget,
    });
    return RoomFitResult.fromJson(res);
  }
}
