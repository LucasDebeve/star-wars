'use strict';

const express = require('express');

const { requireAuth } = require('../security');
const { validateArticle, validateComment } = require('../validators');
const { renderMarkdown, makeExcerpt, slugify, readingTime } = require('../content');

const router = express.Router();
const PAGE_SIZE = 6;

const ARTICLE_SELECT = `
  SELECT a.*, u.username AS author_name, u.faction AS author_faction,
         (SELECT COUNT(*) FROM comments c WHERE c.article_id = a.id) AS comment_count
  FROM articles a JOIN users u ON u.id = a.author_id`;

const qstr = (v) => (typeof v === 'string' ? v.trim() : '');

function canManage(user, ownerId) {
  return Boolean(user && (user.id === ownerId || user.role === 'admin'));
}

function findArticle(db, slug) {
  return db.prepare(`${ARTICLE_SELECT} WHERE a.slug = ?`).get(slug);
}

function uniqueSlug(db, title) {
  const base = slugify(title);
  let slug = base;
  for (let i = 2; db.prepare('SELECT 1 FROM articles WHERE slug = ?').get(slug); i++) slug = `${base}-${i}`;
  return slug;
}

function notFound() {
  const err = new Error("Cet article s'est perdu dans l'hyperespace.");
  err.status = 404;
  return err;
}

function forbidden() {
  const err = new Error("Vous n'avez pas l'autorisation d'effectuer cette action.");
  err.status = 403;
  return err;
}

// --- Accueil : liste, recherche, filtres et pagination ---
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const q = qstr(req.query.q).slice(0, 100);
  const category = qstr(req.query.categorie);
  const page = Math.max(1, parseInt(qstr(req.query.page), 10) || 1);

  const where = [];
  const params = [];
  if (category) {
    where.push('a.category = ?');
    params.push(category);
  }
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (m) => '\\' + m)}%`;
    where.push("(a.title LIKE ? ESCAPE '\\' OR a.content LIKE ? ESCAPE '\\')");
    params.push(like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM articles a ${whereSql}`).get(...params);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const articles = db
    .prepare(`${ARTICLE_SELECT} ${whereSql} ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?`)
    .all(...params, PAGE_SIZE, (page - 1) * PAGE_SIZE);

  const showCrawl = !q && !category && page === 1;
  res.render('index', { title: null, articles, q, category, page, pages, total, showCrawl });
});

// --- Création ---
router.get('/ecrire', requireAuth, (req, res) => {
  res.render('articles/form', { title: 'Écrire un article', article: null, values: { category: 'lore' }, errors: {} });
});

router.post('/ecrire', requireAuth, (req, res) => {
  const db = req.app.locals.db;
  const { data, errors } = validateArticle(req.body);
  if (Object.keys(errors).length) {
    return res.status(422).render('articles/form', { title: 'Écrire un article', article: null, values: data, errors });
  }
  const slug = uniqueSlug(db, data.title);
  db.prepare('INSERT INTO articles (slug, title, category, excerpt, content, author_id) VALUES (?, ?, ?, ?, ?, ?)').run(
    slug,
    data.title,
    data.category,
    makeExcerpt(data.content),
    data.content,
    res.locals.currentUser.id
  );
  req.session.flash = { type: 'success', message: 'Votre transmission a été diffusée sur la HoloNet.' };
  res.redirect(`/articles/${slug}`);
});

// Aperçu Markdown (même rendu nettoyé que la page article).
router.post('/apercu', requireAuth, (req, res) => {
  const content = typeof req.body.content === 'string' ? req.body.content.slice(0, 50000) : '';
  res.type('html').send(renderMarkdown(content));
});

