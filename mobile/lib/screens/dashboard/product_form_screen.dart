import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../models/models.dart';
import '../../services/services.dart';
import '../../widgets/common.dart';

/// FR-13: create or edit a single product for one of the owner's shops.
class ProductFormScreen extends StatefulWidget {
  final String shopId;
  final ZProduct? existing;
  const ProductFormScreen({super.key, required this.shopId, this.existing});

  @override
  State<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends State<ProductFormScreen> {
  late final _nameCtrl = TextEditingController(text: widget.existing?.name ?? '');
  late final _priceCtrl = TextEditingController(text: widget.existing?.price.toString() ?? '');
  late final _stockCtrl = TextEditingController(text: widget.existing?.stock.toString() ?? '0');
  late final _dimensionsCtrl = TextEditingController(text: widget.existing?.dimensions ?? '');
  late final _descriptionCtrl = TextEditingController(text: widget.existing?.description ?? '');
  late final _imageCtrl = TextEditingController(text: widget.existing?.image ?? '');
  late final _styleTagsCtrl = TextEditingController(text: widget.existing?.styleTags.join(', ') ?? '');
  late final _colorTagsCtrl = TextEditingController(text: widget.existing?.colorTags.join(', ') ?? '');
  late String _category = widget.existing?.category ?? kCategories.first;
  bool _busy = false;
  String? _error;

  bool get _editing => widget.existing != null;

  List<String> _splitTags(String s) => s.split(',').map((t) => t.trim()).where((t) => t.isNotEmpty).toList();

  Future<void> _submit() async {
    final price = double.tryParse(_priceCtrl.text.trim());
    if (_nameCtrl.text.trim().isEmpty || price == null) {
      setState(() => _error = 'Name and a valid price are required.');
      return;
    }
    setState(() { _busy = true; _error = null; });
    final body = {
      'shopId': widget.shopId,
      'name': _nameCtrl.text.trim(),
      'category': _category,
      'price': price,
      'stock': int.tryParse(_stockCtrl.text.trim()) ?? 0,
      'dimensions': _dimensionsCtrl.text.trim(),
      'description': _descriptionCtrl.text.trim(),
      'image': _imageCtrl.text.trim(),
      'styleTags': _splitTags(_styleTagsCtrl.text),
      'colorTags': _splitTags(_colorTagsCtrl.text),
    };
    try {
      final api = await ApiClient.instance();
      final service = CatalogService(api);
      if (_editing) {
        await service.updateProduct(widget.existing!.id, body);
      } else {
        await service.createProduct(body);
      }
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_editing ? 'Edit product' : 'New product')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_error != null) ErrorBanner(message: _error!),
          TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Name')),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _category,
            decoration: const InputDecoration(labelText: 'Category'),
            items: [for (final c in kCategories) DropdownMenuItem(value: c, child: Text(kCategoryLabels[c]!))],
            onChanged: (v) => setState(() => _category = v!),
          ),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: TextField(controller: _priceCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Price (JD)'))),
            const SizedBox(width: 12),
            Expanded(child: TextField(controller: _stockCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Stock'))),
          ]),
          const SizedBox(height: 12),
          TextField(controller: _dimensionsCtrl, decoration: const InputDecoration(labelText: 'Dimensions (optional)')),
          const SizedBox(height: 12),
          TextField(controller: _descriptionCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Description')),
          const SizedBox(height: 12),
          TextField(controller: _styleTagsCtrl, decoration: const InputDecoration(labelText: 'Style tags (comma separated)')),
          const SizedBox(height: 12),
          TextField(controller: _colorTagsCtrl, decoration: const InputDecoration(labelText: 'Color tags (comma separated)')),
          const SizedBox(height: 12),
          TextField(controller: _imageCtrl, decoration: const InputDecoration(labelText: 'Image URL (optional — leave blank to auto-generate)')),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(_editing ? 'Save changes' : 'Create product'),
          ),
        ],
      ),
    );
  }
}
