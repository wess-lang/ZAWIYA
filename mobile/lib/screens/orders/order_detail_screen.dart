import 'package:flutter/material.dart';

import '../../models/models.dart';
import '../../theme.dart';
import '../../widgets/common.dart';

/// Per-sub-order status timeline (FR-11), one card per shop in the
/// order — mirrors the web app's order detail view.
class OrderDetailScreen extends StatelessWidget {
  final ZOrder order;
  const OrderDetailScreen({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Order #${order.id.substring(order.id.length > 8 ? order.id.length - 8 : 0)}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, border: Border.all(color: ZColors.stone200), borderRadius: BorderRadius.circular(12)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Deliver to', style: TextStyle(color: ZColors.stone500, fontSize: 12)),
              const SizedBox(height: 2),
              Text('${order.addressSnapshot.label} — ${order.addressSnapshot.details}, ${order.addressSnapshot.city}'),
              const SizedBox(height: 8),
              Text('Payment: ${_paymentLabel(order.paymentMethod)}', style: const TextStyle(fontSize: 13, color: ZColors.stone600)),
            ]),
          ),
          const SizedBox(height: 16),
          for (final sub in order.subOrders) _SubOrderCard(sub: sub),
          const SizedBox(height: 8),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Total', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            Text(formatJD(order.totalAmount), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: ZColors.sage700)),
          ]),
        ],
      ),
    );
  }

  String _paymentLabel(String m) => switch (m) {
        'cod' => 'Cash on delivery',
        'cliq' => 'CliQ',
        'card' => 'Card',
        _ => m,
      };
}

class _SubOrderCard extends StatelessWidget {
  final ZSubOrder sub;
  const _SubOrderCard({required this.sub});

  @override
  Widget build(BuildContext context) {
    final isCancelled = sub.status == 'cancelled';
    final activeIndex = kSubOrderStatusFlow.indexOf(sub.status);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, border: Border.all(color: ZColors.stone200), borderRadius: BorderRadius.circular(12)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(sub.shopName ?? 'Shop', style: const TextStyle(fontWeight: FontWeight.w600)),
          SubOrderStatusBadge(status: sub.status),
        ]),
        const SizedBox(height: 10),
        if (!isCancelled)
          Row(children: [
            for (var i = 0; i < kSubOrderStatusFlow.length; i++) ...[
              Expanded(
                child: Container(
                  height: 4,
                  decoration: BoxDecoration(
                    color: i <= activeIndex ? ZColors.sage600 : ZColors.stone200,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              if (i != kSubOrderStatusFlow.length - 1) const SizedBox(width: 3),
            ],
          ]),
        const SizedBox(height: 10),
        for (final item in sub.items)
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Expanded(child: Text('${item.productName} × ${item.qty}', style: const TextStyle(fontSize: 13))),
              Text(formatJD(item.unitPrice * item.qty), style: const TextStyle(fontSize: 13)),
            ]),
          ),
        const Divider(height: 16),
        Align(
          alignment: Alignment.centerRight,
          child: Text('Subtotal: ${formatJD(sub.subtotal)}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        ),
      ]),
    );
  }
}
