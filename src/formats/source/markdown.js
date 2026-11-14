/* global Plainview */
(function () {
  'use strict';

  const { escapeHtml } = Plainview;
  const { register } = Plainview.sourceHighlight;

  const INLINE =
    /(`[^`\n]*`)|(!?\[[^\]\n]*\]\([^)\n]*\))|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)|(~~[^~\n]+~~)|(<[^>\n]+>)/g;

  function highlightInline(text) {
    let out = '';
    let last = 0;
    let match;
    INLINE.lastIndex = 0;

    while ((match = INLINE.exec(text))) {
      out += escapeHtml(text.slice(last, match.index));
      const token = match[0];

      if (token.startsWith('`')) {
        out += `<span class="pv-syn-code">${escapeHtml(token)}</span>`;
      } else if (token.startsWith('![') || token.startsWith('[')) {
        const link = /^(!?)\[([^\]]*)\]\(([^)]*)\)$/.exec(token);
        if (link) {
          out += `<span class="pv-syn-link">${escapeHtml(`${link[1]}[${link[2]}]`)}</span>`;
          out += `<span class="pv-syn-url">${escapeHtml(`(${link[3]})`)}</span>`;
        } else {
          out += escapeHtml(token);
        }
      } else if (token.startsWith('**') || token.startsWith('__')) {
        out += `<span class="pv-syn-strong">${escapeHtml(token)}</span>`;
      } else if (token.startsWith('*') || token.startsWith('_')) {
        out += `<span class="pv-syn-em">${escapeHtml(token)}</span>`;
      } else if (token.startsWith('~~')) {
        out += `<span class="pv-syn-strike">${escapeHtml(token)}</span>`;
      } else if (token.startsWith('<')) {
        out += `<span class="pv-syn-html">${escapeHtml(token)}</span>`;
      } else {
        out += escapeHtml(token);
      }

      last = match.index + token.length;
    }

    out += escapeHtml(text.slice(last));
    return out;
  }

  function highlightHeading(line) {
    const match = /^(\s{0,3})(#{1,6})(\s+)(.*)$/.exec(line);
    if (!match) return null;
    return (
      `${escapeHtml(match[1])}` +
      `<span class="pv-syn-heading-marker">${match[2]}</span>` +
      `${escapeHtml(match[3])}` +
      `<span class="pv-syn-heading-text">${highlightInline(match[4])}</span>`
    );
  }

  function highlightList(line) {
    const match = /^(\s*)([-*+]|\d+[.)])(\s+)(.*)$/.exec(line);
    if (!match) return null;

    const task = /^(\[[ xX]\])(\s+)(.*)$/.exec(match[4]);
    if (!task) {
      return (
        `${escapeHtml(match[1])}` +
        `<span class="pv-syn-list-marker">${escapeHtml(match[2])}</span>` +
        `${escapeHtml(match[3])}${highlightInline(match[4])}`
      );
    }

    return (
      `${escapeHtml(match[1])}` +
      `<span class="pv-syn-list-marker">${escapeHtml(match[2])}</span>` +
      `${escapeHtml(match[3])}` +
      `<span class="pv-syn-task">${escapeHtml(task[1])}</span>` +
      `${escapeHtml(task[2])}${highlightInline(task[3])}`
    );
  }

  function highlightLine(line) {
    const fence = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) return { fence: true, marker: fence[1], html: null };

    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      return { html: `<span class="pv-syn-hr">${escapeHtml(line)}</span>` };
    }

    const heading = highlightHeading(line);
    if (heading) return { html: heading };

    const quote = /^(\s{0,3})(>+\s?)(.*)$/.exec(line);
    if (quote) {
      return {
        html:
          `${escapeHtml(quote[1])}` +
          `<span class="pv-syn-quote-marker">${escapeHtml(quote[2])}</span>` +
          `${highlightInline(quote[3])}`,
      };
    }

    const list = highlightList(line);
    if (list) return { html: list };

    if (/^\s*\|/.test(line)) {
      return { html: `<span class="pv-syn-table">${highlightInline(line)}</span>` };
    }

    if (/^\s*<[^>]+>/.test(line)) {
      return { html: `<span class="pv-syn-html">${highlightInline(line)}</span>` };
    }

    return { html: highlightInline(line) };
  }

  function highlight(source) {
    const out = [];
    let fenceMarker = '';

    for (const line of source.split('\n')) {
      if (fenceMarker) {
        const closing = /^\s*(`{3,}|~{3,})\s*$/.exec(line);
        if (closing && closing[1][0] === fenceMarker[0]) {
          fenceMarker = '';
          out.push(`<span class="pv-syn-fence">${escapeHtml(line)}</span>`);
        } else {
          out.push(`<span class="pv-syn-code-line">${escapeHtml(line)}</span>`);
        }
        continue;
      }

      const result = highlightLine(line);
      if (result.fence) {
        fenceMarker = result.marker;
        out.push(`<span class="pv-syn-fence">${escapeHtml(line)}</span>`);
      } else {
        out.push(result.html);
      }
    }

    return out.join('\n');
  }

  register('markdown', highlight);
})();
