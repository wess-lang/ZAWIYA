import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../config.dart';
import '../theme.dart';

/// Product photos are generated SVG illustrations
/// (src/lib/productArt.ts), served as a static asset path like
/// "/products/<id>.svg". Falls back to a plain network image for any
/// future real photography (the dashboard's "Image URL" field lets a
/// shop owner set a real raster URL instead).
class ProductImage extends StatelessWidget {
  final String path;
  final double? width;
  final double? height;
  final BoxFit fit;

  const ProductImage({super.key, required this.path, this.width, this.height, this.fit = BoxFit.cover});

  @override
  Widget build(BuildContext context) {
    if (path.isEmpty) return _placeholder();
    final url = AppConfig.asset(path);
    if (url.toLowerCase().endsWith('.svg')) {
      return SvgPicture.network(
        url,
        width: width,
        height: height,
        fit: fit,
        placeholderBuilder: (_) => _placeholder(),
      );
    }
    return Image.network(
      url,
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (_, __, ___) => _placeholder(),
      loadingBuilder: (context, child, progress) => progress == null ? child : _placeholder(),
    );
  }

  Widget _placeholder() => Container(
        width: width,
        height: height,
        color: ZColors.stone100,
        alignment: Alignment.center,
        child: const Icon(Icons.chair_outlined, color: ZColors.stone300, size: 32),
      );
}
