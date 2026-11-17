# Local-only workflow

Everything below happens on this machine. The local workflow does not run
`git add`, `git commit`, `git push`, or any remote GitHub action.

## 1. Build from this folder

```bash
cd playground/plainview
npm install
npm run build
npm test
```

`npm run build` writes only to `dist/`, which is git-ignored. `npm run package`
also builds the source ZIP from the working tree, not from a git revision.

## 2. Load the unpacked extension

### Chrome / Chromium

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select `dist/chrome`.
4. On the Plainview card, open **Details** and enable **Allow access to file URLs**.
5. Open a local `.md`, `.json`, `.xml`, `.yaml`, `.csv` or `.tsv` file.

After rebuilding, click **Reload** on the extension card and refresh open document
tabs. Content scripts do not update in tabs that were already open.

### Firefox

```bash
npm run build
```

Open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → select
`dist/firefox/manifest.json`.

Temporary Firefox add-ons do not receive `file://` access. Use a local server for
local files:

```bash
cd /path/to/documents
python3 -m http.server 8000
```

Then open `http://localhost:8000/tool-output.json` and the other supported files.

## 3. What stays local

- Document parsing, JSONPath queries, code highlighting, KaTeX math and Mermaid
  rendering all run in the extension from packaged files.
- There are no CDN, Google Fonts, telemetry or release-note requests.
- Clipboard writes and downloads are user-triggered.
- Supported downloads are cancelled, removed and opened in a local extension viewer tab first. The
  viewer's Download button saves the original file when you want it.
- Source-change polling reads back the same document URL; it never uploads it.
- `npm run package` produces `dist/plainview-<version>-source.zip` without using
  a git revision.

## Browser download note

Browsers may download `text/csv` and `application/yaml` responses instead of
rendering them. If a local server sends those MIME types, either serve the file as
`text/plain` or open the downloaded file from disk. The extension identifies the
format by extension in both cases.
