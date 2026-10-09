/** Count loaded rows whose match column equals matchValue (FK uniqueness hint). */
export function countFkMatchRows(
  rows: Record<string, unknown>[],
  matchColumn: string,
  matchValue: string,
  valueColumn: string,
): number {
  let count = 0;
  for (const row of rows) {
    const match = row[matchColumn];
    const resolved =
      match != null && match !== ''
        ? String(match)
        : row[valueColumn] != null && row[valueColumn] !== ''
          ? String(row[valueColumn])
          : '';
    if (resolved === matchValue) count += 1;
  }
  return count;
}
