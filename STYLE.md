# Plainview code style

This is the source of truth for formatting, naming, architecture and review standards in Plainview.
It applies to every file in the repository. **Biome is the formatter and linter; CI fails on any
diagnostic, including informational suggestions.**

## 1. Tooling

```bash
npm run lint        # Biome check through scripts/lint.mjs; any diagnostic fails
npm run lint:fix    # Biome check --write (safe fixes + formatting)
npm run format      # Biome formatter only
npm run lint:firefox
npm test
npm run package
```

Rules and exceptions live in [`biome.json`](biome.json). Gitleaks runs in CI for secrets. Firefox
manifest/API checks use `web-ext lint`. Behaviour is covered by Playwright.

Biome is a development dependency. It is not shipped in the Chrome or Firefox ZIPs.

## 2. Formatting

Biome enforces all of this:

| Rule | Value |
|---|---|
| Indentation | 2 spaces, soft tabs |
| Line width | 100 columns |
| Quotes | single quotes in JavaScript |
| Semicolons | always |
| Trailing commas | all where valid |
| Arrow parentheses | always |
| Line endings | LF |
| Final newline | required |
| JSON | no trailing commas |
| CSS | Biome formatter |

Do not hand-format around Biome. Run `npm run lint:fix` and commit the result.

## 3. Naming

| Thing | Convention | Example |
|---|---|---|
| Global reader namespace | PascalCase | `Plainview` |
| Module-level constant | PascalCase | `MaxNodes`, `AssetPath` |
| Function / local variable | camelCase | `renderBlock`, `savedView` |
| CSS class / variable | `pv-` / `--pv-` | `.pv-toc-link`, `--pv-fg` |
| Data attribute | `data-pv-*` | `data-pv-format` |
| Extension storage | `plainview.*` | `plainview.theme` |
| Source file | kebab-case | `markdown-enhance.js` |
| Test name | lower-case sentence | `renders an XML tree` |

Exported `Plainview` registry keys that mirror settings or storage keep UPPER_SNAKE names
(`Plainview.THEME_KEY`, `Plainview.ZOOM_KEY`).

## 4. Architecture

```text
src/boot-entry.js + src/boot.js   tiny detector; runs on every page
src/app-entry.js                  reader bundle; imported only for supported documents
src/app/                          shell, top bar, Contents, zoom, theme, view switcher
src/core/                         dom, formats, document, XML shell, settings, clipboard,
                                  downloads, fonts, scrolling, reading-position memory
src/formats/markdown/             marked, enhancements, title block
src/formats/json/                  JSON/JSONC parser and tree
src/formats/xml/                   XML parser, tree renderer and document
src/formats/mermaid/               lazy Mermaid loader and SVG sanitiser
src/formats/source/                Markdown/JSON/XML source highlighters
src/formats/shared/                data toolbar and error panel
src/options/                       settings page
src/styles/                        tokens, layout, themes, data trees, source tokens
src/fonts/                         WOFF2 files and OFL licences
```

- One module, one job. Split a module when it starts owning unrelated concerns.
- Keep the every-page `boot.js` tiny. Never import a format renderer, marked, Mermaid or a font into
  the boot bundle.
- Format-specific work stays under `src/formats/<format>/`. Do not import one format renderer from
  another.
- Shared services go in `src/core/`. UI composition goes in `src/app/`.
- Side-effect import order in `src/app-entry.js` is deliberately explicit. Do not enable import
  sorting; the IIFE modules depend on earlier globals.
- New formats use the registry in `src/core/formats.js`, a parser, a view, a source highlighter and
  fixtures. Follow [ROADMAP.md](ROADMAP.md).

## 5. JavaScript

- Strict mode through the existing IIFE pattern; no globals beyond `Plainview`.
- `const` by default, `let` only when reassignment is required. Never `var`.
- Prefer early returns over deep nesting. No `else` after a `return`.
- Always use block statements and braces, even for one-line bodies.
- Keep functions under 80 lines and cognitive complexity at or below 25. Split before raising the
  limit.
- At most 5 parameters. Pass an options object or a shared context when more state is needed.
- No assignment inside expressions (including `while ((m = re.exec(x)))`). Assign first, then test.
- No unnecessary optional chaining where the value is guaranteed.
- No unnecessary conditions; do not test values the runtime already guarantees.
- Use `textContent` for untrusted text. Never concatenate untrusted HTML.
- `innerHTML` is allowed only for renderer output that has already been escaped and sanitised, and
  for source-highlighter output built from escaped text.
- No `eval`, `new Function`, `document.write`, remote scripts, remote fonts or remote code.
- Empty catch blocks are not allowed. Best-effort optional APIs must have a comment explaining the
  fallback, and no error may disappear silently in a user-visible path.
- Console output is allowed only for deliberate diagnostics and CLI scripts. Existing exceptions are
  documented with `// biome-ignore`.
- Avoid magic numbers when a named constant makes the intent clearer. Test thresholds and local
  offsets may stay literal.

## 6. CSS

- Every colour comes from a `--pv-*` token. Hex values live in token definitions, not in component
  rules. (`noHexColors` is disabled for the token files, so this is a review rule.)
