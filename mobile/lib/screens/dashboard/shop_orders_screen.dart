import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../models/models.dart';
import '../../services/services.dart';
import '../../theme.dart';
import '../../widgets/common.dart';

/// FR-14: Shop Order Management — this shop's sub-orders across every
/// customer order, with status updates.
class ShopOrdersScreen extends StatefulWidget {
  final ZShop shop;
  const ShopOrdersScreen({super.key, required this.shop});

  @override
  State<ShopOrdersScreen> createState() => _ShopOrdersScreenState();
}

class _ShopOrdersScreenState extends State<ShopOrdersScreen> {
  List<ZShopOrderRow>? _rows;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = await ApiClient.instance();
      final rows = await ShopService(api).listShopOrders(widget.shop.id);
      if (!mounted) return;
      setState(() { _rows = rows; _error = null; });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  Future<void> _updateStatus(ZShopOrderRow row) async {
    final selected = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Padding(padding: EdgeInsets.all(16), child: Text('Update status', style: TextStyle(fontWeight: FontWeight.w600))),
          for (final s in [...kSubOrderStatusFlow, 'cancelled'])
            ListTile(
              title: Text(kSubOrderStatusLabels[s]!),
              trailing: s == row.subOrder.status ? const Icon(Icons.check, color: ZColors.sage600) : null,
              onTap: () => Navigator.of(ctx).pop(s),
            ),
        ]),
      ),
    );
    if (selected == null || selected == row.subOrder.status) return;
    try {
      final api = await ApiClient.instance();
      await OrderService(api).updateSubOrderStatus(row.orderId, row.subOrder.id, selected);
      _load();
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('${widget.shop.name} — Orders')),
      body: _error != null
          ? Padding(padding: const EdgeInsets.all(24), child: ErrorBanner(message: _error!))
          : _rows == null
              ? const Center(child: CircularProgressIndicator())
              : _rows!.isEmpty
                  ? const EmptyState(icon: Icons.receipt_long_outlined, title: 'No orders yet')
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _rows!.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, i) {
                          final row = _rows![i];
                          return InkWell(
                            onTap: () => _updateStatus(row),
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(color: Colors.white, border: Border.all(color: ZColors.stone200), borderRadius: BorderRadius.circular(12)),
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                                  Text(row.customerName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                  SubOrderStatusBadge(status: row.subOrder.status),
                                ]),
                                const SizedBox(height: 4),
                                Text('${row.addressSnapshot.details}, ${row.addressSnapshot.city}', style: const TextStyle(fontSize: 12, color: ZColors.stone500)),
                                const SizedBox(height: 8),
                                for (final item in row.subOrder.items)
                                  Text('${item.productName} × ${item.qty}', style: const TextStyle(fontSize: 12, color: ZColors.stone600)),
                                const SizedBox(height: 6),
                                Align(alignment: Alignment.centerRight, child: Text(formatJD(row.subOrder.subtotal), style: const TextStyle(fontWeight: FontWeight.w700, color: ZColors.sage700))),
                              ]),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
