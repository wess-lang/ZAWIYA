import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../models/models.dart';
import '../../services/services.dart';
import '../../theme.dart';
import '../../widgets/common.dart';

/// FR-15: Admin Shop Approval.
class AdminShopsScreen extends StatefulWidget {
  const AdminShopsScreen({super.key});

  @override
  State<AdminShopsScreen> createState() => _AdminShopsScreenState();
}

class _AdminShopsScreenState extends State<AdminShopsScreen> {
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
      final shops = await ShopService(api).listAdminShops();
      if (!mounted) return;
      setState(() { _shops = shops; _error = null; });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  Future<void> _approve(ZShop shop) async {
    try {
      final api = await ApiClient.instance();
      await ShopService(api).setApproval(shop.id, approve: true);
      _load();
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), isError: true);
    }
  }

  Future<void> _reject(ZShop shop) async {
    final reasonCtrl = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reject shop'),
        content: TextField(controller: reasonCtrl, decoration: const InputDecoration(labelText: 'Reason (optional)')),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Reject', style: TextStyle(color: ZColors.red))),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      final api = await ApiClient.instance();
      await ShopService(api).setApproval(shop.id, approve: false, reason: reasonCtrl.text.trim());
      _load();
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Shop approvals')),
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
                          return Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(color: Colors.white, border: Border.all(color: ZColors.stone200), borderRadius: BorderRadius.circular(12)),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                                Expanded(
                                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(s.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                                    Text('${s.ownerName ?? 'Unknown'} · ${s.city}', style: const TextStyle(fontSize: 12, color: ZColors.stone500)),
                                  ]),
                                ),
                                Text(s.status, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                              ]),
                              if (s.status == 'pending') Padding(
                                padding: const EdgeInsets.only(top: 10),
                                child: Row(children: [
                                  Expanded(child: ElevatedButton(onPressed: () => _approve(s), child: const Text('Approve'))),
                                  const SizedBox(width: 10),
                                  Expanded(child: OutlinedButton(onPressed: () => _reject(s), child: const Text('Reject'))),
                                ]),
                              ),
                              if (s.status == 'rejected' && s.rejectionReason != null) Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Text('Reason: ${s.rejectionReason}', style: const TextStyle(fontSize: 12, color: ZColors.red)),
                              ),
                            ]),
                          );
                        },
                      ),
                    ),
    );
  }
}
