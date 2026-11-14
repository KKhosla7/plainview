# Contributing

## Setup

```bash
npm install
npx playwright install chromium
```

## Checks

```bash
npm test
npm run lint:firefox
npm run package
```

## Adding a format

1. Add the extension and MIME types in `src/formats.js`.
2. Add a parser that returns data, not untrusted DOM.
3. Add a view that builds DOM with `MDView.createElement()`.
4. Add a source highlighter and register it in `src/source-highlight-core.js`.
5. Add fixtures and tests.
6. Keep the no-remote-code, no-execution, bounded-size rules.

## Style

- Keep decisions and status out of the rendered page unless they come from the document itself.
- One module has one job; avoid large orchestrators.
- Use the existing visual tokens and components.
- Do not add analytics, remote fonts, remote scripts or a build-time network dependency.
