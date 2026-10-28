# ✦ HoloNet — le blog communautaire Star Wars

> *Il y a bien longtemps, dans une galaxie lointaine, très lointaine…*

HoloNet est un site web dynamique où les fans de Star Wars publient et commentent des articles sur l'univers de la saga. Le design reprend les codes de la saga : champ d'étoiles animé, texte déroulant d'introduction, sabres laser qui s'allument au survol, couleurs par faction et par catégorie.

## Fonctionnalités

- **Comptes utilisateurs sécurisés** : inscription, connexion, déconnexion, changement de mot de passe.
- **Choix d'une allégeance** (Jedi, Sith, Alliance Rebelle, Empire, Mandalorien) qui colore votre profil et votre « sabre ».
- **Articles** en Markdown avec aperçu en direct, catégories (Ordre Jedi, Côté Obscur, Vaisseaux, Planètes…), temps de lecture.
- **Recherche**, filtres par catégorie et pagination.
- **Commentaires** sur chaque article.
- **Profils publics** des membres avec leurs publications.
- Modification / suppression réservées à l'auteur (ou à un administrateur).
- Responsive (mobile → desktop) et respect de `prefers-reduced-motion`.

## Démarrage rapide

Prérequis : **Node.js 22.13 ou plus récent** (la base SQLite est intégrée à Node, aucune compilation native).

```bash
npm install
```

```bash
npm start
```

Ouvrez ensuite <http://localhost:3000>. Six articles de démonstration sont créés au premier lancement.

Pour le développement (rechargement automatique) :

```bash
npm run dev
```

Pour lancer les tests :

```bash
npm test
```

Pour donner les droits d'administrateur à un membre :

```bash
npm run make-admin -- NomDuMembre
```

### En production

Copiez `.env.example` en `.env`, renseignez un `SESSION_SECRET` long et aléatoire, puis :

```bash
node --env-file=.env --disable-warning=ExperimentalWarning src/server.js
```

Servez le site en HTTPS (les cookies de session sont marqués `Secure` quand `NODE_ENV=production`) et définissez `TRUST_PROXY=1` derrière un reverse proxy.

## Sécurité

| Menace | Protection |
| --- | --- |
| Vol de mots de passe | Hachage **bcrypt** (coût 12), politique de 10 caractères min. avec lettres et chiffres |
| Force brute | Limitation à 10 tentatives échouées / 15 min par IP sur la connexion et l'inscription |
| Énumération de comptes | Message d'erreur générique et comparaison bcrypt même si le compte n'existe pas |
| Fixation / vol de session | Session régénérée à la connexion, cookie `HttpOnly`, `SameSite=Lax`, `Secure` en production, sessions persistées côté serveur |
| CSRF | Jeton synchroniseur par session vérifié sur chaque requête `POST` |
| XSS | Échappement automatique EJS, Markdown nettoyé avec `sanitize-html`, **Content-Security-Policy** stricte (aucun script inline) |
| Injection SQL | Requêtes préparées exclusivement |
| Clickjacking & en-têtes | `helmet` (CSP, `frame-ancestors 'none'`, HSTS, `X-Content-Type-Options`…) |
| Redirection ouverte | Seules les URL internes sont acceptées après connexion |
| Session compromise | Changer son mot de passe déconnecte toutes les autres sessions |

## Structure

```
src/
  server.js          point d'entrée
  app.js             configuration Express (sécurité, sessions, vues)
  db.js              schéma SQLite et données initiales
  seed.js            articles de démonstration
  security.js        CSRF, contrôle d'accès, redirections sûres
  session-store.js   stockage des sessions dans SQLite
  content.js         rendu Markdown sécurisé, extraits, slugs
  validators.js      validation des formulaires
  routes/            auth, articles & commentaires, profils
views/               gabarits EJS
public/              CSS, JavaScript client, favicon
test/                tests d'intégration (node:test)
```

---

Site de fans non officiel. Star Wars est une marque de Lucasfilm Ltd.
