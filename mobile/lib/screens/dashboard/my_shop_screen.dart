import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../services/services.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import 'shop_orders_screen.dart';
import 'shop_products_screen.dart';

/// FR-13/FR-14 entry point — mirrors src/app/dashboard/page.tsx: lists
/// the signed-in user's own shop(s), any status, with links into
/// Products/Orders once a shop is active.
class MyShopScreen extends StatefulWidget {
  const MyShopScreen({super.key});

  @override
  State<MyShopScreen> createState() => _MyShopScreenState();
}

class _MyShopScreenState extends State<MyShopScreen> {
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
      final shops = await ShopService(api).listMyShops();
      if (!mounted) return;
      setState(() { _shops = shops; _error = null; });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  Future<void> _createShop() async {
    final nameCtrl = TextEditingController();
    final taglineCtrl = TextEditingController();
    final cityCtrl = TextEditingController();
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('List your shop', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
          const SizedBox(height: 12),
          TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Shop name')),
          const SizedBox(height: 10),
          TextField(controller: taglineCtrl, decoration: const InputDecoration(labelText: 'Tagline (optional)')),
          const SizedBox(height: 10),
          TextField(controller: cityCtrl, decoration: const InputDecoration(labelText: 'City')),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Submit for approval')),
          const SizedBox(height: 20),
        ]),
      ),
    );
    if (saved != true) return;
    if (nameCtrl.text.trim().isEmpty || cityCtrl.text.trim().isEmpty) {
      if (mounted) showSnack(context, 'Shop name and city are required.', isError: true);
      return;
    }
    try {
      final api = await ApiClient.instance();
      await ShopService(api).createShop(name: nameCtrl.text.trim(), tagline: taglineCtrl.text.trim(), city: cityCtrl.text.trim());
      if (!mounted) return;
      await context.read<AuthProvider>().refresh();
      if (!mounted) return;
      _load();
      showSnack(context, 'Shop submitted for admin approval.');
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Shop Dashboard')),
      body: _error != null
          ? Padding(padding: const EdgeInsets.all(24), child: ErrorBanner(message: _error!))
          : _shops == null
              ? const Center(child: CircularProgressIndicator())
              : _shops!.isEmpty
                  ? EmptyState(
                      icon: Icons.storefront_outlined,
                      title: "You don't have a shop yet",
                      action: ElevatedButton(onPressed: _createShop, child: const Text('List a shop')),
                    )
                  : ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        for (final shop in _shops!) _ShopCard(shop: shop),
                        const SizedBox(height: 8),
                        OutlinedButton(onPressed: _createShop, child: const Text('List another shop')),
                      ],
                    ),
    );
  }
}

class _ShopCard extends StatelessWidget {
  final ZShop shop;
  const _ShopCard({required this.shop});

  Color _statusBg() => switch (shop.status) {
        'active' => ZColors.sage50,
        'pending' => const Color(0xFFFFFBEB),
        _ => const Color(0xFFFEF2F2),
      };
  Color _statusFg() => switch (shop.status) {
        'active' => ZColors.sage700,
        'pending' => const Color(0xFFB45309),
        _ => ZColors.red,
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, border: Border.all(color: ZColors.stone200), borderRadius: BorderRadius.circular(12)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(shop.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              Text(shop.city, style: const TextStyle(fontSize: 12, color: ZColors.stone500)),
            ]),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: _statusBg(), borderRadius: BorderRadius.circular(999)),
            child: Text(shop.status, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: _statusFg())),
          ),
        ]),
        if (shop.status == 'rejected' && shop.rejectionReason != null) Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text('Reason: ${shop.rejectionReason}', style: const TextStyle(fontSize: 12, color: ZColors.red)),
        ),
        if (shop.status == 'pending') const Padding(
          padding: EdgeInsets.only(top: 8),
          child: Text('Waiting on administrator approval before this shop goes live.', style: TextStyle(fontSize: 12, color: ZColors.stone500)),
        ),
        if (shop.status == 'active') Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Wrap(spacing: 10, runSpacing: 8, children: [
            OutlinedButton(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ShopProductsScreen(shop: shop))),
              child: Text('Products (${shop.productCount ?? 0})'),
            ),
            OutlinedButton(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ShopOrdersScreen(shop: shop))),
              child: Text((shop.pendingOrders ?? 0) > 0 ? 'Orders (${shop.pendingOrders} new)' : 'Orders'),
            ),
          ]),
        ),
      ]),
    );
  }
}
