import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

import 'env.dart';

import 'catalog_adapter.dart';

/// Dart port of RoomVisionService.ts — same prompt, same schema, same
/// model-fallback/retry logic, same spatial-coherence enforcement —
/// calling Gemini's REST API directly (no official Dart SDK exists,
/// so this talks to generativelanguage.googleapis.com the same way
/// @google/genai does under the hood).

const _allowedMimeTypes = {'image/jpeg', 'image/png', 'image/webp'};
const _maxImageBytes = 8 * 1024 * 1024;
const _visionTimeout = Duration(seconds: 30);
const _retryBaseDelayMs = 500;
const _matchConfidenceThreshold = 0.6;
const _fallbackConfidenceThreshold = 0.45;
const _lowConfidenceThreshold = 0.45;
const _minRoomOverlapRatio = 0.5;
const _maxSpaceOverlapRatio = 0.25;

const _refusalFinishReasons = {'SAFETY', 'RECITATION', 'LANGUAGE', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'OTHER'};

const _defaultModelFallbacks = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];
const _retriesPerModel = 1;

const _categoryVocabulary = ['sofa', 'bed', 'dining', 'chair', 'storage', 'lighting', 'outdoor', 'decor', 'office'];

final _boundingBoxSchema = {
  'type': 'OBJECT',
  'description': "Your best visual estimate of this space's position, as fractions (0-1) of image width/height — not pixel coordinates.",
  'properties': {
    'x': {'type': 'NUMBER'},
    'y': {'type': 'NUMBER'},
    'width': {'type': 'NUMBER'},
    'height': {'type': 'NUMBER'},
  },
  'required': ['x', 'y', 'width', 'height'],
};

Map<String, dynamic> _detectedSpaceSchema() => {
      'type': 'OBJECT',
      'properties': {
        'description': {
          'type': 'STRING',
          'description': "short human-readable label naming where this space is, e.g. 'empty corner by the window'",
        },
        'category': {
          'type': 'STRING',
          'format': 'enum',
          'enum': _categoryVocabulary,
          'description': 'the single closest category from this exact list — pick the nearest real match even if imperfect',
        },
        'search_query': {
          'type': 'STRING',
          'description':
              "a short, generic retail search phrase for this spot (2-4 words, e.g. 'grey fabric sofa', 'oak floor lamp') — the kind of phrase a furniture store's own search bar would match, not a full sentence",
        },
        'orientation': {
          'type': 'STRING',
          'description':
              "which way this piece should face once placed, the way a person actually arranging furniture would decide — e.g. 'facing into the room, back against the wall', 'angled toward the seating area for conversation', 'facing the window', 'aligned square with the wall behind it, front toward the walkway'. Base this on the room's real perspective and what's already in it (face seating toward a TV or the room's open centre, not into a corner; keep a reading lamp upright beside where someone would sit; keep a desk's front edge facing into the room, not against the wall it already meets at the side).",
        },
        'bounding_box': _boundingBoxSchema,
      },
      'required': ['description', 'category', 'search_query', 'orientation', 'bounding_box'],
    };

