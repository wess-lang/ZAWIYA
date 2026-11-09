import 'dart:io';

/// Loads ../.env.local (the same file the Next.js app already reads)
/// so this server needs no separate configuration step — true drop-in
/// replacement. Real process env vars (actual `export`s) take priority
/// over the file, matching standard dotenv precedence.
final Map<String, String> env = () {
  final merged = <String, String>{};
  final here = Directory.current.path;
  final root = here.endsWith('server') ? '$here/..' : here;
  final file = File('$root/.env.local');
  if (file.existsSync()) {
    for (final line in file.readAsLinesSync()) {
      final trimmed = line.trim();
      if (trimmed.isEmpty || trimmed.startsWith('#')) continue;
      final idx = trimmed.indexOf('=');
      if (idx < 0) continue;
      final key = trimmed.substring(0, idx).trim();
      var value = trimmed.substring(idx + 1).trim();
      if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
        value = value.substring(1, value.length - 1);
      }
      if (value.isNotEmpty) merged[key] = value;
    }
  }
  merged.addAll(Platform.environment); // real env vars win over the file
  return merged;
}();
