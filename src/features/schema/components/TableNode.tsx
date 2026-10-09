import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { TableNodeData } from '../store/schemaStore';

type TableFlowNode = Node<TableNodeData, 'table'>;

export function TableNode({ data, selected }: NodeProps<TableFlowNode>) {
  const highlighted = new Set(data.highlightedColumns ?? []);

  return (
    <div className={`table-node${selected ? ' table-node--selected' : ''}`}>
      <div className="table-node__header">{data.name}</div>
      <div className="table-node__body">
        {data.columns.map((col) => {
          const isHot = highlighted.has(col.name);
          return (
            <div
              key={col.name}
              className={`table-node__row${isHot ? ' table-node__row--hot' : ''}`}
            >
              <Handle
                type="target"
                position={Position.Left}
                id={`${col.name}-target`}
                className="table-node__handle"
              />
              <span className="table-node__badges">
                {col.pk && (
                  <span className="badge badge--pk" title="Primary key">
                    PK
                  </span>
                )}
                {col.fk && (
                  <span className="badge badge--fk" title="Foreign key">
                    FK
                  </span>
                )}
              </span>
              <span className="table-node__col-name">{col.name}</span>
              <span className="table-node__col-type">{col.type}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={`${col.name}-source`}
                className="table-node__handle"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
