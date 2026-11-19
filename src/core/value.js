export function valueKind(value) {
  if (value === null) {
    return 'null';
  }

  return typeof value;
}
