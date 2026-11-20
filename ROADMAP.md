# Roadmap

Plainview is a reader for plain-text formats, not a Markdown-only extension. The format registry,
renderers and source highlighter are separate modules, so a new format does not require a UI
rewrite.

## Current

| Format | Tree / view | Source highlighting |
|---|---|---|
| Markdown (GFM/CommonMark) | HTML, Contents, math, Mermaid | yes |
| JSON / JSONC | searchable tree, JSONPath/JMESPath | yes |
| XML | searchable element tree, XPath | yes |
| YAML | collapsible tree, search | yes |
| TOML | collapsible tree, search | yes |
| CSV / TSV | virtualized table, search, filters | yes |
| Logs | wide monospace reader | yes |
| Swagger / OpenAPI | structured JSON or YAML view | yes |

## Next formats

| Format | Detected by | View | Status |
|---|---|---|---|
| JSON5 | `.json5`; `application/json5` | tree, reusing the JSON view | planned |
| INI | `.ini`, `.cfg`; `text/plain` with extension | sections and keys | later |

## How a format is added

1. Add the extension and MIME types to `src/core/formats.js`.
2. Add a parser module that returns plain data, never DOM from untrusted input.
3. Add a view module that builds DOM with the shared `createElement()` helper and data toolbar.
4. Add a source highlighter under `src/formats/source/*.js` and register it.
5. Add fixtures and tests in `tests/data.test.mjs`.
6. Keep the same limits: no code execution, no remote requests, bounded tree size, escaped text.

## Non-goals

- Executing raw HTML or MDX/JSX.
- Remote rendering or uploading documents.
- A browser-controlled OS file association. That remains an OS setting; the extension explains how
  to set it.
