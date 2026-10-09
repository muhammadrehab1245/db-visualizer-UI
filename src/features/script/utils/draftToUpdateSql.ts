import { formColumns } from '../../schema/utils/rowHelpers';
import type { UpdateScriptDraft } from '../types';
import { columnValueToSql } from './columnValueToSql';
import { bracketIdent, qualifyTable } from './sqlQuote';
import { whereToSql } from './whereToSql';

/** Build T-SQL UPDATE from script draft (only explicitly set columns). */
export function draftToUpdateSql(draft: UpdateScriptDraft): string {
  const cols = formColumns(draft.columns).filter((c) => !c.identity);
  const assignments: string[] = [];

  for (const col of cols) {
    const sql = columnValueToSql(draft.set[col.name], draft.schema);
    if (sql === null) continue;
    assignments.push(`${bracketIdent(col.name)} = ${sql}`);
  }

  if (assignments.length === 0) {
    return `-- No columns set for UPDATE of ${draft.table}`;
  }

  const target = qualifyTable(draft.database, draft.schema, draft.table);
  const where = whereToSql(draft.where, draft.schema);

  let sql = `UPDATE ${target}\nSET ${assignments.join(',\n    ')}`;
  if (where) {
    sql += `\n${where}`;
  }
  sql += ';';
  if (!where) {
    sql += '\n-- WARNING: no WHERE clause';
  }
  return sql;
}
