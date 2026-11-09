import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

import 'env.dart';

/// Dart port of RoomCompositingService.ts — generates (edits) a real
/// photo via Gemini's image model, as opposed to RoomVisionService's
/// read-only analysis. No free tier for this at all (verified in the
/// original TS file's header comment) — Cloud Billing must be linked.

const _allowedMimeTypes = {'image/jpeg', 'image/png', 'image/webp'};
const _maxImageBytes = 8 * 1024 * 1024;
const _composeTimeout = Duration(milliseconds: 90000);
const _retryBaseDelayMs = 500;
const _defaultModel = 'gemini-nano-banana-2.1';
const _maxRetries = 2;
const _refusalFinishReasons = {'SAFETY', 'RECITATION', 'LANGUAGE', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'OTHER'};

class CompositingError {
  final String code;
  final String message;
  final bool retryable;
  CompositingError(this.code, this.message, this.retryable);
}

class GeneratedImage {
  final String data; // base64
  final String mimeType;
  GeneratedImage(this.data, this.mimeType);
}

class CompositingResult {
  final bool ok;
  final GeneratedImage? image;
  final CompositingError? error;
  CompositingResult.success(this.image)
      : ok = true,
        error = null;
  CompositingResult.failure(this.error)
      : ok = false,
        image = null;
}

class CompositeProduct {
  final List<int> image;
  final String mimeType;
  final String label;
  final String? placementHint;
  final String? orientation;
  CompositeProduct({required this.image, required this.mimeType, required this.label, this.placementHint, this.orientation});
}

class RoomCompositingService {
  final String apiKey;
  final String model;

  RoomCompositingService({String? apiKey, String? model})
      : apiKey = apiKey ?? env['GEMINI_API_KEY'] ?? env['GOOGLE_API_KEY'] ?? '',
        model = model ?? _defaultModel;

  Future<CompositingResult> compose({
    required List<int> roomImage,
    required String roomMimeType,
    required List<CompositeProduct> products,
    String? styleNote,
  }) async {
    final roomCheck = _validateImage(roomImage, roomMimeType, 'room photo');
    if (roomCheck != null) return CompositingResult.failure(roomCheck);
    if (products.isEmpty) {
      return CompositingResult.failure(CompositingError('INVALID_IMAGE', 'No products given to place.', false));
    }
    for (final product in products) {
      final check = _validateImage(product.image, product.mimeType, '${product.label} photo');
      if (check != null) return CompositingResult.failure(check);
    }

    final itemLines = products.asMap().entries.map((entry) {
      final i = entry.key;
      final p = entry.value;
      final ordinal = 'Product ${i + 2}';
      final where = p.placementHint != null ? ' Place it: ${p.placementHint}.' : ' Choose the most sensible empty spot for it.';
      final facing = p.orientation != null ? ' Orient it: ${p.orientation}.' : '';
      return '- $ordinal (${p.label}):$where$facing';
    }).join('\n');

    final styleLine = styleNote != null && styleNote.trim().isNotEmpty
        ? ' The customer asked for ${styleNote.trim()} — render every new piece so it reads as part of '
            'one deliberately styled, fashion-forward room (a small, coordinated palette of colours and '
            'materials repeated across the new pieces), not individually-fine items that happen to clash once '
            'placed together.'
        : " Style the result the way a professional stager would: keep the new pieces' colours and materials "
            'reading as one coordinated, fashionable palette rather than a random assortment, taking the cue '
            "from the room's own existing tones where there's no other guidance.";

    final instruction = 'You are an interior designer editing the first image (a real room photo) to show how each of the '
        'following products would actually look placed inside it by someone who knows how to arrange a '
        'room, all in this one edited photo:\n'
        '$itemLines'
        '\n\nGetting the angle right matters as much as getting the spot right: rotate and orient each '
        "piece exactly the way the instructions above describe, matching the room's real perspective and "
        'vanishing point rather than placing it flat-on regardless of the camera angle — a sofa or chair '
        'whose seat and back face the direction described, a piece against a wall sitting flush and square '
        'with that wall rather than at a careless angle, a lamp standing upright. Every product must end up '
        'in a distinct, non-overlapping spot — treat the room as one real physical space where each item '
        "needs its own floor or wall area, the same way they would if someone actually placed all of them in "
        "the room at once. Match the room's existing scale and lighting for every item, each with a natural "
        'contact shadow where it touches the floor or wall, so all of them look like they genuinely belong '
        'in the photo rather than pasted on top.'
        '$styleLine'
        ' Do not alter anything else in the room — same walls, same other furniture, same lighting '
        'everywhere outside the new products. Return only the one edited room photo.';

    final parts = <Map<String, dynamic>>[
      {'text': instruction},
      {
        'inlineData': {'data': base64Encode(roomImage), 'mimeType': roomMimeType},
      },
    ];
    for (final product in products) {
      parts.add({
        'inlineData': {'data': base64Encode(product.image), 'mimeType': product.mimeType},
      });
    }

    return _generateImage(parts);
  }

