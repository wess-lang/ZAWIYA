import 'dart:convert';
import 'dart:io';

/// Points at the same data/db.json the original Next.js app seeds and
/// reads — this Dart server is a drop-in replacement for that backend,
/// not a separate data store, so no migration is needed: whatever the
/// app already seeded (4 shops, ~109 real-photo products, demo users)
/// is exactly what this server serves too.
final String _dbPath = () {
  // server/ sits next to the Next.js app's own data/ directory.
  final here = Directory.current.path;
  if (here.endsWith('server')) {
    return '$here/../data/db.json';
  }
  return '$here/data/db.json';
}();

/// No in-memory caching, deliberately — mirrors db.ts exactly, which
/// re-reads the file fresh on every call. A prototype JSON file is
/// cheap enough to re-read each time, and skipping the cache avoids an
/// entire class of "stale data served from a process that's still
/// running" bugs a cache would otherwise introduce.
Map<String, dynamic> readDb() {
  final file = File(_dbPath);
  if (!file.existsSync()) {
    throw StateError(
      'data/db.json not found at $_dbPath — run the Next.js app once '
      '(npm run dev) first so it seeds the database, then restart this server.',
    );
  }
  final raw = file.readAsStringSync();
  return jsonDecode(raw) as Map<String, dynamic>;
}

void writeDb(Map<String, dynamic> db) {
  final file = File(_dbPath);
  file.writeAsStringSync(const JsonEncoder.withIndent('  ').convert(db));
}

/// Read-modify-write in one call, mirroring db.ts's mutateDb — not safe
/// against truly concurrent writers, same accepted limitation as the
/// original single-process prototype.
T mutateDb<T>(T Function(Map<String, dynamic> db) fn) {
  final db = readDb();
  final result = fn(db);
  writeDb(db);
  return result;
}

List<Map<String, dynamic>> listOf(Map<String, dynamic> db, String key) {
  return (db[key] as List).cast<Map<String, dynamic>>();
}
