import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../models/models.dart';
import '../../providers/cart_provider.dart';
import '../../services/services.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../orders/order_detail_screen.dart';

/// FR-09/FR-10: payment method selection and order splitting — the
/// server (/api/orders/checkout) splits the cart into one SubOrder per
/// shop automatically; this screen just collects address + payment.
class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  List<ZAddress>? _addresses;
  String? _selectedAddressId;
  String _paymentMethod = 'cod';
  bool _placing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    try {
      final api = await ApiClient.instance();
      final addresses = await AddressService(api).list();
      if (!mounted) return;
      setState(() {
        _addresses = addresses;
        _selectedAddressId = addresses.isNotEmpty ? addresses.first.id : null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  Future<void> _addAddress() async {
    final labelCtrl = TextEditingController();
    final cityCtrl = TextEditingController();
    final detailsCtrl = TextEditingController();
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('New address', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
          const SizedBox(height: 12),
          TextField(controller: labelCtrl, decoration: const InputDecoration(labelText: 'Label (e.g. Home)')),
          const SizedBox(height: 10),
          TextField(controller: cityCtrl, decoration: const InputDecoration(labelText: 'City')),
          const SizedBox(height: 10),
          TextField(controller: detailsCtrl, decoration: const InputDecoration(labelText: 'Street / building details'), maxLines: 2),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Save address')),
          const SizedBox(height: 20),
        ]),
      ),
    );
    if (saved != true) return;
    if (labelCtrl.text.trim().isEmpty || cityCtrl.text.trim().isEmpty || detailsCtrl.text.trim().isEmpty) {
      if (mounted) showSnack(context, 'Label, city, and details are required.', isError: true);
      return;
    }
    try {
      final api = await ApiClient.instance();
      final address = await AddressService(api).create(label: labelCtrl.text.trim(), city: cityCtrl.text.trim(), details: detailsCtrl.text.trim());
      if (!mounted) return;
      setState(() {
        _addresses = [...(_addresses ?? []), address];
        _selectedAddressId = address.id;
      });
    } catch (e) {
      if (!mounted) return;
      showSnack(context, e.toString(), isError: true);
    }
  }

  Future<void> _placeOrder() async {
    final cart = context.read<CartProvider>();
    if (_selectedAddressId == null) {
      showSnack(context, 'Add a delivery address first.', isError: true);
      return;
    }
    setState(() { _placing = true; _error = null; });
    try {
      final api = await ApiClient.instance();
      final order = await OrderService(api).checkout(
        addressId: _selectedAddressId!,
        paymentMethod: _paymentMethod,
        lines: cart.lines.map((l) => {'productId': l.productId, 'qty': l.qty}).toList(),
      );
      cart.clear();
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => OrderDetailScreen(order: order)));
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = e.toString(); });
    } finally {
      if (mounted) setState(() => _placing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_error != null) ErrorBanner(message: _error!),
          const Text('Delivery address', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          const SizedBox(height: 8),
          if (_addresses == null)
            const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: CircularProgressIndicator())
          else if (_addresses!.isEmpty)
            const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Text('No saved addresses yet.', style: TextStyle(color: ZColors.stone500)))
          else
            for (final a in _addresses!)
              RadioListTile<String>(
                value: a.id,
                groupValue: _selectedAddressId,
                onChanged: (v) => setState(() => _selectedAddressId = v),
                contentPadding: EdgeInsets.zero,
                title: Text(a.label, style: const TextStyle(fontWeight: FontWeight.w500)),
                subtitle: Text('${a.details}, ${a.city}'),
              ),
          Align(alignment: Alignment.centerLeft, child: TextButton(onPressed: _addAddress, child: const Text('+ Add new address'))),
          const SizedBox(height: 16),
          const Text('Payment method', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          RadioListTile<String>(value: 'cod', groupValue: _paymentMethod, title: const Text('Cash on delivery'), contentPadding: EdgeInsets.zero, onChanged: (v) => setState(() => _paymentMethod = v!)),
          RadioListTile<String>(value: 'cliq', groupValue: _paymentMethod, title: const Text('CliQ'), contentPadding: EdgeInsets.zero, onChanged: (v) => setState(() => _paymentMethod = v!)),
          RadioListTile<String>(value: 'card', groupValue: _paymentMethod, title: const Text('Card'), contentPadding: EdgeInsets.zero, onChanged: (v) => setState(() => _paymentMethod = v!)),
          const SizedBox(height: 16),
          const Text('Order summary', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          const SizedBox(height: 8),
          for (final entry in cart.linesByShop.entries)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Text('${entry.value.first.shopName} (${entry.value.fold(0, (s, l) => s + l.qty)} items)', style: const TextStyle(fontSize: 13)),
                Text(formatJD(entry.value.fold(0.0, (s, l) => s + l.price * l.qty)), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              ]),
            ),
          const Divider(height: 24),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Total', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            Text(formatJD(cart.total), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: ZColors.sage700)),
          ]),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _placing ? null : _placeOrder,
            child: _placing
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Place order'),
          ),
        ],
      ),
    );
  }
}
