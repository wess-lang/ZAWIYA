import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/product_image.dart';
import '../auth/login_screen.dart';
import '../checkout/checkout_screen.dart';

/// FR-08: Multi-Shop Cart — grouped by shop, same as the web app's cart.
class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Cart')),
      body: cart.lines.isEmpty
          ? const EmptyState(icon: Icons.shopping_cart_outlined, title: 'Your cart is empty', subtitle: 'Browse the shop to add furniture.')
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                for (final entry in cart.linesByShop.entries) _ShopGroup(shopId: entry.key, lines: entry.value),
              ],
            ),
      bottomNavigationBar: cart.lines.isEmpty
          ? null
          : SafeArea(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(top: BorderSide(color: ZColors.stone200)),
                ),
                child: Row(children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Total', style: TextStyle(color: ZColors.stone500, fontSize: 12)),
                      Text(formatJD(cart.total), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                    ]),
                  ),
                  ElevatedButton(
                    onPressed: () {
                      if (auth.status != AuthStatus.signedIn) {
                        Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
                        return;
                      }
                      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CheckoutScreen()));
                    },
                    child: const Text('Checkout'),
                  ),
                ]),
              ),
            ),
    );
  }
}

class _ShopGroup extends StatelessWidget {
  final String shopId;
  final List<CartLine> lines;
  const _ShopGroup({required this.shopId, required this.lines});

  @override
  Widget build(BuildContext context) {
    final subtotal = lines.fold(0.0, (sum, l) => sum + l.price * l.qty);
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ZColors.stone200),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 6),
          child: Text(lines.first.shopName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: ZColors.stone600)),
        ),
        for (final line in lines) _CartLineRow(line: line),
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 6, 14, 12),
          child: Align(
            alignment: Alignment.centerRight,
            child: Text('Subtotal: ${formatJD(subtotal)}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          ),
        ),
      ]),
    );
  }
}

class _CartLineRow extends StatelessWidget {
  final CartLine line;
  const _CartLineRow({required this.line});

  @override
  Widget build(BuildContext context) {
    final cart = context.read<CartProvider>();
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      child: Row(children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: ProductImage(path: line.image, width: 52, height: 52),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(line.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
            Text(formatJD(line.price), style: const TextStyle(fontSize: 12, color: ZColors.stone500)),
          ]),
        ),
        Row(children: [
          IconButton(icon: const Icon(Icons.remove_circle_outline, size: 20), onPressed: () => cart.setQty(line.productId, line.qty - 1)),
          Text('${line.qty}', style: const TextStyle(fontWeight: FontWeight.w600)),
          IconButton(icon: const Icon(Icons.add_circle_outline, size: 20), onPressed: () => cart.setQty(line.productId, line.qty + 1)),
        ]),
        IconButton(icon: const Icon(Icons.delete_outline, size: 20, color: ZColors.red), onPressed: () => cart.remove(line.productId)),
      ]),
    );
  }
}
