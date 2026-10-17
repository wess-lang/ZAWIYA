import 'package:flutter/material.dart';

import '../models/models.dart';
import '../theme.dart';
import 'product_image.dart';

class StarRating extends StatelessWidget {
  final double rating;
  final int? count;
  final double size;

  const StarRating({super.key, required this.rating, this.count, this.size = 14});

  @override
  Widget build(BuildContext context) {
    final rounded = rating.round();
    return Row(mainAxisSize: MainAxisSize.min, children: [
      ...List.generate(5, (i) => Icon(
            i < rounded ? Icons.star_rounded : Icons.star_outline_rounded,
            size: size,
            color: i < rounded ? ZColors.amber : ZColors.stone300,
          )),
      if (count != null) ...[
        const SizedBox(width: 6),
        Text(
          rating > 0 ? rating.toStringAsFixed(1) : 'No ratings',
          style: TextStyle(fontSize: size * 0.8, color: ZColors.stone500),
        ),
        if (count! > 0) Text(' ($count)', style: TextStyle(fontSize: size * 0.8, color: ZColors.stone500)),
      ],
    ]);
  }
}

class SubOrderStatusBadge extends StatelessWidget {
  final String status;
  const SubOrderStatusBadge({super.key, required this.status});

  static const Map<String, Color> _bg = {
    'placed': ZColors.stone100,
    'confirmed': Color(0xFFEFF6FF),
    'preparing': Color(0xFFFFFBEB),
    'out_for_delivery': Color(0xFFFAF5FF),
    'delivered': ZColors.sage50,
    'cancelled': Color(0xFFFEF2F2),
  };
  static const Map<String, Color> _fg = {
    'placed': ZColors.stone600,
    'confirmed': ZColors.blue,
    'preparing': Color(0xFFB45309),
    'out_for_delivery': ZColors.purple,
    'delivered': ZColors.sage700,
    'cancelled': ZColors.red,
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _bg[status] ?? ZColors.stone100,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        kSubOrderStatusLabels[status] ?? status,
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _fg[status] ?? ZColors.stone600),
      ),
    );
  }
}

class ProductCard extends StatelessWidget {
  final ZProduct product;
  final String? shopName;
  final VoidCallback onTap;

  const ProductCard({super.key, required this.product, this.shopName, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: ZColors.stone200),
          borderRadius: BorderRadius.circular(12),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          AspectRatio(
            aspectRatio: 4 / 3,
            child: Stack(fit: StackFit.expand, children: [
              ProductImage(path: product.image),
              if (product.stock <= 0)
                Positioned(
                  left: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.75),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text('Out of stock', style: TextStyle(color: Colors.white, fontSize: 10)),
                  ),
                ),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (shopName != null)
                Text(shopName!.toUpperCase(),
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: ZColors.stone500, letterSpacing: 0.3)),
              const SizedBox(height: 2),
              Text(product.name,
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: ZColors.stone900)),
              const SizedBox(height: 4),
              Text(formatJD(product.price),
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: ZColors.sage700)),
            ]),
          ),
        ]),
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? action;

  const EmptyState({super.key, required this.icon, required this.title, this.subtitle, this.action});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 40, color: ZColors.stone300),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: ZColors.stone900), textAlign: TextAlign.center),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(subtitle!, style: const TextStyle(fontSize: 13, color: ZColors.stone500), textAlign: TextAlign.center),
          ],
          if (action != null) ...[const SizedBox(height: 16), action!],
        ]),
      ),
    );
  }
}

class ErrorBanner extends StatelessWidget {
  final String message;
  const ErrorBanner({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Text(message, style: const TextStyle(color: ZColors.red, fontSize: 13)),
    );
  }
}

void showSnack(BuildContext context, String message, {bool isError = false}) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
    content: Text(message),
    backgroundColor: isError ? ZColors.red : ZColors.sage700,
  ));
}
