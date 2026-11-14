# Plainview privacy policy

Plainview renders Markdown, JSON and XML files inside the browser. It is
designed to work locally.

## What Plainview reads

Plainview reads only the content of the document the user opens, so it can
render it. That content stays in the browser tab.

## What Plainview stores

Plainview stores these interface settings in the browser's extension storage:

- selected theme (Light or Dark),
- content zoom level,
- selected view (HTML or Source) per document,
- reading position per document.

These settings stay on the user's device. They are not sent anywhere.

## What Plainview does not do

- No analytics, telemetry, advertising or tracking.
- No collection or sale of personal data.
- No remote code.
- No network request to render a document.
- No remote fonts. The fonts and libraries are bundled with the extension.

The Download button creates a local file from the document the user already
opened. It does not contact a server.

## Permissions

- `storage` — save the interface settings listed above.
- `downloads` — only when the user enables “Open supported downloads in Plainview”; used to notice when a supported file finishes downloading and open it in a tab. The extension does not read or transmit download history.
- `clipboardWrite` — copy source or code when the user clicks a Copy button.
- Access to web pages — the extension must inspect the document type of the
  page to decide whether it is Markdown, JSON or XML. It does not read or send
  page data for any other purpose.
- Access to file URLs — optional; the user enables it in the browser so local
  downloaded files can be rendered.

## Contact

Add the owner's support email before publishing this policy.

Last updated: 2026-11-14
