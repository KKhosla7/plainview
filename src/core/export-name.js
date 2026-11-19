export function exportFileName(fileName) {
  const name = String(fileName || 'document');
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base || 'document'}.html`;
}
