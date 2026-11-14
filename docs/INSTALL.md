# Install Plainview

## Chrome / Chromium

### From source

```bash
git clone https://github.com/kk18888678/plainview.git
cd plainview
npm install
npm run build
```

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select `dist/chrome`.
4. On the Plainview card, open **Details** and enable **Allow access to file URLs**.
5. Open a `.md`, `.json` or `.xml` file. The toolbar Settings page is available from the Plainview
   icon.

If you already had Plainview loaded, remove old copies first, click **Reload** on the current card,
then refresh any open document tab. Content scripts do not update in tabs that were already open.

### Store package

`npm run package` creates:

```text
dist/plainview-chrome-<version>.zip
```

That ZIP is what gets uploaded to the Chrome Web Store. Until the store listing is live, use the
unpacked install above.

## Firefox

### Temporary (for testing)

```bash
npm run build
```

Open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → select
`dist/firefox/manifest.json` (or the packaged ZIP). Firefox 142 or newer is required.

Temporary add-ons do **not** receive `file://` access in current Firefox. HTTP-hosted documents work.
For local files, run a local server:

```bash
cd /path/to/markdown-folder
python3 -m http.server 8000
```

Then open `http://localhost:8000/file.md`.

### Permanent / local files

Local `file://` access requires a permanently installed add-on:

1. Sign the Firefox ZIP with AMO (`web-ext sign`) or upload it to addons.mozilla.org.
2. Install the signed XPI.
3. Open `about:addons` → Plainview → **Permissions**.
4. Enable **Access your data for file:// URLs**.
5. Open or drag the local `.md` file again.

Temporary add-ons cannot grant this permission. This is a Firefox platform restriction, not a
Plainview setting.

## Opening downloaded files in the browser

A browser extension cannot change the OS default app. The browser must be the OS handler for the
file type.

### Linux

```bash
xdg-mime query filetype README.md
ls /usr/share/applications | grep -E 'chrome|chromium|firefox'
xdg-mime default google-chrome.desktop text/markdown
xdg-mime default google-chrome.desktop application/json
xdg-mime default google-chrome.desktop application/xml
```

Use the desktop file that exists on your system (`chromium.desktop`, `chromium-browser.desktop`,
`firefox.desktop`, …). Avoid pointing `text/plain` at the browser unless you want every text file to
open there.

### Windows

Settings → Apps → Default apps → Choose defaults by file type → set `.md`, `.json`, `.xml` to Chrome
or Firefox. If the browser is not listed, use “Open with” → “Choose another app” → “Look for another
app”.

### macOS

Select a file in Finder → Get Info → Open with → choose Chrome or Firefox → Change All.

## Optional: open new downloads in Plainview

Click the Plainview toolbar icon → Settings → **Open supported downloads in Plainview**.

When a supported download finishes, Plainview opens it in a new tab. This is off by default. It does
not affect files you click later in your file manager.

## Troubleshooting

- **Nothing happens on a local file:** enable file access (Chrome) or install permanently and grant
  file-URL access (Firefox).
- **Old behaviour after an update:** remove old unpacked copies, click **Reload**, then refresh the
  document tab. Check the extension version in `chrome://extensions` or `about:addons`.
- **Firefox JSON looks different:** Firefox uses its native JSON viewer. Plainview does not inject
  into that privileged viewer.
- **A web server downloads the file instead of opening it:** open the downloaded file locally, or
  enable the optional new-download auto-open setting.
