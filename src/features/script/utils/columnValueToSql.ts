import type { ColumnValue } from '../types';
import { buildFkScalarSubquery } from './fkSubquery';
import { nString } from './sqlQuote';

export function columnValueToSql(
  value: ColumnValue | undefined,
  schema: string,
): string | null {
  if (!value) return null;
  if (value.kind === 'list') return null;
  if (value.kind === 'raw') return value.sql;
  if (value.kind === 'fk') return buildFkScalarSubquery(schema, value.fk);
  if (value.value === null) return 'NULL';
  if (typeof value.value === 'boolean') return value.value ? '1' : '0';
  if (typeof value.value === 'number') {
    return Number.isFinite(value.value) ? String(value.value) : 'NULL';
  }
  return nString(String(value.value));
}
