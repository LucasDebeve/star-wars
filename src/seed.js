'use strict';

// Articles de démonstration publiés au premier démarrage.
const seedArticles = [
  {
    slug: 'la-voie-de-la-force',
    title: 'La Voie de la Force : comprendre le Code Jedi',
    category: 'jedi',
    date: '2026-10-01 09:00:00',
    excerpt: "Il n'y a pas d'émotion, il y a la paix. Plongée dans le code qui a guidé l'Ordre Jedi pendant plus de mille générations.",
    content: `> « Il n'y a pas d'émotion, il y a la paix. »

Pendant plus de mille générations, les **Chevaliers Jedi** ont été les gardiens de la paix et de la justice dans la République Galactique. Leur discipline reposait sur un code simple en apparence, mais d'une exigence redoutable.

## Le Code

- Il n'y a pas d'émotion, il y a la paix.
- Il n'y a pas d'ignorance, il y a la connaissance.
- Il n'y a pas de passion, il y a la sérénité.
- Il n'y a pas de chaos, il y a l'harmonie.
- Il n'y a pas de mort, il y a la Force.

## Un équilibre fragile

Le refus de l'attachement, pilier de l'Ordre, est aussi l'une de ses plus grandes faiblesses. L'histoire d'Anakin Skywalker montre à quel point ce détachement imposé peut pousser un Jedi vers le **Côté Obscur**.

## Et aujourd'hui ?

Luke Skywalker, puis Rey, ont redéfini ce que signifie être Jedi : non plus une institution rigide, mais une relation vivante avec la Force.`,
  },
  {
    slug: 'regle-des-deux',
    title: 'La Règle des Deux : la stratégie millénaire des Sith',
    category: 'sith',
    date: '2026-10-05 18:30:00',
    excerpt: "Toujours deux, il y en a. Ni plus, ni moins. Comment Dark Bane a transformé l'Ordre Sith en une menace invisible.",
    content: `> « Toujours par deux ils vont. Ni plus, ni moins. Un maître et un apprenti. » — Yoda

Après les guerres fratricides qui ont décimé les Sith, **Dark Bane** instaure une règle radicale : un seul Maître, un seul Apprenti.

## Pourquoi deux ?

1. **La discrétion** : deux Sith passent inaperçus là où une armée attire l'attention des Jedi.
2. **La sélection** : l'apprenti doit un jour surpasser — et éliminer — son maître.
3. **La concentration du pouvoir** : la puissance du Côté Obscur n'est plus diluée.

## Le chef-d'œuvre de Palpatine

Mille ans plus tard, Dark Sidious applique la règle à la perfection : sénateur, chancelier puis empereur, il orchestre la chute de la République sans que l'Ordre Jedi ne le démasque.`,
  },
  {
    slug: 'faucon-millenium',
    title: "Le Faucon Millenium : le tas de ferraille le plus rapide de la galaxie",
    category: 'vaisseaux',
    date: '2026-10-09 14:15:00',
    excerpt: 'Le Raid de Kessel en moins de douze parsecs, des modifications douteuses et une légende : tout sur le cargo YT-1300 de Han Solo.',
    content: `> « Il a fait le Raid de Kessel en moins de douze parsecs ! » — Han Solo

Le **Faucon Millenium** est un cargo léger corellien **YT-1300f** profondément modifié. Gagné par Han Solo à Lando Calrissian lors d'une partie de sabacc, il devient le vaisseau le plus célèbre de la Rébellion.

## Fiche technique

| Caractéristique | Valeur |
| --- | --- |
| Constructeur | Corellian Engineering Corporation |
| Longueur | 34,75 m |
| Hyperpropulseur | Classe 0,5 |
| Armement | 2 tourelles laser quadruples |

## Les modifications

Hyperdrive gonflé, blindage renforcé, compartiments de contrebande cachés : le Faucon n'a plus grand-chose d'un cargo d'usine. Ce qui explique aussi ses pannes légendaires…`,
  },
  {
    slug: 'tatooine-deux-soleils',
    title: 'Tatooine, la planète aux deux soleils',
    category: 'planetes',
    date: '2026-10-14 08:45:00',
    excerpt: "Planète désertique de la Bordure Extérieure, Tatooine a vu naître deux Skywalker et changé le destin de la galaxie.",
    content: `Située dans la **Bordure Extérieure**, Tatooine orbite autour de deux étoiles : Tatoo I et Tatoo II. Planète aride, contrôlée par les Hutt, elle semble être le dernier endroit où le destin de la galaxie pourrait se jouer.

## Ses habitants

- Les **Jawas**, ferrailleurs encapuchonnés aux yeux lumineux ;
- Les **Hommes des Sables** (Tuskens), farouches nomades du désert ;
- Les fermiers d'humidité, comme Owen et Beru Lars.

## Lieux emblématiques

**Mos Eisley**, « le plus misérable repaire de racailles et de malfrats », sa cantina et son orchestre. Le **Puits de Carkoon**, demeure du Sarlacc. Et le palais de **Jabba le Hutt**.`,
  },
  {
    slug: 'dark-vador-tragedie',
    title: "Dark Vador : la tragédie d'Anakin Skywalker",
    category: 'personnages',
    date: '2026-10-20 20:00:00',
    excerpt: "L'Élu devait ramener l'équilibre dans la Force. Retour sur la chute et la rédemption du Seigneur Sith le plus célèbre.",
    content: `Né sur Tatooine sans père, découvert par Qui-Gon Jinn, **Anakin Skywalker** est présenté comme l'Élu de la prophétie.

## La chute

Peur de perdre ceux qu'il aime, méfiance envers le Conseil, manipulation patiente de Palpatine : chaque pas éloigne Anakin de la lumière. Sur Mustafar, le duel contre Obi-Wan scelle sa transformation en **Dark Vador**.

## La rédemption

> « Il reste du bon en lui. » — Luke Skywalker

Face à l'Empereur, Vador choisit son fils. En jetant Palpatine dans le puits de l'Étoile de la Mort, il accomplit enfin la prophétie.`,
  },
  {
    slug: 'ordre-de-visionnage',
    title: 'Dans quel ordre regarder la saga ?',
    category: 'films-series',
    date: '2026-10-25 17:00:00',
    excerpt: "Ordre de sortie, ordre chronologique ou « Machete Order » : nos conseils pour découvrir (ou redécouvrir) la saga.",
    content: `Avec neuf films principaux, des spin-offs et de nombreuses séries, se lancer dans Star Wars peut intimider. Voici trois approches.

## 1. L'ordre de sortie

Le plus fidèle à l'expérience originale : on commence par **Un nouvel espoir** (1977). Les révélations gardent tout leur impact.

## 2. L'ordre chronologique

De **La Menace fantôme** à **L'Ascension de Skywalker**, en intercalant *The Clone Wars*, *Andor*, *Rogue One* ou *The Mandalorian*.

## 3. Le Machete Order

IV, V, puis II et III en flashback, avant de conclure avec VI. L'épisode I devient optionnel.

**Notre conseil** : pour une première fois, l'ordre de sortie reste imbattable.`,
  },
];

module.exports = { seedArticles };
