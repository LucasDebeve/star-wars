'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');

const { CATEGORIES, FACTIONS } = require('./db');
const { SQLiteStore } = require('./session-store');
const { csrfToken, verifyCsrf } = require('./security');

function createApp({ db, sessionSecret, secureCookies = false, trustProxy = false } = {}) {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.set('trust proxy', trustProxy);
  app.disable('x-powered-by');
  app.locals.db = db;

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1d' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

  app.use(
    session({
      name: 'holonet.sid',
      secret: sessionSecret || crypto.randomBytes(32).toString('hex'),
      store: new SQLiteStore(db),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: secureCookies,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    })
  );

  const findUser = db.prepare('SELECT id, username, email, faction, bio, role, created_at FROM users WHERE id = ?');

  // Variables communes à toutes les vues.
  app.use((req, res, next) => {
    const user = req.session.userId ? findUser.get(req.session.userId) : null;
    if (req.session.userId && !user) delete req.session.userId;
    res.locals.currentUser = user || null;
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;
    res.locals.categories = CATEGORIES;
    res.locals.factions = FACTIONS;
    res.locals.path = req.path;
    res.locals.csrfToken = () => csrfToken(req);
    res.locals.formatDate = formatDate;
    res.locals.categoryName = (slug) => (CATEGORIES.find((c) => c.slug === slug) || {}).name || slug;
    res.locals.factionName = (slug) => (FACTIONS.find((f) => f.slug === slug) || {}).name || slug;
    res.locals.title = null;
    next();
  });

  app.use(verifyCsrf);

  app.use(require('./routes/auth'));
  app.use(require('./routes/articles'));
  app.use(require('./routes/users'));

  app.use((req, res) => {
    res.status(404).render('error', { title: 'Page introuvable', status: 404, message: "Ce ne sont pas les droïdes que vous recherchez. Cette page n'existe pas." });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    const message = status >= 500 ? 'Une perturbation dans la Force… Une erreur interne est survenue.' : err.expose !== false ? err.message : 'Requête invalide.';
    res.status(status).render('error', { title: 'Erreur', status, message });
  });

  return app;
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
function formatDate(sqliteDate) {
  return dateFmt.format(new Date(sqliteDate.replace(' ', 'T') + 'Z'));
}

module.exports = { createApp };
