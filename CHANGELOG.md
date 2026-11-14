# Changelog

## 1.1.0

- Added Biome 2.6.7 with the all non-nursery rule preset; CI fails on any diagnostic.
- Added `STYLE.md`: formatting, naming, architecture, security and review standards.
- Reformatted the source and fixed unused code, dead CSS, complex functions and unsafe patterns.
- Added a CI lint gate alongside gitleaks, Playwright and `web-ext lint`.
- No runtime behaviour changes.

## 1.0.0

- First stable release.
- Every-page content script reduced to a ~3 KB loader; the ~116 KB reader bundle,
  Mermaid and fonts are loaded only when needed.
- One-time update notification and toolbar badge with a link to release notes.
- Firefox setup documented, including permanent install and file-URL permission.
- Firefox’s native JSON viewer documented.
- Gitleaks scans the full history and working tree in CI.
- Release assets now include Chrome, Firefox and source ZIPs.

## 0.3.0

- Renamed the internal `MDView`/`mdv-*`/`mdview.*` namespace to `Plainview`/`pv-*`/`plainview.*`.
  Existing theme, zoom, view and reading-position settings are migrated once.
- Reorganised `src/` into `app/`, `core/`, `formats/`, `options/`, `styles/` and `fonts/`.
- Fixed CSS for XML documents rendered by Chromium's native XML viewer.
- Added fictional showcase documents and high-resolution screenshots; no real data is used.
- Settings page and optional download auto-open.
- Local fonts; no remote font request.

## 0.2.3

- Added a Settings page with optional download auto-open and OS file-association instructions.
- Copy now uses the Clipboard API with the `clipboardWrite` permission; deprecated `execCommand`
  fallback removed.
- Local WOFF2 fonts; no Google Fonts request.
- New Plainview icon.
- Chrome/Firefox packaging, screenshots and store documentation.
- Firefox lint: 0 errors.

## 0.2.x

- Markdown, JSON/JSONC and XML readers.
- Mermaid, Contents panel, source highlighting, Copy source and Download.
- Light/Dark themes, content zoom, per-document view and reading-position persistence.
- Firefox CSP workaround for Mermaid.
