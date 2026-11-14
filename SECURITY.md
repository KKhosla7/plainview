# Security

Plainview renders untrusted files locally. The security model is:

- Markdown raw HTML is escaped, not executed.
- Link and image URLs are limited to safe schemes.
- Mermaid uses `securityLevel: 'strict'` and its SVG is sanitised again.
- XML is parsed with `DOMParser`; scripts, external entities and XSLT are not executed by the viewer.
- No document content is uploaded or sent to a network service.
- No remote code or remote fonts are loaded.

Please report a vulnerability privately to the maintainer rather than opening a public issue. Add
the maintainer's security contact here before publishing.

Do not include real credentials, private documents or personal data in a report.
