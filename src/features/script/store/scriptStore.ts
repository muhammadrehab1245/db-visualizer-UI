import { create } from 'zustand';
import type { Column } from '../../../shared/types/schema';
import type {
  ColumnValue,
  ScriptDraft,
  ScriptKind,
  WhereClause,
  WhereOperator,
} from '../types';

type ScriptStartParams = {
  database: string;
  schema: string;
  table: string;
  columns: Column[];
};

function hasWhere(draft: ScriptDraft): draft is Extract<
  ScriptDraft,
  { where: WhereClause[] }
> {
  return draft.kind === 'select' || draft.kind === 'update';
}

function emptyDraftForKind(
  kind: ScriptKind,
  base: ScriptStartParams,
): ScriptDraft {
  if (kind === 'insert') {
    return { kind: 'insert', ...base, values: {} };
  }
  if (kind === 'update') {
    return { kind: 'update', ...base, set: {}, where: [] };
  }
  return { kind: 'select', ...base, selectColumns: [], where: [] };
}

type ScriptState = {
  draft: ScriptDraft | null;
  workspaceOpen: boolean;
  startInsert: (params: ScriptStartParams) => void;
  startSelect: (params: ScriptStartParams) => void;
  startUpdate: (params: ScriptStartParams) => void;
  switchKind: (kind: ScriptKind) => void;
  setColumnValue: (column: string, value: ColumnValue | null) => void;
  setSelectColumns: (columns: string[]) => void;
  addWhereClause: () => void;
  updateWhereClause: (
    id: string,
    patch: Partial<Omit<WhereClause, 'id'>>,
  ) => void;
  removeWhereClause: (id: string) => void;
  clear: () => void;
  closeWorkspace: () => void;
  openWorkspace: () => void;
};

let whereIdSeq = 0;
function nextWhereId(): string {
  whereIdSeq += 1;
  return `where-${whereIdSeq}`;
}

export const useScriptStore = create<ScriptState>((set) => ({
  draft: null,
  workspaceOpen: false,

  startInsert: ({ database, schema, table, columns }) => {
    set({
      draft: {
        kind: 'insert',
        database,
        schema,
        table,
        columns,
        values: {},
      },
      workspaceOpen: true,
    });
  },

  startSelect: ({ database, schema, table, columns }) => {
    set({
      draft: {
        kind: 'select',
        database,
        schema,
        table,
        columns,
        selectColumns: [],
        where: [],
      },
      workspaceOpen: true,
    });
  },

  startUpdate: ({ database, schema, table, columns }) => {
    set({
      draft: {
        kind: 'update',
        database,
        schema,
        table,
        columns,
        set: {},
        where: [],
      },
      workspaceOpen: true,
    });
  },

  switchKind: (kind) => {
    set((state) => {
      if (!state.draft || state.draft.kind === kind) return state;
      const { database, schema, table, columns } = state.draft;
      return {
        draft: emptyDraftForKind(kind, { database, schema, table, columns }),
        workspaceOpen: true,
      };
    });
  },

  setColumnValue: (column, value) => {
    set((state) => {
      if (!state.draft) return state;
      if (state.draft.kind === 'insert') {
        const values = { ...state.draft.values };
        if (value === null) {
          delete values[column];
        } else {
          values[column] = value;
        }
        return { draft: { ...state.draft, values } };
      }
      if (state.draft.kind === 'update') {
        const nextSet = { ...state.draft.set };
        if (value === null) {
          delete nextSet[column];
        } else {
          nextSet[column] = value;
        }
        return { draft: { ...state.draft, set: nextSet } };
      }
      return state;
    });
  },

  setSelectColumns: (columns) => {
    set((state) => {
      if (!state.draft || state.draft.kind !== 'select') return state;
      return { draft: { ...state.draft, selectColumns: columns } };
    });
  },

  addWhereClause: () => {
    set((state) => {
      if (!state.draft || !hasWhere(state.draft)) return state;
      const clause: WhereClause = {
        id: nextWhereId(),
        column: '',
        operator: '=' as WhereOperator,
      };
      return {
        draft: {
          ...state.draft,
          where: [...state.draft.where, clause],
        },
      };
    });
  },

  updateWhereClause: (id, patch) => {
    set((state) => {
      if (!state.draft || !hasWhere(state.draft)) return state;
      return {
        draft: {
          ...state.draft,
          where: state.draft.where.map((clause) => {
            if (clause.id !== id) return clause;
            const next = { ...clause, ...patch };
            if (
              patch.operator === 'IS NULL' ||
              patch.operator === 'IS NOT NULL'
            ) {
              delete next.value;
            }
            return next;
          }),
        },
      };
    });
  },

  removeWhereClause: (id) => {
    set((state) => {
      if (!state.draft || !hasWhere(state.draft)) return state;
      return {
        draft: {
          ...state.draft,
          where: state.draft.where.filter((c) => c.id !== id),
        },
      };
    });
  },

  clear: () => set({ draft: null, workspaceOpen: false }),

  closeWorkspace: () => set({ workspaceOpen: false }),

  openWorkspace: () => set({ workspaceOpen: true }),
}));
