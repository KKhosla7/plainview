const Formats = {
  markdown: {
    id: 'markdown',
    label: 'MD',
    name: 'Markdown',
    extensions: ['md', 'markdown', 'mdown', 'mkd', 'mkdn', 'mdwn', 'mdx'],
    types: ['text/markdown', 'text/x-markdown'],
  },
  json: {
    id: 'json',
    label: 'JSON',
    name: 'JSON',
    extensions: ['json', 'jsonc', 'geojson', 'jsonld', 'har', 'webmanifest'],
    types: [
      'application/json',
      'text/json',
      'application/ld+json',
      'application/manifest+json',
      'application/geo+json',
    ],
  },
  swagger: {
    id: 'swagger',
    label: 'SWAGGER',
    name: 'Swagger / OpenAPI',
    extensions: ['swagger', 'openapi'],
    types: ['application/vnd.oai.openapi', 'application/vnd.oai.openapi+json'],
  },
  logs: {
    id: 'logs',
    label: 'LOGS',
    name: 'Logs',
    extensions: ['log', 'logs', 'out', 'err'],
    types: ['text/x-log'],
  },
  yaml: {
    id: 'yaml',
    label: 'YAML',
    name: 'YAML',
    extensions: ['yaml', 'yml'],
    types: ['application/yaml', 'text/yaml', 'application/x-yaml', 'text/x-yaml'],
  },
  toml: {
    id: 'toml',
    label: 'TOML',
    name: 'TOML',
    extensions: ['toml'],
    types: ['application/toml', 'text/toml', 'application/x-toml'],
  },
  csv: {
    id: 'csv',
    label: 'CSV',
    name: 'CSV',
    extensions: ['csv'],
    types: ['text/csv', 'application/csv'],
  },
  tsv: {
    id: 'csv',
    label: 'TSV',
    name: 'TSV',
    delimiter: '\t',
    extensions: ['tsv'],
    types: ['text/tab-separated-values'],
  },
  xml: {
    id: 'xml',
    label: 'XML',
    name: 'XML',
    extensions: ['xml', 'rss', 'atom', 'rdf', 'opml', 'wsdl', 'plist', 'xsl', 'xslt'],
    types: [
      'application/xml',
      'text/xml',
      'application/rss+xml',
      'application/atom+xml',
      'application/rdf+xml',
      'application/xslt+xml',
      'application/plist+xml',
    ],
  },
};

const TextualTypes = new Set(['', 'text/plain', 'application/octet-stream']);
const SkipTypes = new Set(['text/html', 'application/xhtml+xml', 'image/svg+xml']);

function extensionOf(pathname) {
  const last = pathname.split('/').pop() || '';
  const dot = last.lastIndexOf('.');
  if (dot < 0 || dot === last.length - 1) {
    return '';
  }

  return last.slice(dot + 1).toLowerCase();
}

function formatByExtension(extension) {
  for (const format of Object.values(Formats)) {
    if (format.extensions.includes(extension)) {
      return format;
    }
  }

  return null;
}

function formatByType(contentType) {
  for (const format of Object.values(Formats)) {
    if (format.types.includes(contentType)) {
      return format;
    }
  }

  return null;
}

function shouldSkip(type, extension) {
  if (SkipTypes.has(type)) {
    return true;
  }

  if (type.startsWith('image/')) {
    return true;
  }

  if (type.startsWith('audio/') || type.startsWith('video/')) {
    return true;
  }

  return extension === 'svg';
}

export function detectFormat(contentType, pathname) {
  const type = String(contentType || '')
    .toLowerCase()
    .split(';')[0]
    .trim();
  const extension = extensionOf(pathname);
  const fileName = pathname.split('/').pop() || '';
  if (/^(?:swagger|openapi)\.(?:json|ya?ml)$/iu.test(fileName)) {
    return Formats.swagger;
  }

  if (shouldSkip(type, extension)) {
    return null;
  }

  const byType = formatByType(type);
  if (byType) {
    return byType;
  }

  if (TextualTypes.has(type) || !type) {
    return formatByExtension(extension);
  }

  return null;
}
