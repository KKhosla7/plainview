/* global Plainview */
/* JSONL latest-message reader: parses only the tail first, newest records first. */
((root) => {
  const TailBytes = 2_000_000;
  const LatestLimit = 200;

  function el(tag, className, text) {
    const node = Plainview.createElement(tag);
    if (className) {
      node.className = className;
    }

    if (text !== undefined) {
      node.textContent = text;
    }

    return node;
  }

  function tailSource(source) {
    const text = String(source ?? '').replace(/^\uFEFF/u, '');
    if (text.length <= TailBytes) {
      return text;
    }
    const tail = text.slice(-TailBytes);
    return tail.slice(tail.indexOf('\n') + 1);
  }

  function parseRecords(text) {
    const records = [];
    for (const line of text.split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      try {
        records.push(JSON.parse(trimmed));
      } catch {
        break;
      }
    }

    return records;
  }

  function buildJsonl(source) {
    const text = tailSource(source);
    const records = parseRecords(text);
    const article = el('article', 'pv-doc pv-data-doc pv-jsonl-doc');
    const meta = el('div', 'pv-doc-meta');
    const summary = el(
      'span',
      'pv-meta-text',
      `latest ${Math.min(records.length, LatestLimit)} records`,
    );
    const actions = el('span', 'pv-meta-actions');
    const latest = el('input');
    latest.type = 'checkbox';
    latest.checked = true;
    const label = el('label', 'pv-jsonl-latest', 'Newest first');
    label.prepend(latest);
    actions.append(label);
    meta.append(summary, actions);

    const list = el('div', 'pv-json pv-jsonl-list');
    function render() {
      const rows = latest.checked ? [...records].reverse() : records;
      list.replaceChildren(
        ...rows
          .slice(0, LatestLimit)
          .map((record) => el('pre', 'pv-jsonl-record', JSON.stringify(record, null, 2))),
      );
    }
    latest.addEventListener('change', render);
    render();
    article.append(meta, list);

    return {
      article,
      stats: { rows: records.length },
      error: false,
      exportData: {
        formatId: 'jsonl',
        hasFilter: () => false,
        getDocument() {
          return { formatId: 'jsonl', source };
        },
        getData(scope) {
          return scope === 'filtered'
            ? null
            : { data: source, formatId: 'jsonl', kind: 'jsonl-source' };
        },
      },
    };
  }

  root.Plainview = Object.assign(root.Plainview || {}, { buildJsonl });
})(globalThis);
