'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');

const { requireAuth } = require('../security');
const { validateProfile, passwordError } = require('../validators');
const { BCRYPT_ROUNDS } = require('./auth');

const router = express.Router();

router.get('/holonautes/:username', (req, res, next) => {
  const db = req.app.locals.db;
  const profile = db
    .prepare('SELECT id, username, faction, bio, role, created_at FROM users WHERE username = ?')
    .get(req.params.username);
  if (!profile) {
    const err = new Error('Aucun holonaute ne porte ce nom dans les archives.');
    err.status = 404;
    return next(err);
  }
  const articles = db
    .prepare(
      `SELECT a.*, ? AS author_name, ? AS author_faction,
              (SELECT COUNT(*) FROM comments c WHERE c.article_id = a.id) AS comment_count
       FROM articles a WHERE a.author_id = ? ORDER BY a.created_at DESC`
    )
    .all(profile.username, profile.faction, profile.id);
  const { comments } = db.prepare('SELECT COUNT(*) AS comments FROM comments WHERE author_id = ?').get(profile.id);
  res.render('users/profile', { title: profile.username, profile, articles, commentCount: comments });
});

function renderAccount(res, status, extra = {}) {
  const user = res.locals.currentUser;
  res.status(status).render('users/account', {
    title: 'Mon compte',
    values: { faction: user.faction, bio: user.bio },
    errors: {},
    pwdErrors: {},
    ...extra,
  });
}

router.get('/mon-compte', requireAuth, (req, res) => renderAccount(res, 200));

router.post('/mon-compte', requireAuth, (req, res) => {
  const { data, errors } = validateProfile(req.body);
  if (Object.keys(errors).length) return renderAccount(res, 422, { values: data, errors });
  req.app.locals.db.prepare('UPDATE users SET faction = ?, bio = ? WHERE id = ?').run(data.faction, data.bio, res.locals.currentUser.id);
  req.session.flash = { type: 'success', message: 'Profil mis à jour.' };
  res.redirect('/mon-compte');
});

router.post('/mon-compte/mot-de-passe', requireAuth, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const userId = res.locals.currentUser.id;
    const current = typeof req.body.current === 'string' ? req.body.current : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const confirm = typeof req.body.confirm === 'string' ? req.body.confirm : '';

    const { password_hash: hash } = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);
    const pwdErrors = {};
    if (!(await bcrypt.compare(current.slice(0, 128), hash))) pwdErrors.current = 'Mot de passe actuel incorrect.';
    const pe = passwordError(password);
    if (pe) pwdErrors.password = pe;
    if (password !== confirm) pwdErrors.confirm = 'Les mots de passe ne correspondent pas.';
    if (Object.keys(pwdErrors).length) return renderAccount(res, 422, { pwdErrors });

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await bcrypt.hash(password, BCRYPT_ROUNDS), userId);

    // Déconnecte toutes les autres sessions de cet utilisateur, puis renouvelle la session courante.
    db.prepare("DELETE FROM sessions WHERE json_extract(data, '$.userId') = ?").run(userId);
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = userId;
      req.session.flash = { type: 'success', message: 'Mot de passe modifié. Vos autres sessions ont été déconnectées.' };
      req.session.save((saveErr) => (saveErr ? next(saveErr) : res.redirect('/mon-compte')));
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
