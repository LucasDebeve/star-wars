'use strict';

const session = require('express-session');

// Store de sessions persistant dans SQLite (évite le MemoryStore, inadapté à la production).
class SQLiteStore extends session.Store {
  constructor(db, { ttlMs = 1000 * 60 * 60 * 24 * 7 } = {}) {
    super();
    this.ttlMs = ttlMs;
    this.getStmt = db.prepare('SELECT data, expires FROM sessions WHERE sid = ?');
    this.setStmt = db.prepare(
      'INSERT INTO sessions (sid, data, expires) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires = excluded.expires'
    );
    this.destroyStmt = db.prepare('DELETE FROM sessions WHERE sid = ?');
    this.touchStmt = db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?');
    this.pruneStmt = db.prepare('DELETE FROM sessions WHERE expires < ?');
    this.pruneTimer = setInterval(() => this.pruneStmt.run(Date.now()), 15 * 60 * 1000);
    this.pruneTimer.unref();
  }

  expiry(sess) {
    const e = sess && sess.cookie && sess.cookie.expires;
    return e ? new Date(e).getTime() : Date.now() + this.ttlMs;
  }

  get(sid, cb) {
    try {
      const row = this.getStmt.get(sid);
      if (!row || row.expires < Date.now()) return cb(null, null);
      cb(null, JSON.parse(row.data));
    } catch (err) {
      cb(err);
    }
  }

  set(sid, sess, cb = () => {}) {
    try {
      this.setStmt.run(sid, JSON.stringify(sess), this.expiry(sess));
      cb(null);
    } catch (err) {
      cb(err);
    }
  }

  destroy(sid, cb = () => {}) {
    try {
      this.destroyStmt.run(sid);
      cb(null);
    } catch (err) {
      cb(err);
    }
  }

  touch(sid, sess, cb = () => {}) {
    try {
      this.touchStmt.run(this.expiry(sess), sid);
      cb(null);
    } catch (err) {
      cb(err);
    }
  }
}

module.exports = { SQLiteStore };
