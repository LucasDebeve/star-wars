'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { seedArticles } = require('./seed');

const CATEGORIES = [
  { slug: 'jedi', name: 'Ordre Jedi' },
  { slug: 'sith', name: 'Côté Obscur' },
  { slug: 'vaisseaux', name: 'Vaisseaux' },
  { slug: 'planetes', name: 'Planètes' },
  { slug: 'personnages', name: 'Personnages' },
  { slug: 'films-series', name: 'Films & Séries' },
  { slug: 'lore', name: 'Histoire & Lore' },
];

const FACTIONS = [
  { slug: 'jedi', name: 'Jedi', color: '#2ea8ff' },
  { slug: 'sith', name: 'Sith', color: '#ff2b2b' },
  { slug: 'rebelle', name: 'Alliance Rebelle', color: '#ff8c1a' },
  { slug: 'empire', name: 'Empire Galactique', color: '#c9d1d9' },
  { slug: 'mandalorien', name: 'Mandalorien', color: '#3ddc84' },
];

function openDatabase(file = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'holonet.db')) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
      email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      faction       TEXT NOT NULL DEFAULT 'jedi',
      bio           TEXT NOT NULL DEFAULT '',
      role          TEXT NOT NULL DEFAULT 'member',
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS articles (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      slug       TEXT NOT NULL UNIQUE,
      title      TEXT NOT NULL,
      category   TEXT NOT NULL,
      excerpt    TEXT NOT NULL,
      content    TEXT NOT NULL,
      author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_articles_created ON articles(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);

    CREATE TABLE IF NOT EXISTS comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_comments_article ON comments(article_id);

    CREATE TABLE IF NOT EXISTS sessions (
      sid     TEXT PRIMARY KEY,
      data    TEXT NOT NULL,
      expires INTEGER NOT NULL
    );
  `);

  seed(db);
  return db;
}

function seed(db) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM articles').get();
  if (n > 0) return;

  // Compte « système » propriétaire des articles de démonstration.
  // Son mot de passe est un hash inutilisable : personne ne peut s'y connecter.
  let holocron = db.prepare('SELECT id FROM users WHERE username = ?').get('Holocron');
  if (!holocron) {
    const unusable = '!' + crypto.randomBytes(32).toString('hex');
    const r = db
      .prepare("INSERT INTO users (username, email, password_hash, faction, bio, role) VALUES (?, ?, ?, 'jedi', ?, 'system')")
      .run('Holocron', 'holocron@holonet.invalid', unusable, 'Archives des Jedi. Gardien du savoir de la galaxie.');
    holocron = { id: Number(r.lastInsertRowid) };
  }

  const insert = db.prepare(
    'INSERT INTO articles (slug, title, category, excerpt, content, author_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const a of seedArticles) {
    insert.run(a.slug, a.title, a.category, a.excerpt, a.content, holocron.id, a.date, a.date);
  }
}

module.exports = { openDatabase, CATEGORIES, FACTIONS };