  Future<CompositingResult> refine({
    required List<int> baseImage,
    required String baseMimeType,
    required String instruction,
  }) async {
    final check = _validateImage(baseImage, baseMimeType, 'image');
    if (check != null) return CompositingResult.failure(check);

    return _generateImage([
      {'text': 'Apply this change to the room photo: $instruction. Keep everything else in the image exactly the same. Return only the edited photo.'},
      {
        'inlineData': {'data': base64Encode(baseImage), 'mimeType': baseMimeType},
      },
    ]);
  }

  CompositingError? _validateImage(List<int> image, String mimeType, String label) {
    if (image.isEmpty) {
      return CompositingError('INVALID_IMAGE', 'No $label data received.', false);
    }
    if (image.length > _maxImageBytes) {
      return CompositingError(
          'INVALID_IMAGE', 'The $label is too large (${(image.length / 1024 / 1024).toStringAsFixed(1)}MB, max ${_maxImageBytes / 1024 / 1024}MB).', false);
    }
    if (!_allowedMimeTypes.contains(mimeType)) {
      return CompositingError('INVALID_IMAGE', 'Unsupported $label type: $mimeType', false);
    }
    return null;
  }

  Future<CompositingResult> _generateImage(List<Map<String, dynamic>> parts) async {
    var lastError = CompositingError('UNKNOWN', 'Exhausted retries without a result.', false);

    for (var attempt = 0; attempt <= _maxRetries; attempt++) {
      try {
        final uri = Uri.parse('https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey');
        final body = jsonEncode({
          'contents': [
            {'role': 'user', 'parts': parts},
          ],
          'generationConfig': {
            'responseModalities': ['IMAGE'],
          },
        });

        final response = await http.post(uri, headers: {'content-type': 'application/json'}, body: body).timeout(_composeTimeout);

        if (response.statusCode == 401 || response.statusCode == 403) {
          return CompositingResult.failure(CompositingError('AUTH_ERROR', 'AI provider rejected the API key.', false));
        }
        if (response.statusCode == 429) {
          return CompositingResult.failure(CompositingError(
            'RATE_LIMITED',
            'AI provider rate-limited or quota-blocked this request. Image generation has no free tier — '
                'confirm Cloud Billing is linked to your Google AI Studio project, not just a consumer '
                'subscription, then try again.',
            true,
          ));
        }
        if (response.statusCode >= 500) {
          lastError = CompositingError('PROVIDER_ERROR', 'AI provider error: HTTP ${response.statusCode}', true);
          final isLastAttempt = attempt == _maxRetries;
          if (isLastAttempt) return CompositingResult.failure(lastError);
          await _delay(_retryBaseDelayMs * (1 << attempt));
          continue;
        }
        if (response.statusCode >= 400) {
          return CompositingResult.failure(CompositingError('PROVIDER_ERROR', 'AI provider error: HTTP ${response.statusCode}: ${response.body}', false));
        }

        final decoded = jsonDecode(response.body) as Map<String, dynamic>;

        final blockReason = decoded['promptFeedback']?['blockReason'];
        if (blockReason != null) {
          return CompositingResult.failure(CompositingError('MODEL_REFUSED', 'The model declined this edit ($blockReason).', false));
        }
        final candidates = decoded['candidates'] as List?;
        final finishReason = candidates != null && candidates.isNotEmpty ? candidates[0]['finishReason'] : null;
        if (finishReason != null && _refusalFinishReasons.contains(finishReason)) {
          return CompositingResult.failure(CompositingError('MODEL_REFUSED', 'The model declined this edit ($finishReason).', false));
        }

        final generated = _extractImage(candidates);
        if (generated == null) {
          return CompositingResult.failure(CompositingError('NO_IMAGE_RETURNED', 'The model did not return an image.', true));
        }
        return CompositingResult.success(generated);
      } catch (err) {
        lastError = _classifyProviderError(err);
        final isLastAttempt = attempt == _maxRetries;
        if (!lastError.retryable || isLastAttempt) {
          return CompositingResult.failure(lastError);
        }
        await _delay(_retryBaseDelayMs * (1 << attempt));
      }
    }
    return CompositingResult.failure(lastError);
  }

  GeneratedImage? _extractImage(List? candidates) {
    if (candidates == null || candidates.isEmpty) return null;
    final parts = candidates[0]['content']?['parts'] as List?;
    if (parts == null) return null;
    for (final part in parts) {
      final inlineData = part['inlineData'];
      if (inlineData != null && inlineData['data'] != null && inlineData['mimeType'] != null) {
        return GeneratedImage(inlineData['data'] as String, inlineData['mimeType'] as String);
      }
    }
    return null;
  }

  CompositingError _classifyProviderError(Object err) {
    if (err is TimeoutException) {
      return CompositingError('TIMEOUT', 'Image generation exceeded ${_composeTimeout.inMilliseconds}ms.', true);
    }
    return CompositingError('UNKNOWN', err.toString(), false);
  }

  Future<void> _delay(int ms) => Future.delayed(Duration(milliseconds: ms));
}
