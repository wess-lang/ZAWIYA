import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../models/models.dart';
import '../../services/services.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/product_image.dart';
import 'product_form_screen.dart';

/// FR-13: Shop Product Management.
class ShopProductsScreen extends StatefulWidget {
  final ZShop shop;
  const ShopProductsScreen({super.key, required this.shop});

  @override
  State<ShopProductsScreen> createState() => _ShopProductsScreenState();
}

class _ShopProductsScreenState extends State<ShopProductsScreen> {
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
      final products = await CatalogService(api).listProducts(shopId: widget.shop.id, shopOwnerId: widget.shop.ownerId);
      if (!mounted) return;
      setState(() { _products = products; _error = null; });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  Future<void> _delete(ZProduct p) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete product?'),
        content: Text('This removes "${p.name}" permanently.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Delete', style: TextStyle(color: ZColors.red))),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      final api = await ApiClient.instance();
      await CatalogService(api).deleteProduct(p.id);
      _load();
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('${widget.shop.name} — Products')),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final created = await Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProductFormScreen(shopId: widget.shop.id)));
          if (created == true) _load();
        },
        child: const Icon(Icons.add),
      ),
      body: _error != null
          ? Padding(padding: const EdgeInsets.all(24), child: ErrorBanner(message: _error!))
          : _products == null
              ? const Center(child: CircularProgressIndicator())
              : _products!.isEmpty
                  ? const EmptyState(icon: Icons.inventory_2_outlined, title: 'No products yet', subtitle: 'Tap + to add your first product.')
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                      itemCount: _products!.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, i) {
                        final p = _products![i];
                        return Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(color: Colors.white, border: Border.all(color: ZColors.stone200), borderRadius: BorderRadius.circular(12)),
                          child: Row(children: [
                            ClipRRect(borderRadius: BorderRadius.circular(8), child: ProductImage(path: p.image, width: 48, height: 48)),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(p.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                Text('${formatJD(p.price)} · stock ${p.stock}', style: const TextStyle(fontSize: 12, color: ZColors.stone500)),
                              ]),
                            ),
                            IconButton(
                              icon: const Icon(Icons.edit_outlined, size: 20),
                              onPressed: () => _edit(p),
                            ),
                            IconButton(icon: const Icon(Icons.delete_outline, size: 20, color: ZColors.red), onPressed: () => _delete(p)),
                          ]),
                        );
                      },
                    ),
    );
  }

  Future<void> _edit(ZProduct p) async {
    final updated = await Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProductFormScreen(shopId: widget.shop.id, existing: p)));
    if (updated == true) _load();
  }
}
