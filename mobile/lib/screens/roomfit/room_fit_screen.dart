import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../services/services.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/product_image.dart';
import '../auth/login_screen.dart';

/// FR-03/FR-04/FR-05: Room Photo Upload, AI Room Analysis, AI Furniture
/// Placement — takes/picks a room photo, sends it to
/// /api/rooms/analyze (Claude vision + the documented matching
/// formula), and shows ranked, purchasable recommendations.
class RoomFitScreen extends StatefulWidget {
  const RoomFitScreen({super.key});

  @override
  State<RoomFitScreen> createState() => _RoomFitScreenState();
}

class _RoomFitScreenState extends State<RoomFitScreen> {
  File? _image;
  final _budgetCtrl = TextEditingController();
  bool _busy = false;
  RoomFitResult? _result;
  String? _error;

  Future<void> _pickImage(ImageSource source) async {
    final picked = await ImagePicker().pickImage(source: source, maxWidth: 1600, imageQuality: 85);
    if (picked == null) return;
    setState(() { _image = File(picked.path); _result = null; _error = null; });
  }

  String _mediaType(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    return 'image/jpeg';
  }

  Future<void> _analyze() async {
    final auth = context.read<AuthProvider>();
    if (auth.status != AuthStatus.signedIn) {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
      return;
    }
    if (_image == null) return;
    setState(() { _busy = true; _error = null; _result = null; });
    try {
      final bytes = await _image!.readAsBytes();
      final budget = double.tryParse(_budgetCtrl.text.trim());
      final api = await ApiClient.instance();
      final result = await RoomFitService(api).analyze(imageBytes: bytes, mediaType: _mediaType(_image!.path), budget: budget);
      if (!mounted) return;
      setState(() => _result = result);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Room-Fit')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Photograph your room and get AI-ranked furniture suggestions sized and styled for it.',
            style: TextStyle(color: ZColors.stone600),
          ),
          const SizedBox(height: 16),
          AspectRatio(
            aspectRatio: 4 / 3,
            child: Container(
              decoration: BoxDecoration(color: ZColors.stone100, borderRadius: BorderRadius.circular(12)),
              clipBehavior: Clip.antiAlias,
              child: _image == null
                  ? const Center(child: Icon(Icons.camera_alt_outlined, size: 40, color: ZColors.stone300))
                  : Image.file(_image!, fit: BoxFit.cover),
            ),
          ),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: OutlinedButton.icon(onPressed: () => _pickImage(ImageSource.camera), icon: const Icon(Icons.camera_alt_outlined), label: const Text('Camera'))),
            const SizedBox(width: 10),
            Expanded(child: OutlinedButton.icon(onPressed: () => _pickImage(ImageSource.gallery), icon: const Icon(Icons.photo_outlined), label: const Text('Gallery'))),
          ]),
          const SizedBox(height: 12),
          TextField(
            controller: _budgetCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Budget in JD (optional)'),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: (_image == null || _busy) ? null : _analyze,
            child: _busy
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Analyze room'),
          ),
          const SizedBox(height: 20),
          if (_error != null) ErrorBanner(message: _error!),
          if (_result != null) _ResultView(result: _result!),
        ],
      ),
    );
  }
}

class _ResultView extends StatelessWidget {
  final RoomFitResult result;
  const _ResultView({required this.result});

  @override
  Widget build(BuildContext context) {
    if (result.lowConfidence) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: const Color(0xFFFFFBEB), borderRadius: BorderRadius.circular(10)),
        child: Text(result.message ?? "This photo couldn't be analyzed confidently.", style: const TextStyle(color: Color(0xFFB45309))),
      );
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Wrap(spacing: 6, runSpacing: 6, children: [
        _Chip('${result.roomType}'),
        for (final t in result.styleTags) _Chip(t),
        for (final c in result.palette) _Chip(c),
      ]),
      const SizedBox(height: 16),
      const Text('Recommended for your room', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
      const SizedBox(height: 10),
      for (final rec in result.recommendations) _RecommendationTile(rec: rec),
    ]);
  }
}

class _Chip extends StatelessWidget {
  final String label;
  const _Chip(this.label);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: ZColors.sage100, borderRadius: BorderRadius.circular(999)),
      child: Text(label, style: const TextStyle(fontSize: 11, color: ZColors.sage800)),
    );
  }
}

class _RecommendationTile extends StatelessWidget {
  final ZRecommendation rec;
  const _RecommendationTile({required this.rec});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: Colors.white, border: Border.all(color: ZColors.stone200), borderRadius: BorderRadius.circular(12)),
      child: Row(children: [
        ClipRRect(borderRadius: BorderRadius.circular(8), child: ProductImage(path: rec.product.image, width: 56, height: 56)),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Expanded(child: Text(rec.product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
              Text('${(rec.matchScore * 100).round()}% match', style: const TextStyle(fontSize: 11, color: ZColors.sage700, fontWeight: FontWeight.w600)),
            ]),
            Text(rec.shopName, style: const TextStyle(fontSize: 11, color: ZColors.stone500)),
            Text(rec.reason, style: const TextStyle(fontSize: 11, color: ZColors.stone600), maxLines: 2, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 4),
            Text(formatJD(rec.product.price), style: const TextStyle(fontWeight: FontWeight.w700, color: ZColors.sage700, fontSize: 13)),
          ]),
        ),
        IconButton(
          icon: const Icon(Icons.add_shopping_cart_outlined),
          onPressed: () {
            context.read<CartProvider>().add(CartLine(
                  productId: rec.product.id,
                  name: rec.product.name,
                  price: rec.product.price,
                  image: rec.product.image,
                  shopId: rec.product.shopId,
                  shopName: rec.shopName,
                ));
            showSnack(context, 'Added to cart');
          },
        ),
      ]),
    );
  }
}
