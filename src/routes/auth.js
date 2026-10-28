'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { rateLimit } = require('express-rate-limit');

const { requireGuest, requireAuth, safeReturnTo } = require('../security');
const { validateRegistration } = require('../validators');

const router = express.Router();
const BCRYPT_ROUNDS = 12;
// Hash factice : on compare toujours un mot de passe, même si l'utilisateur
// n'existe pas, pour ne pas révéler son existence par le temps de réponse.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT) || 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).render('error', {
      title: 'Trop de tentatives',
      status: 429,
      message: 'Trop de tentatives. Même un Jedi doit savoir patienter : réessayez dans 15 minutes.',
    });
  },
});

// Démarre une session authentifiée en régénérant l'identifiant (anti fixation de session).
function logIn(req, user, done) {
  const returnTo = safeReturnTo(req.session.returnTo);
  req.session.regenerate((err) => {
    if (err) return done(err);
    req.session.userId = user.id;
    req.session.flash = { type: 'success', message: `Bienvenue, ${user.username}. Que la Force soit avec vous !` };
    req.session.save((saveErr) => done(saveErr, returnTo));
  });
}

router.get('/inscription', requireGuest, (req, res) => {
  res.render('auth/register', { title: 'Rejoindre la HoloNet', values: { faction: 'jedi' }, errors: {} });
});

router.post('/inscription', requireGuest, authLimiter, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { data, errors } = validateRegistration(req.body);

    if (!errors.username && db.prepare('SELECT 1 FROM users WHERE username = ?').get(data.username)) {
      errors.username = 'Ce nom est déjà pris.';
    }
    if (!errors.email && db.prepare('SELECT 1 FROM users WHERE email = ?').get(data.email)) {
      errors.email = 'Cette adresse est déjà utilisée.';
    }
    if (Object.keys(errors).length) {
      return res.status(422).render('auth/register', {
        title: 'Rejoindre la HoloNet',
        values: { username: data.username, email: data.email, faction: data.faction },
        errors,
      });
    }

    const hash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const r = db
      .prepare('INSERT INTO users (username, email, password_hash, faction) VALUES (?, ?, ?, ?)')
      .run(data.username, data.email, hash, data.faction);

    logIn(req, { id: Number(r.lastInsertRowid), username: data.username }, (err, returnTo) => {
      if (err) return next(err);
      res.redirect(returnTo);
    });
  } catch (err) {
    next(err);
  }
});

router.get('/connexion', requireGuest, (req, res) => {
  res.render('auth/login', { title: 'Connexion', values: {}, error: null });
});

router.post('/connexion', requireGuest, authLimiter, async (req, res, next) => {
  try {
    const login = typeof req.body.login === 'string' ? req.body.login.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const user = req.app.locals.db
      .prepare("SELECT id, username, password_hash FROM users WHERE (username = ? OR email = ?) AND role != 'system'")
      .get(login, login);

    const ok = await bcrypt.compare(password.slice(0, 128), user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) {
      return res.status(401).render('auth/login', {
        title: 'Connexion',
        values: { login },
        error: 'Identifiants incorrects.',
      });
    }

    logIn(req, user, (err, returnTo) => {
      if (err) return next(err);
      res.redirect(returnTo);
    });
  } catch (err) {
    next(err);
  }
});

router.post('/deconnexion', requireAuth, (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('holonet.sid');
    res.redirect('/');
  });
});

module.exports = router;
module.exports.BCRYPT_ROUNDS = BCRYPT_ROUNDS;
