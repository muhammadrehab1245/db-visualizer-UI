import type { Column } from '../../../shared/types/schema';

const LABEL_SUFFIX = '__label';

export function isLabelColumn(name: string): boolean {
  return name.endsWith(LABEL_SUFFIX);
}

export function labelColumnName(columnName: string): string {
  return `${columnName}${LABEL_SUFFIX}`;
}

/** Editable columns for forms (excludes virtual `__label` columns). */
export function formColumns(columns: Column[]): Column[] {
  return columns.filter((c) => !isLabelColumn(c.name));
}

/** Grid columns: hide `__label` when a matching FK base column exists. */
export function gridColumns(columns: Column[]): Column[] {
  const names = new Set(columns.map((c) => c.name));
  return columns.filter((c) => {
    if (!isLabelColumn(c.name)) return true;
    const base = c.name.slice(0, -LABEL_SUFFIX.length);
    return !names.has(base);
  });
}

export function buildPrimaryKey(
  row: Record<string, unknown>,
  columns: Column[],
): Record<string, unknown> {
  const key: Record<string, unknown> = {};
  for (const col of columns) {
    if (!col.pk) continue;
    key[col.name] = row[col.name];
  }
  return key;
}

export function buildInsertPayload(
  values: Record<string, unknown>,
  columns: Column[],
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const col of formColumns(columns)) {
    if (col.identity) continue;
    if (!(col.name in values)) continue;
    const v = values[col.name];
    if (v === '' || v === undefined) {
      if (col.nullable !== false) row[col.name] = null;
      continue;
    }
    row[col.name] = coerceValue(v, col);
  }
  return row;
}

export function buildUpdatePayload(
  values: Record<string, unknown>,
  columns: Column[],
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const col of formColumns(columns)) {
    if (col.pk) continue;
    if (!(col.name in values)) continue;
    const v = values[col.name];
    if (v === '' || v === undefined) {
      if (col.nullable !== false) row[col.name] = null;
      continue;
    }
    row[col.name] = coerceValue(v, col);
  }
  return row;
}

function coerceValue(value: unknown, col: Column): unknown {
  if (value === null) return null;
  const t = col.type.toLowerCase();
  if (
    t.includes('int') ||
    t.includes('decimal') ||
    t.includes('numeric') ||
    t.includes('float') ||
    t.includes('real') ||
    t.includes('money')
  ) {
    if (typeof value === 'number') return value;
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  }
  if (t.includes('bit') || t === 'boolean' || t === 'bool') {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
  }
  return value;
}

/** Prefer a human label for delete confirm / display. */
export function rowLabel(
  row: Record<string, unknown>,
  columns: Column[],
): string {
  const editable = formColumns(columns);
  const nameCol = editable.find(
    (c) => !c.pk && c.name.toLowerCase() === 'name',
  );
  if (nameCol) {
    const v = row[nameCol.name];
    if (v != null && v !== '') return String(v);
  }

  for (const col of editable) {
    if (col.pk) continue;
    const labelKey = labelColumnName(col.name);
    if (row[labelKey] != null && row[labelKey] !== '') {
      return String(row[labelKey]);
    }
  }

  for (const col of editable) {
    if (col.pk) continue;
    const v = row[col.name];
    if (v != null && v !== '') return String(v);
  }

  const pkParts = editable
    .filter((c) => c.pk)
    .map((c) => `${c.name}=${formatCell(row[c.name])}`);
  return pkParts.join(', ') || '(row)';
}

export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function formatFkCell(
  row: Record<string, unknown>,
  col: Column,
): { display: string; title?: string } {
  const raw = row[col.name];
  const label = row[labelColumnName(col.name)];
  if (col.fk && label != null && label !== '') {
    return {
      display: String(label),
      title: raw != null ? String(raw) : undefined,
    };
  }
  return { display: formatCell(raw) };
}

export function isNumericType(type: string): boolean {
  const t = type.toLowerCase();
  return (
    t.includes('int') ||
    t.includes('decimal') ||
    t.includes('numeric') ||
    t.includes('float') ||
    t.includes('real') ||
    t.includes('money') ||
    t.includes('year')
  );
}

export function isBooleanType(type: string): boolean {
  const t = type.toLowerCase();
  return t.includes('bit') || t === 'boolean' || t === 'bool';
}

export function isTextAreaType(type: string): boolean {
  const t = type.toLowerCase();
  return t.includes('text') || t.includes('ntext') || t.includes('xml');
}
