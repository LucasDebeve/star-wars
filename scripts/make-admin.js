'use strict';

// Usage : npm run make-admin -- <nom_utilisateur>
const { openDatabase } = require('../src/db');

const username = process.argv[2];
if (!username) {
  console.error('Usage : npm run make-admin -- <nom_utilisateur>');
  process.exit(1);
}
const db = openDatabase();
const r = db.prepare("UPDATE users SET role = 'admin' WHERE username = ? AND role != 'system'").run(username);
console.log(r.changes ? `✔ ${username} est maintenant administrateur.` : `✖ Utilisateur « ${username} » introuvable.`);
