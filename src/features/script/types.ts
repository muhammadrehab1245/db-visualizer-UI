import type { Column } from '../../shared/types/schema';

export type AppMode = 'explore' | 'script';

export type ScriptKind = 'insert' | 'select' | 'update';

export type FkRefValue = {
  table: string;
  valueColumn: string;
  matchColumn: string;
  matchValue: string;
};

export type ColumnValue =
  | { kind: 'literal'; value: string | number | boolean | null }
  | { kind: 'raw'; sql: string }
  | { kind: 'fk'; fk: FkRefValue }
  | { kind: 'list'; items: ColumnValue[] };

export type WhereOperator =
  | '='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'IN'
  | 'IS NULL'
  | 'IS NOT NULL';

export type WhereClause = {
  id: string;
  column: string;
  operator: WhereOperator;
  value?: ColumnValue;
};

type ScriptDraftBase = {
  database: string;
  schema: string;
  table: string;
  columns: Column[];
};

export type InsertScriptDraft = ScriptDraftBase & {
  kind: 'insert';
  values: Record<string, ColumnValue>;
};

export type SelectScriptDraft = ScriptDraftBase & {
  kind: 'select';
  /** Empty array means SELECT * */
  selectColumns: string[];
  where: WhereClause[];
};

export type UpdateScriptDraft = ScriptDraftBase & {
  kind: 'update';
  set: Record<string, ColumnValue>;
  where: WhereClause[];
};

export type ScriptDraft =
  | InsertScriptDraft
  | SelectScriptDraft
  | UpdateScriptDraft;
