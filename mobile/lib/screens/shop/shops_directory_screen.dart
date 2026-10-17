import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../models/models.dart';
import '../../services/services.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import 'shop_detail_screen.dart';

/// /shops — lists every active partner shop. Tapping one opens its own
/// page with only that shop's categories and products (ShopDetailScreen).
class ShopsDirectoryScreen extends StatefulWidget {
  const ShopsDirectoryScreen({super.key});

  @override
  State<ShopsDirectoryScreen> createState() => _ShopsDirectoryScreenState();
}

class _ShopsDirectoryScreenState extends State<ShopsDirectoryScreen> {
  List<ZShop>? _shops;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = await ApiClient.instance();
      final shops = await ShopService(api).listShops();
      if (!mounted) return;
      setState(() { _shops = shops; _error = null; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Partner shops')),
      body: _error != null
          ? Padding(padding: const EdgeInsets.all(24), child: ErrorBanner(message: _error!))
          : _shops == null
              ? const Center(child: CircularProgressIndicator())
              : _shops!.isEmpty
                  ? const EmptyState(icon: Icons.storefront_outlined, title: 'No shops yet')
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _shops!.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, i) {
                          final s = _shops![i];
                          return _ShopTile(shop: s, onTap: () => Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => ShopDetailScreen(shop: s)),
                              ));
                        },
                      ),
                    ),
    );
  }
}

class _ShopTile extends StatelessWidget {
  final ZShop shop;
  final VoidCallback onTap;
  const _ShopTile({required this.shop, required this.onTap});

  Color _accent() {
    try {
      return Color(int.parse(shop.accent.replaceFirst('#', '0xFF')));
    } catch (_) {
      return ZColors.sage600;
    }
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: ZColors.stone200),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: _accent(), borderRadius: BorderRadius.circular(10)),
            alignment: Alignment.center,
            child: Text(shop.name.isNotEmpty ? shop.name[0] : '?', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(shop.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
              const SizedBox(height: 2),
              Text(shop.tagline.isNotEmpty ? shop.tagline : shop.city,
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: ZColors.stone500, fontSize: 12.5)),
            ]),
          ),
          const Icon(Icons.chevron_right, color: ZColors.stone300),
        ]),
      ),
    );
  }
}
