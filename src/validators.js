'use strict';

const { CATEGORIES, FACTIONS } = require('./db');

const str = (v) => (typeof v === 'string' ? v.trim() : '');

function validateRegistration(body) {
  const data = {
    username: str(body.username),
    email: str(body.email).toLowerCase(),
    password: typeof body.password === 'string' ? body.password : '',
    confirm: typeof body.confirm === 'string' ? body.confirm : '',
    faction: str(body.faction),
  };
  const errors = {};
  if (!/^[A-Za-z0-9_-]{3,24}$/.test(data.username)) {
    errors.username = '3 à 24 caractères : lettres, chiffres, « _ » ou « - ».';
  }
  if (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Adresse e-mail invalide.';
  }
  const pwdError = passwordError(data.password);
  if (pwdError) errors.password = pwdError;
  if (data.password !== data.confirm) errors.confirm = 'Les mots de passe ne correspondent pas.';
  if (!FACTIONS.some((f) => f.slug === data.faction)) errors.faction = 'Choisissez une faction.';
  return { data, errors };
}

function passwordError(pwd) {
  if (pwd.length < 10) return 'Au moins 10 caractères.';
  if (pwd.length > 128) return '128 caractères maximum.';
  if (!/[a-z]/i.test(pwd) || !/\d/.test(pwd)) return 'Doit contenir au moins une lettre et un chiffre.';
  return null;
}

function validateArticle(body) {
  const data = {
    title: str(body.title),
    category: str(body.category),
    content: typeof body.content === 'string' ? body.content.replace(/\r\n/g, '\n').trim() : '',
  };
  const errors = {};
  if (data.title.length < 5 || data.title.length > 120) errors.title = 'Le titre doit faire entre 5 et 120 caractères.';
  if (!CATEGORIES.some((c) => c.slug === data.category)) errors.category = 'Catégorie inconnue.';
  if (data.content.length < 50) errors.content = 'Le contenu doit faire au moins 50 caractères.';
  if (data.content.length > 50000) errors.content = 'Le contenu ne doit pas dépasser 50 000 caractères.';
  return { data, errors };
}

function validateComment(body) {
  const data = { body: str(body.body) };
  const errors = {};
  if (data.body.length < 2 || data.body.length > 2000) errors.body = 'Le commentaire doit faire entre 2 et 2000 caractères.';
  return { data, errors };
}

function validateProfile(body) {
  const data = { faction: str(body.faction), bio: str(body.bio) };
  const errors = {};
  if (!FACTIONS.some((f) => f.slug === data.faction)) errors.faction = 'Choisissez une faction.';
  if (data.bio.length > 500) errors.bio = '500 caractères maximum.';
  return { data, errors };
}

module.exports = { validateRegistration, validateArticle, validateComment, validateProfile, passwordError };
