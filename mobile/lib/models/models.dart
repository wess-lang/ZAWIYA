// Mirrors src/lib/types.ts (the web app's shared domain types) as
// closely as a separate Dart client reasonably can.

typedef Json = Map<String, dynamic>;

const List<String> kCategories = [
  'sofa', 'bed', 'dining', 'chair', 'storage', 'lighting', 'outdoor', 'decor', 'office',
];

const Map<String, String> kCategoryLabels = {
  'sofa': 'Sofas & Seating',
  'bed': 'Beds & Bedroom',
  'dining': 'Dining',
  'chair': 'Chairs',
  'storage': 'Storage',
  'lighting': 'Lighting',
  'outdoor': 'Outdoor',
  'decor': 'Decor',
  'office': 'Office',
};

const List<String> kSubOrderStatusFlow = [
  'placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered',
];

const Map<String, String> kSubOrderStatusLabels = {
  'placed': 'Placed',
  'confirmed': 'Confirmed',
  'preparing': 'Preparing',
  'out_for_delivery': 'Out for Delivery',
  'delivered': 'Delivered',
  'cancelled': 'Cancelled',
};

class ZUser {
  final String id;
  final String name;
  final String email;
  final String role; // customer | shop_owner | admin
  final String createdAt;

  ZUser({required this.id, required this.name, required this.email, required this.role, required this.createdAt});

  factory ZUser.fromJson(Json j) => ZUser(
        id: j['id'],
        name: j['name'],
        email: j['email'],
        role: j['role'],
        createdAt: j['createdAt'] ?? '',
      );

  bool get isShopOwner => role == 'shop_owner' || role == 'admin';
  bool get isAdmin => role == 'admin';
}

class ZAddress {
  final String id;
  final String userId;
  final String label;
  final String city;
  final String details;

  ZAddress({required this.id, required this.userId, required this.label, required this.city, required this.details});

  factory ZAddress.fromJson(Json j) =>
      ZAddress(id: j['id'], userId: j['userId'], label: j['label'], city: j['city'], details: j['details']);
}

class ZShop {
  final String id;
  final String ownerId;
  final String name;
  final String tagline;
  final String city;
  final String accent;
  final List<String> styleTags;
  final String status; // pending | active | rejected | suspended
  final String? rejectionReason;
  final String createdAt;
  final String? ownerName;
  final int? productCount;
  final int? pendingOrders;

  ZShop({
    required this.id,
    required this.ownerId,
    required this.name,
    required this.tagline,
    required this.city,
    required this.accent,
    required this.styleTags,
    required this.status,
    required this.createdAt,
    this.rejectionReason,
    this.ownerName,
    this.productCount,
    this.pendingOrders,
  });

  factory ZShop.fromJson(Json j) => ZShop(
        id: j['id'],
        ownerId: j['ownerId'],
        name: j['name'],
        tagline: j['tagline'] ?? '',
        city: j['city'],
        accent: j['accent'] ?? '#6B7A4F',
        styleTags: (j['styleTags'] as List?)?.map((e) => e.toString()).toList() ?? [],
        status: j['status'],
        rejectionReason: j['rejectionReason'],
        createdAt: j['createdAt'] ?? '',
        ownerName: j['ownerName'],
        productCount: (j['productCount'] as num?)?.toInt(),
        pendingOrders: (j['pendingOrders'] as num?)?.toInt(),
      );
}

class ZProduct {
  final String id;
  final String shopId;
  final String name;
  final String category;
  final double price;
  final int stock;
  final List<String> styleTags;
  final List<String> colorTags;
  final List<String> roomTags;
  final String? dimensions;
  final String description;
  final String image;

  ZProduct({
    required this.id,
    required this.shopId,
    required this.name,
    required this.category,
    required this.price,
    required this.stock,
    required this.styleTags,
    required this.colorTags,
    required this.roomTags,
    required this.description,
    required this.image,
    this.dimensions,
  });

  factory ZProduct.fromJson(Json j) => ZProduct(
        id: j['id'],
        shopId: j['shopId'],
        name: j['name'],
        category: j['category'],
        price: (j['price'] as num).toDouble(),
        stock: (j['stock'] as num).toInt(),
        styleTags: (j['styleTags'] as List?)?.map((e) => e.toString()).toList() ?? [],
        colorTags: (j['colorTags'] as List?)?.map((e) => e.toString()).toList() ?? [],
        roomTags: (j['roomTags'] as List?)?.map((e) => e.toString()).toList() ?? [],
        dimensions: j['dimensions'],
        description: j['description'] ?? '',
        image: j['image'] ?? '',
      );
}