final _analysisSchema = {
  'type': 'OBJECT',
  'properties': {
    'room_type': {'type': 'STRING', 'description': 'e.g. living room, bedroom, dining room, office, outdoor, entryway'},
    'confidence': {
      'type': 'NUMBER',
      'description':
          '0.0-1.0 confidence that the photo itself was clear enough to analyze reliably (lighting, framing, blur, obstruction). This reflects image quality only — a clear photo with few genuine placement opportunities is still high confidence.',
    },
    'style_tags': {
      'type': 'ARRAY',
      'items': {'type': 'STRING'},
      'description': "1-4 short tags describing the room's existing décor style.",
    },
    'room_boundary': {
      ..._boundingBoxSchema,
      'description':
          "The overall usable floor/wall extent of the room itself, as fractions (0-1) of image width/height — the visible walls, floor and ceiling that bound the space, not any one piece of furniture. Every detected space must sit inside this region; nothing you suggest should extend past the room's own visible edges (a doorway into another room, a window view outside, or the edge of the photo itself).",
    },
    'detected_spaces': {
      'type': 'ARRAY',
      'description':
          "Every distinct empty area where one piece of furniture or decor could realistically go, chosen and oriented the way an experienced interior designer presenting a full room concept would — spread across different categories (seating, lighting, wall art/decor, storage/console, and more), not just the single most obvious spot. Aim to furnish the whole room: most rooms with genuine wall and floor space to spare can realistically take 4-7 well-chosen pieces across those categories, not just 1-2. Only return a shorter list when the room is genuinely small, already furnished, or has no plausible spot left for another category. Do not suggest furniture that would duplicate a piece already clearly present and adequate in the room. Before finalizing this list, mentally place every suggested item into the room at the same time: none of their bounding boxes should overlap each other, and all of them together should plausibly coexist in the room's actual floor area without being impossibly crowded — if two items in the same category would conflict, keep only the one you're more confident about, but don't let that reduce coverage of the other categories. Empty array if no genuine opportunity exists at all.",
      'items': _detectedSpaceSchema(),
    },
  },
  'required': ['room_type', 'confidence', 'style_tags', 'room_boundary', 'detected_spaces'],
};

const _systemInstruction =
    'You are an experienced interior designer acting as the vision-analysis stage of a furniture '
    "marketplace app's AI Room-Fit feature. A customer has photographed their room and wants to see "
    'it fully furnished and styled — a complete, cohesive room design across multiple categories '
    '(seating, lighting, wall art/decor, storage or a console/stand, and more), not just the single '
    'most obvious missing piece. Think the way a human designer presenting a full room concept would: '
    'read the room first, then furnish it properly. '
    '\n\n'
    '1. READ THE ROOM. Identify its function and its focal point — a TV, a fireplace, a window '
    'with a view, a dining table — and the walkways people actually use to move through it '
    "(doorways, the path between furniture). Identify what's already there and working, so you "
    'never suggest a duplicate of a piece that\'s already adequate. '
    '\n\n'
    "2. FURNISH THE WHOLE ROOM, ACROSS CATEGORIES. Don't stop after finding one good spot — actively "
    'look for a genuine opportunity in each of these categories before moving on, the way a designer '
    'presenting a full room board would: a seating piece (sofa/chair/armchair) near the focal point; '
    'a lighting piece (floor lamp, wall lamp, or pendant) where light is actually needed; wall art or '
    'decor on a bare wall at eye level; and a console, storage piece, or stand against a free wall. '
    "Only skip a category if the room genuinely has no plausible spot for it (e.g. no bare wall for "
    "art, or no floor space for another seat) — don't skip it just to keep the list short. Each spot "
    'still has to be one a human would actually use: no crowding, no blocking a walkway or doorway, '
    "and related to the room's real use — seating within conversation distance of other seating, not "
    'isolated facing a blank wall; a lamp beside where someone would actually sit or read; storage or '
    'a console flush against a wall, not jutting into the walking path; a desk or dining piece with '
    'room to pull a chair out. '
    '\n\n'
    '3. STYLE IT LIKE A PROFESSIONAL — COORDINATE THE PALETTE. Every `search_query` you write across '
    "the whole set of detected spaces should read like it came from one stylist's single moodboard, "
    'not a pile of independent guesses. Before finalizing, look at the colours and materials implied '
    'by every search_query together: pick a small, deliberate palette (e.g. warm neutrals with one '
    'wood tone, or a cool grey-and-black scheme with a single accent colour) and keep every piece\'s '
    'stated colour within that story — complementary or tonal, never a piece that would visually clash '
    'against the others once all of them are in the same photo. A room styled well usually repeats '
    '2-3 colours/materials across its pieces rather than introducing a new, unrelated colour for every '
    "single item. If the room's existing furniture or walls already lean a certain way (warm wood, "
    "cool grey, etc.), let that anchor the palette unless the customer's own stated preference (see "
    'below, when given) says otherwise. '
    '\n\n'
    '4. GET THE ANGLE RIGHT. For every space, decide which way that piece should face once placed — '
    "the single most important thing a human would get right that a careless placement wouldn't: "
    'seating generally faces into the room or toward the focal point, not into a corner; a piece '
    'against a wall sits flush and square with that wall, not at a random angle; a desk\'s working '
    "front faces into the room, not the wall; a floor lamp stands upright near where its light is "
    'actually needed; wall art hangs flat against the wall at eye level. Say this plainly in the '
    "orientation field (e.g. 'facing the window, back against the opposite wall' or 'angled toward "
    "the existing armchair for conversation'). "
    '\n\n'
    "5. RESPECT THE ROOM'S OWN LIMITS. First identify the room's own boundary — its visible walls, "
    'floor and ceiling — and treat that as a hard limit: nothing you suggest may extend past it, '
    'into a doorway to another room, out a window, or off the edge of the photo. '
    '\n\n'
    '6. CHECK THE WHOLE SCENE AT ONCE, not a list of independent guesses: before finalizing, '
    'mentally place every suggested item into the room at the same time and check that none of '
    'them physically overlap and that they could all realistically coexist in the room\'s actual '
    'floor area — a sofa, a desk and a full dining set rarely fit in the same small room at once, '
    'so if two suggestions in the *same* category would conflict, keep only the one you\'re more '
    "confident about, but don't let that trim your coverage of the *other* categories above. "
    '\n\n'
    'Aim for a well-rounded, fully furnished result, not a minimal one — most rooms with genuine '
    'wall and floor space to spare can realistically take 4-7 well-chosen pieces spread across '
    'those categories. Only fall back to a shorter list when the room is genuinely too small or '
    'already too full for more. If the user-turn message states a style and/or colour preference, '
    "treat that as overriding guidance for point 3's palette and for which categories/search queries "
    'to favour. Respond with your structured findings in the required schema.';

