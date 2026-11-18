# Store listing copy

## Name

Plainview — local file reader

## Short description (Chrome, 132 characters max)

Read local Markdown, JSON, XML, YAML, TOML, CSV and log files with search, tree views and clean exports.

## Detailed description

Plainview turns the browser's raw text view into a reader.

Open a local or web `.md`, `.json`, `.jsonc`, `.yaml`, `.toml`, `.csv`, `.tsv`, `.xml`, `.log` or Swagger/OpenAPI file and Plainview renders it as a document:

- Markdown with Contents, code copy, math and Mermaid diagrams.
- JSON and JSONC as a searchable, virtualized tree with JSONPath/JMESPath queries.
- YAML and TOML trees, CSV/TSV tables with search, filters, sorting and column controls.
- XML trees with attributes, text, CDATA, comments and XPath.
- Swagger/OpenAPI specs as structured data.
- Log files as wide, readable monospace views.
- Light and Dark themes, content zoom and persisted reading position.
- Configurable tree font size, escaped-string formatting and colored indent guides.
- Clean native data exports and self-contained standalone HTML exports.
- No analytics, no telemetry, no remote code and no remote fonts.

Everything is rendered locally. Markdown raw HTML is escaped and links are sanitized.

Firefox note: Firefox may show JSON with its native viewer before Plainview can take over. Other formats use the Plainview reader.

## Category

Productivity, Developer Tools.

## Single purpose

Render supported local and web documents that the browser would otherwise show as raw text.

## Permission justification

- `storage` — remembers theme, zoom, view, reading position and display preferences.
- `clipboardWrite` — Copy source and Copy code buttons.
- Web page access — content scripts run on HTTP/HTTPS/file pages to detect supported documents by MIME type or extension, then replace only that document's view. No page data is collected or transmitted.
- File URL access — optional; the user enables it so local files can be rendered.

## Remote code

No. marked and Mermaid are bundled. Mermaid is loaded from packaged extension
files. Fonts are packaged. There are no remote scripts, styles or fonts.

## Data collection

None. See `PRIVACY.md`.

## Screenshots

- `store/screenshots/markdown-light.png` — Markdown with Contents and rich text
- `store/screenshots/markdown-mermaid.png` — dark theme with a Mermaid diagram
- `store/screenshots/markdown-source.png` — highlighted Markdown source
- `store/screenshots/json.png` — JSON tree
- `store/screenshots/xml.png` — XML tree

## Known limitations

- Firefox JSON opens in Firefox's native JSON viewer; Plainview's JSON tree is
  used in Chromium.
- Raw HTML in Markdown is shown as text, not executed. MDX/JSX is not evaluated.
- JSON/XML trees stop at 40,000 nodes; source highlighting stops at 1.5 MB.
- JSONL is not supported.
- A server that forces a download with `Content-Disposition: attachment` must be
  downloaded and opened locally.
- In Firefox, local `file://` documents require the permanently installed add-on
  and “Access your data for file:// URLs” enabled in about:addons → Plainview →
  Permissions. Temporary add-ons loaded via about:debugging do not get file
  access from Firefox.

## Support / privacy URLs

Host this policy and add its public URL plus a support email in the Chrome Web
Store and AMO dashboards before submitting. The repository itself uses
https://github.com/KKhosla7/plainview/issues for contact.
