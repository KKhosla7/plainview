# Changelog

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
