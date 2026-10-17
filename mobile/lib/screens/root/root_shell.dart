import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/cart_provider.dart';
import '../../theme.dart';
import '../account/account_screen.dart';
import '../cart/cart_screen.dart';
import '../roomfit/room_fit_screen.dart';
import '../shop/shop_browse_screen.dart';
import '../shop/shops_directory_screen.dart';

/// Bottom-nav shell for the signed-in-or-not main app, mirroring the
/// web app's top nav: Shop (combined catalogue), Shops (vendor
/// directory), Room-Fit, Cart, Account.
class RootShell extends StatefulWidget {
  const RootShell({super.key});

  @override
  State<RootShell> createState() => _RootShellState();
}

class _RootShellState extends State<RootShell> {
  int _index = 0;

  static const _screens = [
    ShopBrowseScreen(),
    ShopsDirectoryScreen(),
    RoomFitScreen(),
    CartScreen(),
    AccountScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final cartCount = context.watch<CartProvider>().count;
    return Scaffold(
      body: IndexedStack(index: _index, children: _screens),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        items: [
          const BottomNavigationBarItem(icon: Icon(Icons.chair_outlined), label: 'Shop'),
          const BottomNavigationBarItem(icon: Icon(Icons.storefront_outlined), label: 'Shops'),
          const BottomNavigationBarItem(icon: Icon(Icons.camera_alt_outlined), label: 'Room-Fit'),
          BottomNavigationBarItem(
            icon: Badge(
              label: Text('$cartCount'),
              isLabelVisible: cartCount > 0,
              backgroundColor: ZColors.sage600,
              child: const Icon(Icons.shopping_cart_outlined),
            ),
            label: 'Cart',
          ),
          const BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Account'),
        ],
      ),
    );
  }
}
