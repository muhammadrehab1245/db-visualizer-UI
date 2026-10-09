import {
  applyNodeChanges,
  type Edge,
  type Node,
  type OnNodesChange,
} from '@xyflow/react';
import { create } from 'zustand';
import type { DatabaseSchema, TableSchema } from '../../../shared/types/schema';
import { buildEdgesFromSchema } from '../utils/buildEdges';
import { layoutWithElk } from '../utils/layoutWithElk';

export type TableNodeData = TableSchema & {
  highlightedColumns?: string[];
};

type SchemaState = {
  tables: TableSchema[];
  nodes: Node<TableNodeData>[];
  edges: Edge[];
  /** All multi-selected table node ids */
  selectedTableIds: string[];
  /** Focus table for FK highlight (active tab / last clicked) */
  activeTableId: string | null;
  loadSchema: (schema: DatabaseSchema) => Promise<void>;
  onNodesChange: OnNodesChange;
  setNodes: (nodes: Node<TableNodeData>[]) => void;
  setSelection: (ids: string[], activeId?: string | null) => void;
  clearSelection: () => void;
  autoLayout: () => Promise<void>;
};

function tablesToNodes(tables: TableSchema[]): Node<TableNodeData>[] {
  return tables.map((table, index) => ({
    id: table.id,
    type: 'table',
    position: { x: index * 280, y: 40 },
    data: { ...table },
  }));
}

function relatedColumnNames(
  tables: TableSchema[],
  activeTableId: string | null,
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  if (!activeTableId) return map;

  const ensure = (tableId: string) => {
    if (!map.has(tableId)) map.set(tableId, new Set());
    return map.get(tableId)!;
  };

  for (const table of tables) {
    for (const col of table.columns) {
      if (!col.fk) continue;
      const isChild = table.id === activeTableId;
      const isParent = col.fk.table === activeTableId;
      if (!isChild && !isParent) continue;

      ensure(table.id).add(col.name);
      ensure(col.fk.table).add(col.fk.column);
    }
  }

  return map;
}

function withHighlights(
  nodes: Node<TableNodeData>[],
  tables: TableSchema[],
  selectedTableIds: string[],
  activeTableId: string | null,
): Node<TableNodeData>[] {
  const selected = new Set(selectedTableIds);
  const related = relatedColumnNames(tables, activeTableId);
  return nodes.map((node) => ({
    ...node,
    selected: selected.has(node.id),
    data: {
      ...node.data,
      highlightedColumns: activeTableId
        ? [...(related.get(node.id) ?? [])]
        : undefined,
    },
  }));
}

function withEdgeHighlight(
  edges: Edge[],
  activeTableId: string | null,
): Edge[] {
  return edges.map((edge) => {
    const active =
      activeTableId !== null &&
      (edge.source === activeTableId || edge.target === activeTableId);
    return {
      ...edge,
      style: {
        stroke: active ? '#00FF84' : '#2A2A2A',
        strokeWidth: active ? 2.5 : 1.5,
      },
      animated: active,
    };
  });
}

export const useSchemaStore = create<SchemaState>((set, get) => ({
  tables: [],
  nodes: [],
  edges: [],
  selectedTableIds: [],
  activeTableId: null,

  loadSchema: async (schema) => {
    const tables = schema.tables;
    let nodes = tablesToNodes(tables);
    const edges = buildEdgesFromSchema(tables);
    try {
      nodes = await layoutWithElk(nodes, edges);
    } catch (err) {
      console.error('ELK layout failed', err);
    }
    set({
      tables,
      nodes: withHighlights(nodes, tables, [], null),
      edges: withEdgeHighlight(edges, null),
      selectedTableIds: [],
      activeTableId: null,
    });
  },

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) as Node<TableNodeData>[] });
  },

  setNodes: (nodes) => set({ nodes }),

  setSelection: (ids, activeId) => {
    const { tables, nodes, edges } = get();
    const active = activeId === undefined ? (ids[ids.length - 1] ?? null) : activeId;
    set({
      selectedTableIds: ids,
      activeTableId: active,
      nodes: withHighlights(nodes, tables, ids, active),
      edges: withEdgeHighlight(edges, active),
    });
  },

  clearSelection: () => {
    const { tables, nodes, edges } = get();
    set({
      selectedTableIds: [],
      activeTableId: null,
      nodes: withHighlights(nodes, tables, [], null),
      edges: withEdgeHighlight(edges, null),
    });
  },

  autoLayout: async () => {
    const { nodes, edges, tables, selectedTableIds, activeTableId } = get();
    const layouted = await layoutWithElk(nodes, edges);
    set({
      nodes: withHighlights(layouted, tables, selectedTableIds, activeTableId),
    });
  },
}));
