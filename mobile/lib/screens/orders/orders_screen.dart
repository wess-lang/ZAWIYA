import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../models/models.dart';
import '../../services/services.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import 'order_detail_screen.dart';

/// FR-11: Order Tracking — the current user's orders, newest first.
class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<ZOrder>? _orders;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = await ApiClient.instance();
      final orders = await OrderService(api).listOrders();
      if (!mounted) return;
      setState(() { _orders = orders; _error = null; });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Your orders')),
      body: _error != null
          ? Padding(padding: const EdgeInsets.all(24), child: ErrorBanner(message: _error!))
          : _orders == null
              ? const Center(child: CircularProgressIndicator())
              : _orders!.isEmpty
                  ? const EmptyState(icon: Icons.receipt_long_outlined, title: 'No orders yet')
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _orders!.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, i) {
                          final o = _orders![i];
                          return _OrderTile(order: o, onTap: () async {
                            await Navigator.of(context).push(MaterialPageRoute(builder: (_) => OrderDetailScreen(order: o)));
                            _load();
                          });
                        },
                      ),
                    ),
    );
  }
}

class _OrderTile extends StatelessWidget {
  final ZOrder order;
  final VoidCallback onTap;
  const _OrderTile({required this.order, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: Colors.white, border: Border.all(color: ZColors.stone200), borderRadius: BorderRadius.circular(12)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('Order #${order.id.substring(order.id.length > 8 ? order.id.length - 8 : 0)}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            Text(formatJD(order.totalAmount), style: const TextStyle(fontWeight: FontWeight.w700, color: ZColors.sage700)),
          ]),
          const SizedBox(height: 8),
          Wrap(spacing: 6, runSpacing: 6, children: [
            for (final s in order.subOrders) SubOrderStatusBadge(status: s.status),
          ]),
          const SizedBox(height: 6),
          Text('${order.subOrders.length} shop${order.subOrders.length == 1 ? '' : 's'} · ${order.createdAt.split('T').first}',
              style: const TextStyle(fontSize: 12, color: ZColors.stone500)),
        ]),
      ),
    );
  }
}
