'use strict';

const { openDatabase } = require('./db');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (isProd) {
    console.error('SESSION_SECRET doit être défini en production.');
    process.exit(1);
  }
  console.warn('⚠  SESSION_SECRET non défini : un secret temporaire est utilisé (les sessions ne survivront pas au redémarrage).');
}

const db = openDatabase();
const app = createApp({
  db,
  sessionSecret,
  secureCookies: isProd,
  trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY : false,
});

app.listen(PORT, () => {
  console.log(`✦ HoloNet en ligne sur http://localhost:${PORT} — Que la Force soit avec vous.`);
});
