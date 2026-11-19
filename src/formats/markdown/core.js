import { createElement } from '../../core/dom.js';
import { valueKind } from '../../core/value.js';

/* global marked, Plainview */
/*
 * Markdown parsing and DOM hardening. Raw HTML is deliberately escaped: a
 * downloaded .md file is untrusted input and must not run script.
 */
((root) => {
  const HtmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  let parser = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/gu, (ch) => HtmlEscapes[ch]);
  }

  function createParser() {
    const instance = new marked.Marked({
      gfm: true,
      breaks: false,
      pedantic: false,
    });

    instance.use({
      renderer: {
        html(token) {
          const escaped = escapeHtml(token.text);
          return token.block ? `<div class="pv-raw-html">${escaped}</div>\n` : escaped;
        },
      },
    });

    return instance;
  }

  function renderMarkdown(source) {
    if (!parser) {
      parser = createParser();
    }

    return parser.parse(String(source ?? ''));
  }

  /**
   * Return a URL that is safe to put in href/src, or null when it is not.
   * Relative URLs stay relative so they resolve against the markdown file.
   */
  function sanitizeUrl(raw, kind) {
    if (valueKind(raw) !== 'string') {
      return null;
    }
    const value = raw.trim();
    if (!value) {
      return null;
    }

    if (value.startsWith('#')) {
      return value;
    }

    let parsed;
    try {
      parsed = new URL(value, document.baseURI);
    } catch {
      return null;
    }

    const protocol = parsed.protocol.toLowerCase();

    if (kind === 'image') {
      if (protocol === 'data:') {
        return /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp);/iu.test(value) ? value : null;
      }

      return ['http:', 'https:', 'file:'].includes(protocol) ? value : null;
    }

    return ['http:', 'https:', 'mailto:', 'file:'].includes(protocol) ? value : null;
  }

  function sanitizeLinks(article) {
    for (const link of article.querySelectorAll('a[href]')) {
      const safe = sanitizeUrl(link.getAttribute('href'), 'link');
      if (safe === null) {
        link.removeAttribute('href');
        link.classList.add('pv-link-blocked');
        link.setAttribute('title', 'Blocked unsafe link');
      } else {
        link.setAttribute('href', safe);
      }
    }
  }

  function sanitizeImages(article) {
    for (const image of article.querySelectorAll('img[src]')) {
      const safe = sanitizeUrl(image.getAttribute('src'), 'image');
      if (safe === null) {
        const blocked = createElement('span');
        blocked.className = 'pv-image-blocked';
        blocked.textContent = image.alt ? `[blocked image: ${image.alt}]` : '[blocked image]';
        image.replaceWith(blocked);
        continue;
      }
      image.setAttribute('src', safe);
      image.setAttribute('loading', 'lazy');
      image.setAttribute('decoding', 'async');
    }
  }

  function sanitizeArticle(article) {
    sanitizeLinks(article);
    sanitizeImages(article);
  }

  function slugify(text) {
    const slug = String(text ?? '')
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/[\s-]+/gu, '-')
      .replace(/^-+|-+$/gu, '');
    return slug || 'section';
  }

  function createIdFactory(used) {
    return function nextId(text) {
      const base = slugify(text);
      let candidate = base;
      let n = 1;
      while (used.has(candidate)) {
        candidate = `${base}-${n}`;
        n += 1;
      }
      used.add(candidate);
      return candidate;
    };
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    escapeHtml,
    renderMarkdown,
    sanitizeArticle,
    createIdFactory,
  });
})(globalThis);
