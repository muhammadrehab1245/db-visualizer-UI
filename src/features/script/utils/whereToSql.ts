import type { WhereClause } from '../types';
import { columnValueToSql } from './columnValueToSql';
import { bracketIdent } from './sqlQuote';

const NULL_OPS = new Set(['IS NULL', 'IS NOT NULL']);

/** Build T-SQL WHERE clause from draft conditions (skips incomplete rows). */
export function whereToSql(where: WhereClause[], schema: string): string {
  const parts: string[] = [];

  for (const clause of where) {
    if (!clause.column) continue;

    const col = bracketIdent(clause.column);

    if (NULL_OPS.has(clause.operator)) {
      parts.push(`${col} ${clause.operator}`);
      continue;
    }

    if (clause.operator === 'IN') {
      if (!clause.value || clause.value.kind !== 'list') continue;
      const itemSql: string[] = [];
      for (const item of clause.value.items) {
        if (item.kind === 'list') continue;
        const sql = columnValueToSql(item, schema);
        if (sql !== null) itemSql.push(sql);
      }
      if (itemSql.length === 0) continue;
      parts.push(`${col} IN (${itemSql.join(', ')})`);
      continue;
    }

    const valueSql = columnValueToSql(clause.value, schema);
    if (valueSql === null) continue;

    parts.push(`${col} ${clause.operator} ${valueSql}`);
  }

  if (parts.length === 0) return '';
  return `WHERE ${parts.join('\n  AND ')}`;
}
