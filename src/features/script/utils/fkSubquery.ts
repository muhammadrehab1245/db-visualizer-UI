import { bracketIdent, nString, qualifySchemaTable } from './sqlQuote';
import type { FkRefValue } from '../types';

export function buildFkScalarSubquery(
  schema: string,
  fk: FkRefValue,
): string {
  const from = qualifySchemaTable(schema, fk.table);
  return `(SELECT ${bracketIdent(fk.valueColumn)} FROM ${from} WHERE ${bracketIdent(fk.matchColumn)} = ${nString(fk.matchValue)})`;
}
