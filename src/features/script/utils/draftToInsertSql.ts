import { formColumns } from '../../schema/utils/rowHelpers';
import type { InsertScriptDraft } from '../types';
import { columnValueToSql } from './columnValueToSql';
import { bracketIdent, qualifyTable } from './sqlQuote';

/** Build T-SQL INSERT from script draft (omits empty optional columns). */
export function draftToInsertSql(draft: InsertScriptDraft): string {
  const cols = formColumns(draft.columns).filter((c) => !c.identity);
  const included: { name: string; sql: string }[] = [];

  for (const col of cols) {
    const sql = columnValueToSql(draft.values[col.name], draft.schema);
    if (sql === null) {
      if (col.nullable === false) {
        included.push({ name: col.name, sql: 'NULL /* required – set value */' });
      }
      continue;
    }
    included.push({ name: col.name, sql });
  }

  if (included.length === 0) {
    return `-- No columns set for INSERT into ${draft.table}`;
  }

  const target = qualifyTable(draft.database, draft.schema, draft.table);
  const colList = included.map((c) => bracketIdent(c.name)).join(', ');
  const valList = included.map((c) => c.sql).join(',\n  ');

  return `INSERT INTO ${target}\n(${colList})\nVALUES\n(\n  ${valList}\n);`;
}
