# Plainview release checklist

## Current status

- Release `v1.2.0` prepared from `release/1.2.0` (fast-forwarded from `cleanup/1.2.0`).
- Chrome extension: 114/114 tests pass against `dist/chrome`.
- Biome: zero diagnostics with the strict non-nursery preset.
- Firefox: smoke-tested Markdown, Mermaid, source view, theme, XML and the
  error path. Firefox JSON is handled by Firefox's native JSON viewer.
- Firefox `web-ext lint`: 0 errors, 16 warnings (bundled lazy imports and
  vendored Mermaid `innerHTML`; no eval, no remote code).
- Gitleaks scans the working tree and full git history in CI; local scan is clean.
- Code style and review rules are documented in `STYLE.md`.
- Full AST gate: 15 accepted findings (14 config weakening, 1 tooling-only
  `spawnSync` pattern).
- Package version: 1.2.0.

## Build and package

```bash
npm install
npm test
npm run package
```

Artifacts:

```text
dist/plainview-chrome-<version>.zip
dist/plainview-firefox-<version>.zip
dist/plainview-<version>-source.zip
```

Performance after bundling: normal pages load `boot.js` (~6 KB) + `styles.css`
(~63 KB); the reader bundle `app.js` (~259 KB) is imported only for supported
documents.

## Chrome Web Store

1. Create a Chrome Web Store developer account (one-time fee, 2FA).
2. Host `store/PRIVACY.md` at a public URL and put the URL in this checklist.
3. Upload `dist/plainview-chrome-<version>.zip`.
4. Use `store/LISTING.md` for the name, summary, description, single purpose,
   permission justification and remote-code answer.
5. Upload the 1280×800 screenshots from `store/screenshots/`.
6. Upload `assets/icon-128.png` as the store icon.
7. Test the submitted package in a clean Chrome profile:
   - load unpacked from `dist/chrome`,
   - enable “Allow access to file URLs”,
   - open a local `.md`, `.json` and `.xml`,
   - check Source, Copy source, Download, Light/Dark, zoom, Contents and reload
     persistence,
   - open the toolbar Settings page and confirm the remaining toggles persist,
   - bump the extension version and confirm the update notification and NEW badge appear.
8. Submit for review. Broad host access and file access will be reviewed.

## Firefox Add-ons (AMO)

1. Create an AMO developer account.
2. `npm run lint:firefox` must stay at 0 errors.
3. Package `dist/plainview-firefox-<version>.zip`.
4. Sign with `web-ext sign` (API key and secret) or upload the ZIP to AMO.
5. Signing is required for permanent installation. `about:debugging` temporary
   add-ons accept the unsigned ZIP.
6. Test in Firefox 142+: Markdown, Mermaid, Source, theme, XML, and the native
   Firefox JSON viewer. Bump the version once to verify the update notification.
7. For local file testing in Firefox, install the signed XPI permanently and enable
   about:addons → Plainview → Permissions → “Access your data for file:// URLs”.
   Temporary add-ons from about:debugging do not receive file access.
8. Confirm `data_collection_permissions: { required: ["none"] }` in the built
   manifest.

## Before the first public release

- Host the privacy policy and add the support email.
- Confirm the project licence (MIT is included as a starting point).
- Confirm the Firefox minimum version (currently 142.0).
- Review the permission justification with the store reviewers' wording.
- Write `store/release-notes/<version>.md` before tagging.
- Run `npm run lint` with zero diagnostics.
- Re-run `npm run lint`, `npm test`, `npm run package` and `npm run lint:firefox`.
