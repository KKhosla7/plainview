# Third-party notices

Plainview bundles these libraries and fonts:

| Component | Version | License | Where |
|---|---|---|---|
| marked | 18.2.0 | MIT | `vendor/marked.umd.js`, `vendor/marked.LICENSE` |
| Mermaid | 11.12.0 | MIT | `vendor/mermaid/`, `vendor/mermaid/LICENSE` |
| Barlow Condensed | Google Fonts | SIL Open Font License 1.1 | `src/fonts/OFL-barlowcondensed.txt` |
| IBM Plex Sans | Google Fonts | SIL Open Font License 1.1 | `src/fonts/OFL-ibmplexsans.txt` |
| IBM Plex Mono | Google Fonts | SIL Open Font License 1.1 | `src/fonts/OFL-ibmplexmono.txt` |

Plainview does not load code or fonts from the network at runtime. Mermaid is
loaded lazily from the packaged extension files, and the fonts are registered
from packaged WOFF2 files.
