import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../models/models.dart';
import '../../services/services.dart';
import '../../theme.dart';
import '../../widgets/common.dart';

/// FR-02: Profile & Address Management.
class AddressesScreen extends StatefulWidget {
  const AddressesScreen({super.key});

  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  List<ZAddress>? _addresses;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = await ApiClient.instance();
      final addresses = await AddressService(api).list();
      if (!mounted) return;
      setState(() { _addresses = addresses; _error = null; });
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
      await AddressService(api).create(label: labelCtrl.text.trim(), city: cityCtrl.text.trim(), details: detailsCtrl.text.trim());
      _load();
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Delivery addresses')),
      floatingActionButton: FloatingActionButton(onPressed: _addAddress, child: const Icon(Icons.add)),
      body: _error != null
          ? Padding(padding: const EdgeInsets.all(24), child: ErrorBanner(message: _error!))
          : _addresses == null
              ? const Center(child: CircularProgressIndicator())
              : _addresses!.isEmpty
                  ? const EmptyState(icon: Icons.location_on_outlined, title: 'No addresses saved yet')
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _addresses!.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, i) {
                        final a = _addresses![i];
                        return Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(color: Colors.white, border: Border.all(color: ZColors.stone200), borderRadius: BorderRadius.circular(12)),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(a.label, style: const TextStyle(fontWeight: FontWeight.w600)),
                            const SizedBox(height: 2),
                            Text('${a.details}, ${a.city}', style: const TextStyle(color: ZColors.stone600, fontSize: 13)),
                          ]),
                        );
                      },
                    ),
    );
  }
}
