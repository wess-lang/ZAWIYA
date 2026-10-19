import 'package:flutter/material.dart';

import '../config.dart';
import '../theme.dart';

/// Maps a shop name to a real logo file served from the backend's
/// `/public/brand-logos/` folder. These shops are not actually
/// partnered with this app — see the "Placeholder data" section in the
/// root README. Only shops with a logo file saved appear here —
/// anything else falls back to the plain colour badge automatically,
/// same as if the image request 404s.
const Map<String, String> kShopLogoPaths = {
  'IKEA': '/brand-logos/ikea.png',
  'Ashley Furniture HomeStore': '/brand-logos/ashley-furniture-homestore.png',
  'Marina Home Interiors': '/brand-logos/marina-home-interiors.png',
  'Decoration One': '/brand-logos/decoration-one.png',
  'Shahwan Furniture': '/brand-logos/shahwan-furniture.jpeg',
  'Home Centre': '/brand-logos/home-centre.jpeg',
  'Midas Home & Office Furniture': '/brand-logos/midas-home-office-furniture.jpeg',
};

/// A shop's logo if one is available and loads successfully, otherwise
/// a plain colour badge with the shop's initial — same fallback for a
/// missing mapping, a 404, or a network error, so this never shows a
/// broken-image icon.
class ShopLogo extends StatelessWidget {
  final String shopName;
  final String accentHex;
  final double size;
  final BorderRadius? borderRadius;

  const ShopLogo({
    super.key,
    required this.shopName,
    required this.accentHex,
    this.size = 44,
    this.borderRadius,
  });

  Color get _accent {
    try {
      return Color(int.parse(accentHex.replaceFirst('#', '0xFF')));
    } catch (_) {
      return ZColors.sage600;
    }
  }

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.circular(size * 0.22);
    final path = kShopLogoPaths[shopName];
    if (path == null) return _InitialBadge(shopName: shopName, color: _accent, size: size, borderRadius: radius);

    return ClipRRect(
      borderRadius: radius,
      child: Container(
        width: size,
        height: size,
        color: Colors.white,
        padding: EdgeInsets.all(size * 0.1),
        child: Image.network(
          AppConfig.asset(path),
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => _InitialBadge(shopName: shopName, color: _accent, size: size, borderRadius: radius, padded: false),
        ),
      ),
    );
  }
}

class _InitialBadge extends StatelessWidget {
  final String shopName;
  final Color color;
  final double size;
  final BorderRadius borderRadius;
  final bool padded;

  const _InitialBadge({required this.shopName, required this.color, required this.size, required this.borderRadius, this.padded = true});

  @override
  Widget build(BuildContext context) {
    final badge = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color, borderRadius: borderRadius),
      alignment: Alignment.center,
      child: Text(
        shopName.isNotEmpty ? shopName[0] : '?',
        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: size * 0.4),
      ),
    );
    return badge;
  }
}
