import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../services/services.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/product_image.dart';
import '../auth/login_screen.dart';

class ProductDetailScreen extends StatefulWidget {
  final String productId;
  const ProductDetailScreen({super.key, required this.productId});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  ZProduct? _product;
  ZShop? _shop;
  List<ZReview> _reviews = [];
  String? _error;
  bool _wishlisted = false;
  bool _wishlistBusy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = await ApiClient.instance();
      final (product, shop, reviews) = await CatalogService(api).getProduct(widget.productId);
      if (!mounted) return;
      bool wishlisted = false;
      final auth = context.read<AuthProvider>();
      if (auth.status == AuthStatus.signedIn) {
        try {
          final list = await WishlistService(api).list();
          wishlisted = list.any((p) => p.id == widget.productId);
        } catch (_) {}
      }
      if (!mounted) return;
      setState(() { _product = product; _shop = shop; _reviews = reviews; _wishlisted = wishlisted; _error = null; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = e.toString(); });
    }
  }

  Future<void> _toggleWishlist() async {
    final auth = context.read<AuthProvider>();
    if (auth.status != AuthStatus.signedIn) {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
      return;
    }
    setState(() => _wishlistBusy = true);
    try {
      final api = await ApiClient.instance();
      final service = WishlistService(api);
      if (_wishlisted) {
        await service.remove(widget.productId);
      } else {
        await service.add(widget.productId);
      }
      if (!mounted) return;
      setState(() { _wishlisted = !_wishlisted; });
    } catch (e) {
      if (!mounted) return;
      showSnack(context, e.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _wishlistBusy = false);
    }
  }

  void _addToCart() {
    final p = _product!;
    context.read<CartProvider>().add(CartLine(
          productId: p.id,
          name: p.name,
          price: p.price,
          image: p.image,
          shopId: p.shopId,
          shopName: _shop?.name ?? 'Shop',
        ));
    showSnack(context, 'Added to cart');
  }

  Future<void> _showReviewSheet() async {
    final auth = context.read<AuthProvider>();
    if (auth.status != AuthStatus.signedIn) {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
      return;
    }
    int rating = 5;
    final commentCtrl = TextEditingController();
    final submitted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheetState) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const Text('Rate this product', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
            const SizedBox(height: 12),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              for (var i = 1; i <= 5; i++)
                IconButton(
                  icon: Icon(i <= rating ? Icons.star_rounded : Icons.star_outline_rounded, color: ZColors.amber, size: 32),
                  onPressed: () => setSheetState(() => rating = i),
                ),
            ]),
            TextField(
              controller: commentCtrl,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Comment (optional)'),
            ),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Submit review')),
            const SizedBox(height: 20),
          ]),
        );
      }),
    );
    if (submitted != true) return;
    try {
      final api = await ApiClient.instance();
      await ReviewService(api).addReview(productId: widget.productId, rating: rating, comment: commentCtrl.text.trim());
      if (!mounted) return;
      showSnack(context, 'Review submitted');
      _load();
    } catch (e) {
      if (!mounted) return;
      showSnack(context, e.toString(), isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(appBar: AppBar(), body: Padding(padding: const EdgeInsets.all(24), child: ErrorBanner(message: _error!)));
    }
    if (_product == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final p = _product!;
    final avgRating = _reviews.isEmpty ? 0.0 : _reviews.map((r) => r.rating).reduce((a, b) => a + b) / _reviews.length;

    return Scaffold(
      appBar: AppBar(
        title: Text(p.name, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(
            icon: Icon(_wishlisted ? Icons.favorite : Icons.favorite_border, color: _wishlisted ? ZColors.sage700 : null),
            onPressed: _wishlistBusy ? null : _toggleWishlist,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 100),
        children: [
          AspectRatio(aspectRatio: 1.1, child: ProductImage(path: p.image)),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (_shop != null)
                Text(_shop!.name.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: ZColors.stone500, letterSpacing: 0.4)),
              const SizedBox(height: 4),
              Text(p.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              StarRating(rating: avgRating, count: _reviews.length),
              const SizedBox(height: 10),
              Text(formatJD(p.price), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: ZColors.sage700)),
              const SizedBox(height: 4),
              Text(p.stock > 0 ? 'In stock: ${p.stock}' : 'Out of stock', style: TextStyle(color: p.stock > 0 ? ZColors.stone500 : ZColors.red, fontSize: 13)),
              const SizedBox(height: 14),
              Text(p.description, style: const TextStyle(color: ZColors.stone600, height: 1.4)),
              if (p.dimensions != null && p.dimensions!.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text('Dimensions: ${p.dimensions}', style: const TextStyle(fontSize: 13, color: ZColors.stone600)),
              ],
              if (p.styleTags.isNotEmpty || p.colorTags.isNotEmpty) ...[
                const SizedBox(height: 14),
                Wrap(spacing: 6, runSpacing: 6, children: [
                  for (final t in [...p.styleTags, ...p.colorTags]) _Tag(t),
                ]),
              ],
              const SizedBox(height: 24),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const Text('Reviews', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                TextButton(onPressed: _showReviewSheet, child: const Text('Write a review')),
              ]),
              if (_reviews.isEmpty)
                const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Text('No reviews yet.', style: TextStyle(color: ZColors.stone500))),
              for (final r in _reviews)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Text(r.userName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      const SizedBox(width: 8),
                      StarRating(rating: r.rating.toDouble(), size: 12),
                    ]),
                    if (r.comment.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 4), child: Text(r.comment, style: const TextStyle(fontSize: 13, color: ZColors.stone600))),
                  ]),
                ),
            ]),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton(
            onPressed: p.stock > 0 ? _addToCart : null,
            child: Text(p.stock > 0 ? 'Add to cart' : 'Out of stock'),
          ),
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  final String label;
  const _Tag(this.label);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: ZColors.stone100, borderRadius: BorderRadius.circular(999)),
      child: Text(label, style: const TextStyle(fontSize: 11, color: ZColors.stone600)),
    );
  }
}
