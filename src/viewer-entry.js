/* global Plainview */
/*
 * Standalone extension page for supported files that the browser would
 * otherwise download. It fetches the original URL with extension host
 * permissions, then mounts the same reader used by content scripts.
 */
import './core/formats.js';
import './app-entry.js';
import './viewer-main.js';