String _buildUserPromptText({String? style, List<String>? colors}) {
  const base = 'Analyze this room photo and find every genuine furniture-placement opportunity in it.';
  final cleanColors = (colors ?? []).where((c) => c.trim().isNotEmpty).toList();
  if ((style == null || style.trim().isEmpty) && cleanColors.isEmpty) return base;

  final parts = <String>[];
  if (style != null && style.trim().isNotEmpty) parts.add('a ${style.trim()} style');
  if (cleanColors.isNotEmpty) parts.add('a colour palette built around ${cleanColors.join(", ")}');
  return '$base The customer has asked for ${parts.join(" and ")} — use this as your primary guide '
      'for which categories, search queries and colours to choose; every suggested search_query '
      'should reflect it where a genuine match is plausible, and the colours you choose across every '
      'suggested piece should read as one deliberately coordinated palette built around what the '
      'customer asked for, not a generic guess at the room\'s existing style.';
}

class VisionError {
  final String code;
  final String message;
  final bool retryable;
  VisionError(this.code, this.message, this.retryable);
}

class RoomVisionResult {
  final bool ok;
  final Map<String, dynamic>? data;
  final VisionError? error;
  RoomVisionResult.success(this.data)
      : ok = true,
        error = null;
  RoomVisionResult.failure(this.error)
      : ok = false,
        data = null;
}

double _clamp01(num n) => n.toDouble().clamp(0.0, 1.0);

Map<String, dynamic>? _parseBoundingBox(dynamic raw) {
  if (raw is! Map) return null;
  final x = raw['x'], y = raw['y'], w = raw['width'], h = raw['height'];
  if (x is! num || y is! num || w is! num || h is! num) return null;
  return {'x': _clamp01(x), 'y': _clamp01(y), 'width': _clamp01(w), 'height': _clamp01(h)};
}

