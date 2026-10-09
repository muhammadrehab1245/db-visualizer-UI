import ELK from 'elkjs/lib/elk.bundled.js';
import type { Edge, Node } from '@xyflow/react';
import type { TableSchema } from '../../../shared/types/schema';

export const NODE_WIDTH = 240;
export const HEADER_HEIGHT = 36;
export const ROW_HEIGHT = 28;

const elk = new ELK();

function estimateHeight(columnCount: number): number {
  return HEADER_HEIGHT + columnCount * ROW_HEIGHT;
}

/** Layered auto-layout; ports follow column handles for cleaner edges */
export async function layoutWithElk(
  nodes: Node<TableSchema>[],
  edges: Edge[],
): Promise<Node<TableSchema>[]> {
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '80',
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    },
    children: nodes.map((node) => {
      const columns = node.data.columns;
      return {
        id: node.id,
        width: NODE_WIDTH,
        height: estimateHeight(columns.length),
        ports: columns.flatMap((col, index) => [
          {
            id: `${col.name}-target`,
            properties: { 'port.side': 'WEST', 'port.index': String(index) },
          },
          {
            id: `${col.name}-source`,
            properties: { 'port.side': 'EAST', 'port.index': String(index) },
          },
        ]),
        layoutOptions: {
          'elk.portConstraints': 'FIXED_SIDE',
        },
      };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],   // "film"
      targets: [edge.target],   // "language"
    })),
  };

  const layouted = await elk.layout(graph);

  const positions = new Map(
    (layouted.children ?? []).map((child) => [
      child.id,
      { x: child.x ?? 0, y: child.y ?? 0 },
    ]),
  );

  return nodes.map((node) => {
    const pos = positions.get(node.id);
    if (!pos) return node;
    return { ...node, position: pos };
  });
}
