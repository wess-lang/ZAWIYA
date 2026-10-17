import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../models/models.dart';
import '../../services/services.dart';
import '../../widgets/common.dart';
import '../product/product_detail_screen.dart';

/// FR-18: Wishlist / Favourites.
class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});

  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  List<ZProduct>? _products;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = await ApiClient.instance();
      final products = await WishlistService(api).list();
      if (!mounted) return;
      setState(() { _products = products; _error = null; });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Wishlist')),
      body: _error != null
          ? Padding(padding: const EdgeInsets.all(24), child: ErrorBanner(message: _error!))
          : _products == null
              ? const Center(child: CircularProgressIndicator())
              : _products!.isEmpty
                  ? const EmptyState(icon: Icons.favorite_border, title: 'Nothing saved yet', subtitle: 'Tap the heart on a product to save it here.')
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: GridView.builder(
                        padding: const EdgeInsets.all(16),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.72,
                        ),
                        itemCount: _products!.length,
                        itemBuilder: (context, i) {
                          final p = _products![i];
                          return ProductCard(
                            product: p,
                            onTap: () async {
                              await Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProductDetailScreen(productId: p.id)));
                              _load();
                            },
                          );
                        },
                      ),
                    ),
    );
  }
}