- Prefix every class with `pv-`; scope rules under `html[data-pv]` or `html[data-pv-format]`.
- Use the design tokens: `--pv-bg`, `--pv-bg-soft`, `--pv-paper` equivalents, `--pv-fg`,
  `--pv-fg-muted`, `--pv-border`, `--pv-accent`, `--pv-danger`, `--pv-code-*`.
- `!important` is reserved for print and narrow-screen overrides where the cascade cannot be
  expressed otherwise. Add a comment when it is used.
- Wide tables, code and diagrams scroll inside their own wrapper; the page never scrolls sideways.
- Keep touch targets and focus-visible outlines intact.
- Avoid descending-specificity surprises. If two unrelated component rules must be ordered a
  particular way, document the exception with a CSS `biome-ignore` comment.

## 7. HTML and accessibility

- Real elements first: `button`, `a`, `main`, `nav`, `header`, `label`, `details`.
- Every control has an accessible name. Icon-only controls get `aria-label`.
- The selected view/theme uses `aria-selected`/`aria-pressed`, not colour alone.
- Focus must remain visible. Keyboard Escape closes drawers; tabs support arrow-key switching.
- Images have `alt` text (empty when decorative).
- Do not autofocus or add positive `tabindex`.

## 8. Comments and suppressions

- Comments explain **why**, not what the next line already says.
- No commented-out code, no TODO/FIXME without an issue, no decorative banners inside functions.
- A suppression must name the rule and a reason:
  ```js
  // biome-ignore lint/performance/noAwaitInLoops: sequential rendering keeps Mermaid state deterministic
  await renderBlock(...);
  ```
- A suppression that is no longer needed is removed. `suppressions/unused` is a lint failure.
- The only legacy identifier kept intentionally is the `mdview.` storage prefix used by the
  one-time settings migration.

## 9. Security and privacy

- Treat every opened document as untrusted.
- Escape raw HTML in Markdown. Sanitise every URL before setting `href` or `src`.
- Mermaid uses `securityLevel: 'strict'` and its SVG is sanitised again.
- XML uses `DOMParser`; never execute XSLT, external entities or scripts from the document.
- No telemetry, analytics, remote fonts, remote code or document upload.
- Gitleaks must stay clean in the working tree and full history.
- New permissions need a store justification and a privacy-policy update.

## 10. Tests and fixtures

- Every user-visible behaviour has a Playwright test. Every new format gets parser, renderer and
  source-highlighting tests.
- Fixtures are synthetic. Never include real personal data, customer data, tokens, credentials or
  private documents.
- Prefer role/locator queries and explicit waits over fixed sleeps.
- A test must clean up its page and leave shared storage/view state predictable.
- Update the fixture and the assertion together; do not “fix” a test by weakening the assertion.

## 11. Commits and releases

- One logical change per commit. Conventional summary, e.g.
  `fix(xml): style native viewer documents`.
- Run before every commit:
  ```bash
  npm run lint
  npm test
  npm run lint:firefox
  ```
- Every release:
  1. Bump `package.json` and `src/manifest.json` together.
  2. Write `store/release-notes/<version>.md`.
  3. Update `CHANGELOG.md`.
  4. Run `npm run package`; confirm Chrome, Firefox and source ZIPs.
  5. Tag `v<version>`; the release workflow attaches all three ZIPs.
- A release notes file must say what Plainview is, what changed, how to install and what is known
  to be limited.

## 12. Biome exceptions

The linter preset is **all** non-nursery rules. These rules are deliberately off, with reasons:

| Rule | Why |
|---|---|
| `correctness/useQwikValidLexicalScope` | Qwik-specific; not a Qwik project |
| `correctness/noUnresolvedImports` | esbuild virtual CSS and Playwright type exports are false positives |
| `security/noSecrets` | Gitleaks is the authoritative secret scanner |
| `suspicious/useBaseline` | Targets Chrome 120+ and Firefox 142+, which support the CSS used |
| `performance/useTopLevelRegex` | Regexes are compiled per document; clarity wins for these small parsers |
| `style/noTernary` | Simple local ternaries are allowed |
| `style/noHexColors` | Hex values are the token definitions |
| `style/noMagicNumbers` | Local offsets and test thresholds are explicit |
| `style/noContinue` | `continue` is clearer than nesting in scroll/render loops |
| `style/useNamedCaptureGroup` | The regexes are small and single-purpose |
| `style/useGlobalThis` | `window` is deliberate for browser APIs |
| `style/useDomQuerySelector` | `getElementById` is deliberate and faster |
| `style/useNamingConvention` | Manifest keys and exported registry keys use platform names |
| `complexity/noImportantStyles` | Print and narrow-screen overrides require it |

File-scoped overrides allow Node APIs and console output in `scripts/` and Playwright waiting
patterns in `tests/`. They do not apply to extension code.

## 13. Review checklist

1. Does `npm run lint` pass with zero diagnostics?
2. Do all tests pass without weakening assertions?
3. Is every new module in the right layer with one job?
4. Are all colours/fonts from tokens and all remote resources absent?
5. Is untrusted content escaped and sanitised?
6. Are new permissions justified in `store/LISTING.md` and `store/PRIVACY.md`?
7. Is the every-page bundle still tiny, or did a format module leak into `boot.js`?
8. Are suppressions documented, current and necessary?
9. Does the release notes file describe what Plainview is and what changed?
10. Does the source ZIP and both extension ZIPs exist for the tag?
