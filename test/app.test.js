'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.AUTH_RATE_LIMIT = '1000';
const { openDatabase } = require('../src/db');
const { createApp } = require('../src/app');

let server;
let base;
let db;

before(async () => {
  db = openDatabase(':memory:');
  const app = createApp({ db, sessionSecret: 'test-secret' });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

// Petit client HTTP qui conserve le cookie de session.
function client() {
  let cookie = '';
  async function request(path, { method = 'GET', form } = {}) {
    const res = await fetch(base + path, {
      method,
      redirect: 'manual',
      headers: {
        ...(cookie && { cookie }),
        ...(form && { 'content-type': 'application/x-www-form-urlencoded' }),
      },
      body: form ? new URLSearchParams(form) : undefined,
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    return { res, text: await res.text() };
  }
  async function csrf(path) {
    const { text } = await request(path);
    const m = text.match(/name="_csrf" value="([a-f0-9]+)"/);
    assert.ok(m, `jeton CSRF absent de ${path}`);
    return m[1];
  }
  return { request, csrf };
}

async function register(c, username, password = 'MotDePasse123') {
  const _csrf = await c.csrf('/inscription');
  return c.request('/inscription', {
    method: 'POST',
    form: { _csrf, username, email: `${username}@example.com`, password, confirm: password, faction: 'jedi' },
  });
}

test("la page d'accueil affiche les articles de démonstration", async () => {
  const { res, text } = await client().request('/');
  assert.equal(res.status, 200);
  assert.match(text, /Faucon Millenium/);
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
});

test('recherche et filtre par catégorie', async () => {
  const c = client();
  const { text } = await c.request('/?q=Tatooine');
  assert.match(text, /planète aux deux soleils/);
  const { text: sith } = await c.request('/?categorie=sith');
  assert.match(sith, /Règle des Deux/);
  assert.doesNotMatch(sith, /Faucon Millenium/);
});

test('inscription, connexion et déconnexion', async () => {
  const c = client();
  const { res } = await register(c, 'luke');
  assert.equal(res.status, 302);

  const { text } = await c.request('/');
  assert.match(text, /Déconnexion/);

  const row = db.prepare('SELECT password_hash FROM users WHERE username = ?').get('luke');
  assert.match(row.password_hash, /^\$2[aby]\$12\$/, 'le mot de passe est haché avec bcrypt');

  const _csrf = await c.csrf('/');
  await c.request('/deconnexion', { method: 'POST', form: { _csrf } });
  const { text: after } = await c.request('/');
  assert.doesNotMatch(after, /Déconnexion/);

  const c2 = client();
  const t = await c2.csrf('/connexion');
  const bad = await c2.request('/connexion', { method: 'POST', form: { _csrf: t, login: 'luke', password: 'mauvais-mdp-1' } });
  assert.equal(bad.res.status, 401);
  const ok = await c2.request('/connexion', { method: 'POST', form: { _csrf: t, login: 'luke@example.com', password: 'MotDePasse123' } });
  assert.equal(ok.res.status, 302);
});

test('refuse un mot de passe faible et un nom déjà pris', async () => {
  const weak = await register(client(), 'leia', 'court');
  assert.equal(weak.res.status, 422);
  await register(client(), 'han');
  const dup = await register(client(), 'HAN');
  assert.equal(dup.res.status, 422);
  assert.match(dup.text, /déjà pris/);
});

test('le compte système Holocron ne permet pas de se connecter', async () => {
  const c = client();
  const _csrf = await c.csrf('/connexion');
  const { res } = await c.request('/connexion', { method: 'POST', form: { _csrf, login: 'Holocron', password: '' } });
  assert.equal(res.status, 401);
});

test('les requêtes POST sans jeton CSRF sont rejetées', async () => {
  const c = client();
  await register(c, 'vador');
  const { res } = await c.request('/ecrire', { method: 'POST', form: { title: 'Je suis ton père', category: 'sith', content: 'x'.repeat(60) } });
  assert.equal(res.status, 403);
});

test('les pages protégées redirigent vers la connexion', async () => {
  const { res } = await client().request('/ecrire');
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/connexion');
});

test("création d'article, XSS neutralisé, droits d'édition", async () => {
  const author = client();
  await register(author, 'obiwan');
  let _csrf = await author.csrf('/ecrire');
  const content = '## Hello there\n\nGeneral Kenobi! <script>alert(1)</script><img src=x onerror=alert(2)> [lien](javascript:alert(3))';
  const created = await author.request('/ecrire', { method: 'POST', form: { _csrf, title: 'Hello there', category: 'jedi', content } });
  assert.equal(created.res.status, 302);
  const url = created.res.headers.get('location');
  assert.equal(url, '/articles/hello-there');

  const { text } = await author.request(url);
  assert.match(text, /<h2>Hello there<\/h2>/);
  assert.doesNotMatch(text, /<script>alert/);
  assert.doesNotMatch(text, /onerror/);
  assert.doesNotMatch(text, /javascript:/);

  // Un autre utilisateur ne peut ni modifier ni supprimer.
  const other = client();
  await register(other, 'grievous');
  _csrf = await other.csrf('/');
  const edit = await other.request(`${url}/modifier`);
  assert.equal(edit.res.status, 403);
  const del = await other.request(`${url}/supprimer`, { method: 'POST', form: { _csrf } });
  assert.equal(del.res.status, 403);

  // Il peut commenter (le HTML est échappé).
  const com = await other.request(`${url}/commentaires`, { method: 'POST', form: { _csrf, body: '<b>Kenobi</b>' } });
  assert.equal(com.res.status, 302);
  const { text: withComment } = await other.request(url);
  assert.match(withComment, /&lt;b&gt;Kenobi&lt;\/b&gt;/);

  // L'auteur peut supprimer.
  _csrf = await author.csrf(url);
  const ok = await author.request(`${url}/supprimer`, { method: 'POST', form: { _csrf } });
  assert.equal(ok.res.status, 302);
  assert.equal((await author.request(url)).res.status, 404);
});

test('changer de mot de passe déconnecte les autres sessions', async () => {
  const a = client();
  await register(a, 'yoda');
  const b = client();
  const t = await b.csrf('/connexion');
  await b.request('/connexion', { method: 'POST', form: { _csrf: t, login: 'yoda', password: 'MotDePasse123' } });
  assert.match((await b.request('/')).text, /Déconnexion/);

  const _csrf = await a.csrf('/mon-compte');
  const r = await a.request('/mon-compte/mot-de-passe', {
    method: 'POST',
    form: { _csrf, current: 'MotDePasse123', password: 'NouveauMdp4567', confirm: 'NouveauMdp4567' },
  });
  assert.equal(r.res.status, 302);
  assert.match((await a.request('/mon-compte')).text, /Mon compte/);
  assert.doesNotMatch((await b.request('/')).text, /Déconnexion/);
});

test("pas de redirection ouverte après connexion", async () => {
  const { safeReturnTo } = require('../src/security');
  assert.equal(safeReturnTo('//evil.com'), '/');
  assert.equal(safeReturnTo('/\\evil.com'), '/');
  assert.equal(safeReturnTo('https://evil.com'), '/');
  assert.equal(safeReturnTo('/ecrire'), '/ecrire');
});
