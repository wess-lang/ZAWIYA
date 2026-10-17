import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { Database } from "./types";
import { buildSeed } from "./seed";

/**
 * A tiny JSON-file-backed "database" for the ZAWIYA prototype.
 *
 * The project documentation specifies PostgreSQL behind a set of REST
 * services (Section 5.3). For this working increment, a single
 * file-backed store plays the same role - one relational-shaped document
 * with the entities from the data dictionary (Section 4.4.1) - without
 * requiring a Postgres instance to run the app locally. The read/write
 * shape below (load, mutate, save) is written so swapping this module
 * for real Postgres queries later is a data-layer change, not a rewrite
 * of the routes that call it.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

function ensureFile(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DB_PATH)) {
    const seeded = buildSeed();
    writeFileSync(DB_PATH, JSON.stringify(seeded, null, 2), "utf-8");
  }
}

export function readDb(): Database {
  ensureFile();
  const raw = readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw) as Database;
}

export function writeDb(db: Database): void {
  ensureFile();
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

/**
 * Read-modify-write in one call. Not safe against truly concurrent
 * writers, which is an accepted limitation for a single-process dev
 * prototype (see README's "Known limitations" section).
 */
export function mutateDb<T>(fn: (db: Database) => T): T {
  const db = readDb();
  const result = fn(db);
  writeDb(db);
  return result;
}
