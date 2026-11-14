# Store listing copy

## Name

Plainview — Markdown, JSON & XML reader

## Short description (Chrome, 132 characters max)

Open Markdown, JSON and XML files as readable documents with Mermaid, tree views, source highlighting and download.

## Detailed description

Plainview turns the browser's raw text view into a reader.

Open a local or web `.md`, `.json` or `.xml` file and Plainview renders it as a
document:

- Markdown (GFM/CommonMark) with a Contents panel, code copy and Mermaid diagrams.
- JSON and JSONC as a collapsible tree, with expand/collapse, copy and source view.
- XML as a collapsible element tree with attributes, text, CDATA and comments.
- HTML and Source views, with the selected view remembered per file.
- Reading position remembered per file.
- Light and Dark themes, remembered across sessions.
- Content zoom without changing browser zoom.
- Syntax-highlighted source, Copy source and Download.
- No analytics, no telemetry, no remote code and no remote fonts.

Everything is rendered locally. Markdown raw HTML is escaped and links are
sanitized.

Firefox note: Firefox already has its own JSON viewer; Plainview leaves that
native viewer in place and adds the Markdown and XML readers.

## Category

Productivity, Developer Tools.

## Single purpose

Render Markdown, JSON and XML documents that the browser would otherwise show
as raw text.

## Permission justification

- `storage` — remembers theme, zoom, view and reading position.
- `downloads` — optional setting: open a supported download in a new tab. The setting is off by default; the extension does not read the user's download history.
- `clipboardWrite` — Copy source and Copy code buttons.
- `notifications` — a one-time browser notification after an update, linking to the release notes. No data is collected.
- Web page access — content scripts run on http/https pages to detect a
  Markdown/JSON/XML document by MIME type and extension, then replace only that
  document's view. No page data is collected or transmitted.
- File URL access — optional, so local downloaded documents can be rendered.
  The user enables it in the extension settings.

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
- YAML and TOML are not rendered.
- JSON/XML trees stop at 40,000 nodes; source highlighting stops at 1.5 MB.
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
