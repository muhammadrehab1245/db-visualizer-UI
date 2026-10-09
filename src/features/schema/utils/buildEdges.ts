import type { Edge } from '@xyflow/react';
import type { TableSchema } from '../../../shared/types/schema';

/** Build column-to-column FK edges from table metadata */
export function buildEdgesFromSchema(tables: TableSchema[]): Edge[] {
  const tableIds = new Set(tables.map((t) => t.id));
  const edges: Edge[] = [];

  for (const table of tables) {
    for (const col of table.columns) {
      if (!col.fk) continue;
      if (!tableIds.has(col.fk.table)) continue;

      edges.push({
        id: `${table.id}.${col.name}->${col.fk.table}.${col.fk.column}`,
        source: table.id,
        target: col.fk.table,
        sourceHandle: `${col.name}-source`,
        targetHandle: `${col.fk.column}-target`,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#2A2A2A', strokeWidth: 1.5 },
      });
    }
  }

  return edges;
}
