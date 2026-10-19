import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../models/models.dart';
import '../../services/services.dart';
import '../../widgets/common.dart';
import '../../widgets/shop_logo.dart';
import '../product/product_detail_screen.dart';

/// A single shop's own page — only its categories and products, not the
/// combined marketplace view (mirrors /shops/[id] in the web app).
class ShopDetailScreen extends StatefulWidget {
  final ZShop shop;
  const ShopDetailScreen({super.key, required this.shop});

  @override
  State<ShopDetailScreen> createState() => _ShopDetailScreenState();
}

class _ShopDetailScreenState extends State<ShopDetailScreen> {
  List<ZProduct>? _products;
  String? _category;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = await ApiClient.instance();
      final products = await CatalogService(api).listProducts(shopId: widget.shop.id, category: _category);
      if (!mounted) return;
      setState(() { _products = products; _error = null; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoriesInShop = {
      if (_products != null) ..._products!.map((p) => p.category) else ...kCategories,
    }.toList();

    return Scaffold(
      appBar: AppBar(title: Text(widget.shop.name)),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Row(children: [
            ShopLogo(shopName: widget.shop.name, accentHex: widget.shop.accent, size: 52),
            if (widget.shop.tagline.isNotEmpty) ...[
              const SizedBox(width: 14),
              Expanded(child: Text(widget.shop.tagline)),
            ],
          ]),
        ),
        SizedBox(
          height: 40,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            children: [
              CategoryFilterChip(label: 'All', selected: _category == null, onTap: () { setState(() => _category = null); _load(); }),
              for (final c in categoriesInShop)
                CategoryFilterChip(
                  label: kCategoryLabels[c] ?? c,
                  selected: _category == c,
                  onTap: () { setState(() => _category = c); _load(); },
                ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: _error != null
              ? Padding(padding: const EdgeInsets.all(24), child: ErrorBanner(message: _error!))
              : _products == null
                  ? const Center(child: CircularProgressIndicator())
                  : _products!.isEmpty
                      ? const EmptyState(icon: Icons.inventory_2_outlined, title: 'No products in this category yet')
                      : GridView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.72,
                          ),
                          itemCount: _products!.length,
                          itemBuilder: (context, i) {
                            final p = _products![i];
                            return ProductCard(
                              product: p,
                              onTap: () => Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => ProductDetailScreen(productId: p.id)),
                              ),
                            );
                          },
                        ),
        ),
      ]),
    );
  }
}

/// Exposed publicly so ShopBrowseScreen's private chip style can stay
/// local while this one is reused here.
class CategoryFilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const CategoryFilterChip({super.key, required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: ChoiceChip(
        label: Text(label, style: const TextStyle(fontSize: 12)),
        selected: selected,
        onSelected: (_) => onTap(),
        side: BorderSide.none,
      ),
    );
  }
}