class ZReview {
  final String id;
  final String userId;
  final String userName;
  final String productId;
  final int rating;
  final String comment;
  final String createdAt;

  ZReview({
    required this.id,
    required this.userId,
    required this.userName,
    required this.productId,
    required this.rating,
    required this.comment,
    required this.createdAt,
  });

  factory ZReview.fromJson(Json j) => ZReview(
        id: j['id'],
        userId: j['userId'],
        userName: j['userName'] ?? 'Customer',
        productId: j['productId'],
        rating: (j['rating'] as num).toInt(),
        comment: j['comment'] ?? '',
        createdAt: j['createdAt'] ?? '',
      );
}

class ZOrderItem {
  final String productId;
  final String productName;
  final String shopId;
  final double unitPrice;
  final int qty;

  ZOrderItem({
    required this.productId,
    required this.productName,
    required this.shopId,
    required this.unitPrice,
    required this.qty,
  });

  factory ZOrderItem.fromJson(Json j) => ZOrderItem(
        productId: j['productId'],
        productName: j['productName'],
        shopId: j['shopId'],
        unitPrice: (j['unitPrice'] as num).toDouble(),
        qty: (j['qty'] as num).toInt(),
      );
}

class ZSubOrder {
  final String id;
  final String orderId;
  final String shopId;
  final String status;
  final List<ZOrderItem> items;
  final double subtotal;
  final String? shopName;

  ZSubOrder({
    required this.id,
    required this.orderId,
    required this.shopId,
    required this.status,
    required this.items,
    required this.subtotal,
    this.shopName,
  });

  factory ZSubOrder.fromJson(Json j) => ZSubOrder(
        id: j['id'],
        orderId: j['orderId'],
        shopId: j['shopId'],
        status: j['status'],
        items: (j['items'] as List).map((e) => ZOrderItem.fromJson(e)).toList(),
        subtotal: (j['subtotal'] as num).toDouble(),
        shopName: j['shopName'],
      );
}

class ZAddressSnapshot {
  final String label;
  final String city;
  final String details;

  ZAddressSnapshot({required this.label, required this.city, required this.details});

  factory ZAddressSnapshot.fromJson(Json j) =>
      ZAddressSnapshot(label: j['label'] ?? '', city: j['city'] ?? '', details: j['details'] ?? '');
}

class ZOrder {
  final String id;
  final String userId;
  final String addressId;
  final ZAddressSnapshot addressSnapshot;
  final String paymentMethod;
  final List<ZSubOrder> subOrders;
  final double totalAmount;
  final String createdAt;

  ZOrder({
    required this.id,
    required this.userId,
    required this.addressId,
    required this.addressSnapshot,
    required this.paymentMethod,
    required this.subOrders,
    required this.totalAmount,
    required this.createdAt,
  });

  factory ZOrder.fromJson(Json j) => ZOrder(
        id: j['id'],
        userId: j['userId'],
        addressId: j['addressId'],
        addressSnapshot: ZAddressSnapshot.fromJson(j['addressSnapshot'] ?? {}),
        paymentMethod: j['paymentMethod'],
        subOrders: (j['subOrders'] as List).map((e) => ZSubOrder.fromJson(e)).toList(),
        totalAmount: (j['totalAmount'] as num).toDouble(),
        createdAt: j['createdAt'] ?? '',
      );
}

class ZRecommendation {
  final ZProduct product;
  final String shopName;
  final double matchScore;
  final String reason;

  ZRecommendation({required this.product, required this.shopName, required this.matchScore, required this.reason});

  factory ZRecommendation.fromJson(Json j) => ZRecommendation(
        product: ZProduct.fromJson(j['product']),
        shopName: j['shopName'] ?? 'Shop',
        matchScore: (j['matchScore'] as num).toDouble(),
        reason: j['reason'] ?? '',
      );
}

class ZShopOrderRow {
  final String orderId;
  final ZSubOrder subOrder;
  final String customerName;
  final ZAddressSnapshot addressSnapshot;
  final String createdAt;

  ZShopOrderRow({
    required this.orderId,
    required this.subOrder,
    required this.customerName,
    required this.addressSnapshot,
    required this.createdAt,
  });

  factory ZShopOrderRow.fromJson(Json j) => ZShopOrderRow(
        orderId: j['orderId'],
        subOrder: ZSubOrder.fromJson(j['subOrder']),
        customerName: j['customerName'] ?? 'Customer',
        addressSnapshot: ZAddressSnapshot.fromJson(j['addressSnapshot'] ?? {}),
        createdAt: j['createdAt'] ?? '',
      );
}
