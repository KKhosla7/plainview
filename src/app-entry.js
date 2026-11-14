/*
 * The reader bundle. It is imported only for supported documents, so normal
 * pages pay only for boot.js and the manifest stylesheet.
 */
import { Marked } from 'marked';
import 'virtual:viewer-css';

import './core/settings.js';
import './core/dom.js';
import './core/scroll-utils.js';
import './core/clipboard.js';
import './core/download.js';
import './core/fonts.js';
import './formats/shared/error-panel.js';
import './formats/markdown/core.js';
import './formats/markdown/enhance.js';
import './formats/markdown/title-block.js';
import './formats/source/core.js';
import './formats/source/markdown.js';
import './formats/source/json.js';
import './formats/source/xml.js';
import './formats/json/parse.js';
import './formats/shared/data-toolbar.js';
import './formats/json/view.js';
import './formats/xml/parse.js';
import './formats/xml/render.js';
import './formats/xml/view.js';
import './formats/mermaid/svg-sanitize.js';
import './formats/mermaid/loader.js';
import './app/topbar.js';
import './app/scroll-spy.js';
import './app/toc.js';
import './app/zoom.js';
import './app/theme.js';
import './app/view-switcher.js';
import './core/scroll-memory.js';
import './core/xml-shell.js';
import './app/ui.js';

globalThis.marked = { Marked };