// --- Lecture ---
router.get('/articles/:slug', (req, res, next) => {
  const db = req.app.locals.db;
  const article = findArticle(db, req.params.slug);
  if (!article) return next(notFound());

  const comments = db
    .prepare(
      `SELECT c.*, u.username AS author_name, u.faction AS author_faction
       FROM comments c JOIN users u ON u.id = c.author_id
       WHERE c.article_id = ? ORDER BY c.created_at ASC, c.id ASC`
    )
    .all(article.id);
  const related = db
    .prepare(`${ARTICLE_SELECT} WHERE a.category = ? AND a.id != ? ORDER BY a.created_at DESC LIMIT 3`)
    .all(article.category, article.id);

  res.render('articles/show', {
    title: article.title,
    article,
    html: renderMarkdown(article.content),
    minutes: readingTime(article.content),
    comments,
    related,
    canEdit: canManage(res.locals.currentUser, article.author_id),
    canManage: (ownerId) => canManage(res.locals.currentUser, ownerId),
    commentErrors: {},
    commentValues: {},
  });
});

// --- Modification ---
router.get('/articles/:slug/modifier', requireAuth, (req, res, next) => {
  const article = findArticle(req.app.locals.db, req.params.slug);
  if (!article) return next(notFound());
  if (!canManage(res.locals.currentUser, article.author_id)) return next(forbidden());
  res.render('articles/form', { title: 'Modifier un article', article, values: article, errors: {} });
});

router.post('/articles/:slug/modifier', requireAuth, (req, res, next) => {
  const db = req.app.locals.db;
  const article = findArticle(db, req.params.slug);
  if (!article) return next(notFound());
  if (!canManage(res.locals.currentUser, article.author_id)) return next(forbidden());

  const { data, errors } = validateArticle(req.body);
  if (Object.keys(errors).length) {
    return res.status(422).render('articles/form', { title: 'Modifier un article', article, values: data, errors });
  }
  db.prepare("UPDATE articles SET title = ?, category = ?, excerpt = ?, content = ?, updated_at = datetime('now') WHERE id = ?").run(
    data.title,
    data.category,
    makeExcerpt(data.content),
    data.content,
    article.id
  );
  req.session.flash = { type: 'success', message: 'Article mis à jour.' };
  res.redirect(`/articles/${article.slug}`);
});

// --- Suppression ---
router.post('/articles/:slug/supprimer', requireAuth, (req, res, next) => {
  const db = req.app.locals.db;
  const article = findArticle(db, req.params.slug);
  if (!article) return next(notFound());
  if (!canManage(res.locals.currentUser, article.author_id)) return next(forbidden());
  db.prepare('DELETE FROM articles WHERE id = ?').run(article.id);
  req.session.flash = { type: 'success', message: "L'article a été détruit, comme Alderaan." };
  res.redirect('/');
});

// --- Commentaires ---
router.post('/articles/:slug/commentaires', requireAuth, (req, res, next) => {
  const db = req.app.locals.db;
  const article = findArticle(db, req.params.slug);
  if (!article) return next(notFound());

  const { data, errors } = validateComment(req.body);
  if (Object.keys(errors).length) {
    req.session.flash = { type: 'error', message: errors.body };
    return res.redirect(`/articles/${article.slug}#commentaires`);
  }
  db.prepare('INSERT INTO comments (article_id, author_id, body) VALUES (?, ?, ?)').run(article.id, res.locals.currentUser.id, data.body);
  res.redirect(`/articles/${article.slug}#commentaires`);
});

router.post('/commentaires/:id/supprimer', requireAuth, (req, res, next) => {
  const db = req.app.locals.db;
  const comment = db
    .prepare('SELECT c.id, c.author_id, a.slug FROM comments c JOIN articles a ON a.id = c.article_id WHERE c.id = ?')
    .get(Number(req.params.id) || 0);
  if (!comment) return next(notFound());
  if (!canManage(res.locals.currentUser, comment.author_id)) return next(forbidden());
  db.prepare('DELETE FROM comments WHERE id = ?').run(comment.id);
  req.session.flash = { type: 'success', message: 'Commentaire supprimé.' };
  res.redirect(`/articles/${comment.slug}#commentaires`);
});

module.exports = router;
