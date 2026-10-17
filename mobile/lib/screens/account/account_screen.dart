import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../theme.dart';
import '../admin/admin_shops_screen.dart';
import '../auth/login_screen.dart';
import '../auth/register_screen.dart';
import '../dashboard/my_shop_screen.dart';
import '../orders/orders_screen.dart';
import '../wishlist/wishlist_screen.dart';
import 'addresses_screen.dart';
import 'server_settings_screen.dart';

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(title: const Text('Account')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (user == null) ...[
            const Text('Sign in to track orders, save a wishlist, and manage a shop.', style: TextStyle(color: ZColors.stone600)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen())),
              child: const Text('Sign in'),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const RegisterScreen())),
              child: const Text('Create account'),
            ),
          ] else ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.white, border: Border.all(color: ZColors.stone200), borderRadius: BorderRadius.circular(12)),
              child: Row(children: [
                CircleAvatar(backgroundColor: ZColors.sage600, child: Text(user.name.isNotEmpty ? user.name[0].toUpperCase() : '?', style: const TextStyle(color: Colors.white))),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(user.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                    Text(user.email, style: const TextStyle(fontSize: 12, color: ZColors.stone500)),
                    Text(user.role.replaceAll('_', ' '), style: const TextStyle(fontSize: 11, color: ZColors.sage700, fontWeight: FontWeight.w600)),
                  ]),
                ),
              ]),
            ),
            const SizedBox(height: 16),
            _MenuTile(icon: Icons.receipt_long_outlined, label: 'Your orders', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const OrdersScreen()))),
            _MenuTile(icon: Icons.favorite_border, label: 'Wishlist', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const WishlistScreen()))),
            _MenuTile(icon: Icons.location_on_outlined, label: 'Delivery addresses', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AddressesScreen()))),
            _MenuTile(icon: Icons.storefront_outlined, label: user.isShopOwner ? 'Shop dashboard' : 'Become a seller', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MyShopScreen()))),
            if (user.isAdmin)
              _MenuTile(icon: Icons.verified_user_outlined, label: 'Shop approvals', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AdminShopsScreen()))),
            _MenuTile(icon: Icons.dns_outlined, label: 'Server', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ServerSettingsScreen()))),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: () => context.read<AuthProvider>().logout(),
              style: OutlinedButton.styleFrom(foregroundColor: ZColors.red, side: const BorderSide(color: Color(0xFFFECACA))),
              child: const Text('Sign out'),
            ),
          ],
          if (user == null) ...[
            const SizedBox(height: 24),
            _MenuTile(icon: Icons.dns_outlined, label: 'Server', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ServerSettingsScreen()))),
          ],
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _MenuTile({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: ZColors.stone600),
        title: Text(label, style: const TextStyle(fontSize: 14)),
        trailing: const Icon(Icons.chevron_right, color: ZColors.stone300),
        onTap: onTap,
      ),
    );
  }
}