double _overlapRatio(Map<String, dynamic> box, Map<String, dynamic> other) {
  final boxArea = (box['width'] as num) * (box['height'] as num);
  if (boxArea <= 0) return 0;
  final ix = ((box['x'] as num) + (box['width'] as num) < (other['x'] as num) + (other['width'] as num)
          ? (box['x'] as num) + (box['width'] as num)
          : (other['x'] as num) + (other['width'] as num)) -
      ((box['x'] as num) > (other['x'] as num) ? (box['x'] as num) : (other['x'] as num));
  final iy = ((box['y'] as num) + (box['height'] as num) < (other['y'] as num) + (other['height'] as num)
          ? (box['y'] as num) + (box['height'] as num)
          : (other['y'] as num) + (other['height'] as num)) -
      ((box['y'] as num) > (other['y'] as num) ? (box['y'] as num) : (other['y'] as num));
  final ixClamped = ix < 0 ? 0 : ix;
  final iyClamped = iy < 0 ? 0 : iy;
  return (ixClamped * iyClamped) / boxArea;
}

List<Map<String, dynamic>> _enforceSpatialCoherence(List<Map<String, dynamic>> spaces, Map<String, dynamic> roomBoundary) {
  final kept = <Map<String, dynamic>>[];
  for (final space in spaces) {
    final box = space['bounding_box'] as Map<String, dynamic>;
    if (_overlapRatio(box, roomBoundary) < _minRoomOverlapRatio) continue;
    final overlapsExisting = kept.any((e) => _overlapRatio(box, e['bounding_box'] as Map<String, dynamic>) > _maxSpaceOverlapRatio);
    if (overlapsExisting) continue;
    kept.add(space);
  }
  return kept;
}

Map<String, dynamic>? _coerceAnalysis(dynamic input) {
  if (input is! Map) return null;
  if (input['room_type'] is! String) return null;
  if (input['confidence'] is! num) return null;
  if (input['style_tags'] is! List) return null;
  if (input['detected_spaces'] is! List) return null;

  final roomBoundary = _parseBoundingBox(input['room_boundary']) ?? {'x': 0, 'y': 0, 'width': 1, 'height': 1};

  final spaces = <Map<String, dynamic>>[];
  for (final raw in input['detected_spaces'] as List) {
    if (raw is! Map) continue;
    final bbox = _parseBoundingBox(raw['bounding_box']);
    if (raw['description'] is! String || raw['category'] is! String || raw['search_query'] is! String || bbox == null) {
      continue;
    }
    spaces.add({
      'description': raw['description'],
      'category': raw['category'],
      'search_query': raw['search_query'],
      'orientation': raw['orientation'] is String ? raw['orientation'] : '',
      'bounding_box': bbox,
    });
  }

  return {
    'room_type': input['room_type'],
    'confidence': _clamp01(input['confidence']),
    'style_tags': (input['style_tags'] as List).whereType<String>().toList(),
    'room_boundary': roomBoundary,
    'detected_spaces': _enforceSpatialCoherence(spaces, roomBoundary),
  };
}

VisionError _classifyProviderError(Object err) {
  if (err is TimeoutException) {
    return VisionError('TIMEOUT', 'AI vision call exceeded ${_visionTimeout.inMilliseconds}ms.', true);
  }
  if (err is http.ClientException) {
    return VisionError('PROVIDER_ERROR', 'AI vision provider error: ${err.message}', true);
  }
  return VisionError('UNKNOWN', err.toString(), false);
}

class RoomVisionService {
  final String apiKey;
  final List<String> models;

  RoomVisionService({String? apiKey, List<String>? models})
      : apiKey = apiKey ?? env['GEMINI_API_KEY'] ?? env['GOOGLE_API_KEY'] ?? '',
        models = (models != null && models.isNotEmpty) ? models : _defaultModelFallbacks;

