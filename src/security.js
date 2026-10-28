'use strict';

const crypto = require('node:crypto');

// --- Protection CSRF (synchronizer token stocké en session) ---
function csrfToken(req) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(32).toString('hex');
  return req.session.csrf;
}

function verifyCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const expected = req.session && req.session.csrf;
  const sent = (req.body && req.body._csrf) || req.get('x-csrf-token');
  if (
    typeof expected === 'string' &&
    typeof sent === 'string' &&
    expected.length === sent.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sent))
  ) {
    return next();
  }
  const err = new Error('Jeton de sécurité invalide ou expiré. Rechargez la page et réessayez.');
  err.status = 403;
  next(err);
}

// --- Contrôle d'accès ---
function requireAuth(req, res, next) {
  if (res.locals.currentUser) return next();
  req.session.returnTo = req.originalUrl;
  req.session.flash = { type: 'warning', message: 'Vous devez être connecté pour accéder à cette page.' };
  res.redirect('/connexion');
}

function requireGuest(req, res, next) {
  if (!res.locals.currentUser) return next();
  res.redirect('/');
}

// N'autorise que les redirections internes (évite les open redirects).
function safeReturnTo(value) {
  return typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : '/';
}

module.exports = { csrfToken, verifyCsrf, requireAuth, requireGuest, safeReturnTo };
