import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../models/models.dart';
import '../../services/services.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../product/product_detail_screen.dart';

/// FR-06/FR-07: the combined marketplace catalogue, with search and
/// category filter — mirrors the web app's /shop route.
class ShopBrowseScreen extends StatefulWidget {
  const ShopBrowseScreen({super.key});

  @override
  State<ShopBrowseScreen> createState() => _ShopBrowseScreenState();
}

class _ShopBrowseScreenState extends State<ShopBrowseScreen> {
  final _searchCtrl = TextEditingController();
  String? _category;
  List<ZProduct>? _products;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _error = null; });
    try {
      final api = await ApiClient.instance();
      final products = await CatalogService(api).listProducts(
        q: _searchCtrl.text.trim(),
        category: _category,
      );
      if (!mounted) return;
      setState(() { _products = products; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Shop')),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: TextField(
            controller: _searchCtrl,
            decoration: InputDecoration(
              hintText: 'Search furniture...',
              prefixIcon: const Icon(Icons.search, size: 20),
              suffixIcon: _searchCtrl.text.isEmpty
                  ? null
                  : IconButton(icon: const Icon(Icons.close, size: 18), onPressed: () { _searchCtrl.clear(); _load(); }),
            ),
            textInputAction: TextInputAction.search,
            onSubmitted: (_) => _load(),
          ),
        ),
        SizedBox(
          height: 40,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: [
              _CategoryChip(label: 'All', selected: _category == null, onTap: () { setState(() => _category = null); _load(); }),
              for (final c in kCategories)
                _CategoryChip(
                  label: kCategoryLabels[c]!,
                  selected: _category == c,
                  onTap: () { setState(() => _category = c); _load(); },
                ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Expanded(child: _body()),
      ]),
    );
  }

  Widget _body() {
    if (_error != null) return Center(child: Padding(padding: const EdgeInsets.all(24), child: ErrorBanner(message: _error!)));
    if (_products == null) return const Center(child: CircularProgressIndicator());
    if (_products!.isEmpty) {
      return const EmptyState(icon: Icons.search_off, title: 'No products found', subtitle: 'Try a different search or category.');
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: GridView.builder(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.72,
        ),
        itemCount: _products!.length,
        itemBuilder: (context, i) {
          final p = _products![i];
          return ProductCard(
            product: p,
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProductDetailScreen(productId: p.id))),
          );
        },
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _CategoryChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: ChoiceChip(
        label: Text(label, style: const TextStyle(fontSize: 12)),
        selected: selected,
        onSelected: (_) => onTap(),
        selectedColor: ZColors.sage100,
        backgroundColor: ZColors.stone100,
        labelStyle: TextStyle(color: selected ? ZColors.sage800 : ZColors.stone600),
        side: BorderSide.none,
      ),
    );
  }
}