  Future<RoomVisionResult> analyzeRoom(List<int> image, String mimeType, {String? style, List<String>? colors}) async {
    if (image.isEmpty) {
      return RoomVisionResult.failure(VisionError('INVALID_IMAGE', 'No image data received.', false));
    }
    if (image.length > _maxImageBytes) {
      return RoomVisionResult.failure(VisionError(
          'INVALID_IMAGE', 'Image is too large (${(image.length / 1024 / 1024).toStringAsFixed(1)}MB, max ${_maxImageBytes / 1024 / 1024}MB).', false));
    }
    if (!_allowedMimeTypes.contains(mimeType)) {
      return RoomVisionResult.failure(VisionError('INVALID_IMAGE', 'Unsupported image type: $mimeType', false));
    }

    final analysisResult = await _callVisionModel(image, mimeType, style: style, colors: colors);
    if (!analysisResult.ok) return analysisResult;
    final analysis = analysisResult.data!;

    if ((analysis['confidence'] as num) < _lowConfidenceThreshold) {
      return RoomVisionResult.failure(VisionError(
        'LOW_CONFIDENCE',
        "The photo couldn't be read confidently enough to recommend placements. Ask for better lighting, a wider framing, or less clutter.",
        true,
      ));
    }

    final placements = await _matchSpacesToCatalog((analysis['detected_spaces'] as List).cast<Map<String, dynamic>>());

    return RoomVisionResult.success({
      'roomType': analysis['room_type'],
      'styleTags': analysis['style_tags'],
      'analysisConfidence': analysis['confidence'],
      'roomBoundary': analysis['room_boundary'],
      'placements': placements,
    });
  }

  Future<RoomVisionResult> _callVisionModel(List<int> image, String mimeType, {String? style, List<String>? colors}) async {
    final base64Image = base64Encode(image);
    final promptText = _buildUserPromptText(style: style, colors: colors);

    var lastError = VisionError('UNKNOWN', 'Exhausted retries without a result.', false);

    for (final model in models) {
      for (var attempt = 0; attempt <= _retriesPerModel; attempt++) {
        try {
          final uri = Uri.parse('https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey');
          final body = jsonEncode({
            'contents': [
              {
                'role': 'user',
                'parts': [
                  {'text': promptText},
                  {
                    'inlineData': {'mimeType': mimeType, 'data': base64Image},
                  },
                ],
              },
            ],
            'systemInstruction': {
              'parts': [
                {'text': _systemInstruction},
              ],
            },
            'generationConfig': {
              'responseMimeType': 'application/json',
              'responseSchema': _analysisSchema,
              'mediaResolution': 'MEDIA_RESOLUTION_HIGH',
            },
          });

          final response = await http.post(uri, headers: {'content-type': 'application/json'}, body: body).timeout(_visionTimeout);

          if (response.statusCode == 401 || response.statusCode == 403) {
            return RoomVisionResult.failure(VisionError('AUTH_ERROR', 'AI vision provider rejected the API key.', false));
          }
          if (response.statusCode == 429) {
            lastError = VisionError('RATE_LIMITED', 'AI vision provider rate-limited this request (the free tier has tight request limits).', true);
            if (attempt != _retriesPerModel) await _delay(_retryBaseDelayMs * (1 << attempt));
            continue;
          }
          if (response.statusCode >= 500) {
            lastError = VisionError('PROVIDER_ERROR', 'AI vision provider error: HTTP ${response.statusCode}', true);
            if (attempt != _retriesPerModel) await _delay(_retryBaseDelayMs * (1 << attempt));
            continue;
          }
          if (response.statusCode >= 400) {
            return RoomVisionResult.failure(VisionError('PROVIDER_ERROR', 'AI vision provider error: HTTP ${response.statusCode}: ${response.body}', false));
          }

          final decoded = jsonDecode(response.body) as Map<String, dynamic>;

          final blockReason = decoded['promptFeedback']?['blockReason'];
          if (blockReason != null) {
            return RoomVisionResult.failure(VisionError('MODEL_REFUSED', 'The model declined to analyze this image ($blockReason).', false));
          }

          final candidates = decoded['candidates'] as List?;
          final finishReason = candidates != null && candidates.isNotEmpty ? candidates[0]['finishReason'] : null;
          if (finishReason != null && _refusalFinishReasons.contains(finishReason)) {
            return RoomVisionResult.failure(VisionError('MODEL_REFUSED', 'The model declined to analyze this image ($finishReason).', false));
          }

          String? text;
          if (candidates != null && candidates.isNotEmpty) {
            final parts = candidates[0]['content']?['parts'] as List?;
            if (parts != null && parts.isNotEmpty) text = parts[0]['text'] as String?;
          }
          if (text == null || text.isEmpty) {
            return RoomVisionResult.failure(VisionError('UNPARSEABLE_RESPONSE', 'Model did not return structured analysis.', true));
          }

          dynamic rawInput;
          try {
            rawInput = jsonDecode(text);
          } catch (_) {
            return RoomVisionResult.failure(VisionError('UNPARSEABLE_RESPONSE', "Model's structured response was not valid JSON.", true));
          }

          final parsed = _coerceAnalysis(rawInput);
          if (parsed == null) {
            return RoomVisionResult.failure(VisionError('UNPARSEABLE_RESPONSE', "Model's structured response was malformed.", true));
          }
          return RoomVisionResult.success(parsed);
        } catch (err) {
          lastError = _classifyProviderError(err is Object ? err : Exception(err.toString()));
          if (!lastError.retryable) {
            return RoomVisionResult.failure(lastError);
          }
          if (attempt != _retriesPerModel) {
            await _delay(_retryBaseDelayMs * (1 << attempt));
          }
        }
      }
    }

    return RoomVisionResult.failure(lastError);
  }

