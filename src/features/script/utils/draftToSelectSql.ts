import { formColumns } from '../../schema/utils/rowHelpers';
import type { SelectScriptDraft } from '../types';
import { bracketIdent, qualifyTable } from './sqlQuote';
import { whereToSql } from './whereToSql';

/** Build T-SQL SELECT from script draft. Empty selectColumns → SELECT *. */
export function draftToSelectSql(draft: SelectScriptDraft): string {
  const allowed = new Set(formColumns(draft.columns).map((c) => c.name));
  const selected = draft.selectColumns.filter((name) => allowed.has(name));

  const selectList =
    selected.length === 0
      ? '*'
      : selected.map((name) => bracketIdent(name)).join(', ');

  const target = qualifyTable(draft.database, draft.schema, draft.table);
  const where = whereToSql(draft.where, draft.schema);

  let sql = `SELECT ${selectList}\nFROM ${target}`;
  if (where) {
    sql += `\n${where}`;
  }
  return `${sql};`;
}
