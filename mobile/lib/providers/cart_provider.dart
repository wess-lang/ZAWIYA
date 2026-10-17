import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// A cart line, denormalized the same way src/context/CartContext.tsx
/// does: price/name/shop captured at add-to-cart time so the cart and
/// checkout screens don't need a round trip to the catalogue just to
/// render totals.
class CartLine {
  final String productId;
  final String name;
  final double price;
  final String image;
  final String shopId;
  final String shopName;
  int qty;

  CartLine({
    required this.productId,
    required this.name,
    required this.price,
    required this.image,
    required this.shopId,
    required this.shopName,
    this.qty = 1,
  });

  Map<String, dynamic> toJson() => {
        'productId': productId,
        'name': name,
        'price': price,
        'image': image,
        'shopId': shopId,
        'shopName': shopName,
        'qty': qty,
      };

  factory CartLine.fromJson(Map<String, dynamic> j) => CartLine(
        productId: j['productId'],
        name: j['name'],
        price: (j['price'] as num).toDouble(),
        image: j['image'] ?? '',
        shopId: j['shopId'],
        shopName: j['shopName'] ?? 'Shop',
        qty: (j['qty'] as num).toInt(),
      );
}

/// Client-side cart (FR-08: Multi-Shop Cart), persisted to
/// SharedPreferences the same way the web app persists to
/// localStorage — it's pre-purchase, ephemeral, per-device state.
class CartProvider extends ChangeNotifier {
  static const _prefsKey = 'zawiya.cart';
  final List<CartLine> lines = [];
  bool _loaded = false;

  Future<void> load() async {
    if (_loaded) return;
    _loaded = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_prefsKey);
      if (raw != null) {
        final list = (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
        lines.addAll(list.map(CartLine.fromJson));
      }
    } catch (_) {
      // Corrupt storage — start with an empty cart.
    }
    notifyListeners();
  }

  Future<void> _persist() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefsKey, jsonEncode(lines.map((l) => l.toJson()).toList()));
    } catch (_) {
      // Storage unavailable — cart just won't persist this session.
    }
  }

  void add(CartLine item) {
    final existing = lines.where((l) => l.productId == item.productId).firstOrNull;
    if (existing != null) {
      existing.qty += item.qty;
    } else {
      lines.add(item);
    }
    _persist();
    notifyListeners();
  }

  void remove(String productId) {
    lines.removeWhere((l) => l.productId == productId);
    _persist();
    notifyListeners();
  }

  void setQty(String productId, int qty) {
    if (qty <= 0) return remove(productId);
    final line = lines.where((l) => l.productId == productId).firstOrNull;
    if (line != null) line.qty = qty;
    _persist();
    notifyListeners();
  }

  void clear() {
    lines.clear();
    _persist();
    notifyListeners();
  }

  int get count => lines.fold(0, (sum, l) => sum + l.qty);

  double get total => lines.fold(0.0, (sum, l) => sum + l.price * l.qty);

  Map<String, List<CartLine>> get linesByShop {
    final map = <String, List<CartLine>>{};
    for (final line in lines) {
      map.putIfAbsent(line.shopId, () => []).add(line);
    }
    return map;
  }
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