  Future<void> _delay(int ms) => Future.delayed(Duration(milliseconds: ms));

  Future<List<Map<String, dynamic>>> _matchSpacesToCatalog(List<Map<String, dynamic>> spaces) async {
    final results = <Map<String, dynamic>>[];
    for (var i = 0; i < spaces.length; i++) {
      results.add(await _matchOneSpace(spaces[i], 'space_$i'));
    }
    return results;
  }

  Future<Map<String, dynamic>> _matchOneSpace(Map<String, dynamic> space, String spaceId) async {
    final base = {
      'spaceId': spaceId,
      'description': space['description'],
      'category': space['category'],
      'orientation': space['orientation'],
      'boundingBox': space['bounding_box'],
    };

    List<CatalogMatch> matches;
    try {
      matches = searchZawiyaPartnerCatalog(space['search_query'] as String, category: space['category'] as String, limit: 3);
    } catch (_) {
      return {...base, 'productId': null, 'matchConfidence': 0, 'fallback': {'used': true, 'reason': 'catalog_search_failed'}};
    }

    final best = _bestAbove(matches, _matchConfidenceThreshold);
    if (best != null) {
      return {...base, 'productId': best.productId, 'matchConfidence': best.score, 'fallback': {'used': false}};
    }

    try {
      final broadened = searchZawiyaPartnerCatalog(space['category'] as String, limit: 3);
      final fallbackBest = _bestAbove(broadened, _fallbackConfidenceThreshold);
      if (fallbackBest != null) {
        return {
          ...base,
          'productId': fallbackBest.productId,
          'matchConfidence': fallbackBest.score,
          'fallback': {'used': true, 'reason': 'below_confidence_threshold'},
        };
      }
    } catch (_) {
      // fall through
    }

    return {...base, 'productId': null, 'matchConfidence': 0, 'fallback': {'used': true, 'reason': 'no_catalog_match'}};
  }

  CatalogMatch? _bestAbove(List<CatalogMatch> matches, double threshold) {
    if (matches.isEmpty) return null;
    final sorted = [...matches]..sort((a, b) => b.score.compareTo(a.score));
    return sorted.first.score >= threshold ? sorted.first : null;
  }
}
