import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "admin.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }
  return db;
}

export function hasAdmin(): boolean {
  const row = getDb().prepare("SELECT COUNT(*) as count FROM admin").get() as {
    count: number;
  };
  return row.count > 0;
}

export function getAdmin(email: string) {
  return getDb()
    .prepare("SELECT * FROM admin WHERE email = ?")
    .get(email) as { id: number; email: string; password_hash: string } | undefined;
}

export function createAdmin(email: string, passwordHash: string) {
  getDb()
    .prepare("INSERT INTO admin (email, password_hash) VALUES (?, ?)")
    .run(email, passwordHash);
}
