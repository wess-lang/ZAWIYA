import 'db.dart';

/// Port of zawiyaCatalogAdapter.ts — deterministic keyword/tag matching
/// against the real catalogue (same approach src/lib/recommend.ts and
/// the TS adapter both use; no embedding index behind this JSON store).

const _categoryLabels = {
  'sofa': 'Sofas & Seating',
  'bed': 'Beds & Bedroom',
  'dining': 'Dining',
  'chair': 'Chairs',
  'storage': 'Storage',
  'lighting': 'Lighting',
  'outdoor': 'Outdoor',
  'decor': 'Decor',
  'office': 'Office',
};
final _validCategories = _categoryLabels.keys.toSet();

const _categoryKeywords = {
  'sofa': ['sofa', 'couch', 'sectional', 'loveseat'],
  'bed': ['bed', 'mattress', 'headboard', 'bedframe'],
  'dining': ['dining', 'dinner table', 'table'],
  'chair': ['chair', 'armchair', 'accent chair', 'stool'],
  'storage': ['storage', 'cabinet', 'shelf', 'shelving', 'bookcase', 'wardrobe', 'dresser', 'closet'],
  'lighting': ['light', 'lamp', 'lighting', 'chandelier', 'sconce'],
  'outdoor': ['outdoor', 'patio', 'garden', 'balcony'],
  'decor': ['decor', 'rug', 'mirror', 'art', 'vase', 'cushion', 'curtain'],
  'office': ['office', 'desk', 'office chair'],
};

const realPhotoPrefix = '/products/real/';

String? _guessCategoryByKeyword(String text) {
  final needle = text.toLowerCase();
  for (final entry in _categoryKeywords.entries) {
    if (entry.value.any((kw) => needle.contains(kw))) return entry.key;
  }
  return null;
}

String? _resolveCategory(String text) {
  if (_validCategories.contains(text)) return text;
  return _guessCategoryByKeyword(text);
}

List<String> _tokenize(String text) {
  return text
      .toLowerCase()
      .split(RegExp(r'[^a-z0-9]+'))
      .where((t) => t.length > 1)
      .toList();
}

double _scoreProduct(Map<String, dynamic> product, List<String> queryTokens, String? impliedCategory) {
  final haystack = ([
    product['name'],
    product['description'],
    ...((product['styleTags'] as List?) ?? []),
    ...((product['colorTags'] as List?) ?? []),
    ...((product['roomTags'] as List?) ?? []),
  ].join(' ')).toLowerCase();

  if (queryTokens.isEmpty) return 0;
  var hits = 0;
  for (final token in queryTokens) {
    if (haystack.contains(token)) hits++;
  }
  var score = hits / queryTokens.length;

  if (impliedCategory != null) {
    score = product['category'] == impliedCategory ? score * 0.5 + 0.5 : score * 0.5;
  }
  return score.clamp(0.0, 1.0);
}

class CatalogMatch {
  final String productId;
  final double score;
  final String category;
  CatalogMatch(this.productId, this.score, this.category);
}

/// Only products with a real photo can ever be returned — the
/// compositing step needs an actual photo to place into the room.
List<CatalogMatch> searchZawiyaPartnerCatalog(String query, {String? category, int limit = 5}) {
  final db = readDb();
  final activeShopIds =
      listOf(db, 'shops').where((s) => s['status'] == 'active').map((s) => s['id'] as String).toSet();

  final explicitCategory = category != null ? _resolveCategory(category) : null;
  final impliedCategory = explicitCategory ?? _resolveCategory(query);
  final queryTokens = _tokenize(query);

  final matches = <CatalogMatch>[];
  for (final product in listOf(db, 'products')) {
    if ((product['stock'] as num) <= 0) continue;
    if (!activeShopIds.contains(product['shopId'])) continue;
    if (!(product['image'] as String).startsWith(realPhotoPrefix)) continue;

    final score = _scoreProduct(product, queryTokens, impliedCategory);
    if (score <= 0) continue;
    matches.add(CatalogMatch(product['id'] as String, score, product['category'] as String));
  }

  matches.sort((a, b) => b.score.compareTo(a.score));
  return matches.take(limit).toList();
}
