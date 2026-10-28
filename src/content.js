'use strict';

const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');

marked.setOptions({ gfm: true, breaks: false });

// Le Markdown des utilisateurs est converti puis nettoyé : aucun script, style
// ou attribut d'événement ne peut passer (protection XSS).
function renderMarkdown(md) {
  const html = marked.parse(md || '');
  return sanitizeHtml(html, {
    allowedTags: [
      'h2', 'h3', 'h4', 'p', 'br', 'hr', 'blockquote', 'strong', 'em', 'del', 'code', 'pre',
      'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'title'],
      th: ['align'],
      td: ['align'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['https'] },
    transformTags: {
      h1: 'h2',
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow', target: '_blank' }),
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy' } }),
    },
  });
}

function plainText(md) {
  return sanitizeHtml(marked.parse(md || ''), { allowedTags: [], allowedAttributes: {} })
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeExcerpt(md, max = 220) {
  const text = plainText(md);
  if (text.length <= max) return text;
  return text.slice(0, text.lastIndexOf(' ', max) > 0 ? text.lastIndexOf(' ', max) : max) + '…';
}

function slugify(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'article';
}

function readingTime(md) {
  return Math.max(1, Math.round(plainText(md).split(' ').length / 200));
}

module.exports = { renderMarkdown, makeExcerpt, slugify, readingTime };
