# Plainview release checklist

## Current status

- Chrome extension: 19/19 Playwright tests pass against `dist/chrome`.
- Firefox: smoke-tested Markdown, Mermaid, source view, theme, XML and the
  error path. Firefox JSON is handled by Firefox's native JSON viewer.
- Firefox `web-ext lint`: 0 errors, 10 warnings (vendored Mermaid `innerHTML`
  and the lazy dynamic import; no eval, no remote code).
- Package version: 0.3.0. Bump to 1.0.0 for the first public release if desired.

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
```

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
   - open the toolbar Settings page and confirm the download auto-open toggle persists.
8. Submit for review. Broad host access and file access will be reviewed.

## Firefox Add-ons (AMO)

1. Create an AMO developer account.
2. `npm run lint:firefox` must stay at 0 errors.
3. Package `dist/plainview-firefox-<version>.zip`.
4. Sign with `web-ext sign` (API key and secret) or upload the ZIP to AMO.
5. Signing is required for permanent installation. `about:debugging` temporary
   add-ons accept the unsigned ZIP.
6. Test in Firefox 142+: Markdown, Mermaid, Source, theme, XML, and the native
   Firefox JSON viewer.
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
- Re-run `npm test`, `npm run package` and `npm run lint:firefox`.
