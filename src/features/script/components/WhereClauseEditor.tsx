import {
  ActionIcon,
  CloseButton,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useState, type DragEvent } from 'react';
import type { Column } from '../../../shared/types/schema';
import {
  formColumns,
  isBooleanType,
  isNumericType,
} from '../../schema/utils/rowHelpers';
import { getDragRowPayload } from '../dnd';
import type { ColumnValue, WhereClause, WhereOperator } from '../types';
import { FkDropSlot, type LookupRowsFn } from './FkDropSlot';

const OPERATORS: { value: WhereOperator; label: string }[] = [
  { value: '=', label: '=' },
  { value: '!=', label: '!=' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: 'IN', label: 'IN' },
  { value: 'IS NULL', label: 'IS NULL' },
  { value: 'IS NOT NULL', label: 'IS NOT NULL' },
];

type WhereClauseEditorProps = {
  columns: Column[];
  where: WhereClause[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Omit<WhereClause, 'id'>>) => void;
  onRemove: (id: string) => void;
  lookupRows?: LookupRowsFn;
};

function literalDisplay(value: ColumnValue | undefined): string {
  if (!value || value.kind !== 'literal') return '';
  if (value.value === null) return '';
  return String(value.value);
}

function coerceLiteral(
  raw: unknown,
  col: Column,
): ColumnValue | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (isBooleanType(col.type)) {
    return { kind: 'literal', value: Boolean(raw) };
  }
  if (isNumericType(col.type)) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return { kind: 'literal', value: n };
  }
  return { kind: 'literal', value: String(raw) };
}

function chipLabel(item: ColumnValue): string {
  if (item.kind === 'fk') {
    return `${item.fk.matchColumn} = ${item.fk.matchValue}`;
  }
  if (item.kind === 'literal') {
    return item.value === null ? 'NULL' : String(item.value);
  }
  if (item.kind === 'raw') return item.sql;
  return '…';
}

function LiteralListDrop({
  col,
  clause,
  onUpdate,
}: {
  col: Column;
  clause: WhereClause;
  onUpdate: (id: string, patch: Partial<Omit<WhereClause, 'id'>>) => void;
}) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listItems =
    clause.value?.kind === 'list' ? clause.value.items : null;

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setActive(false);
    const payload = getDragRowPayload(e.dataTransfer);
    if (!payload) {
      setError('Invalid drag payload');
      return;
    }
    const items: ColumnValue[] = [];
    for (const row of payload.rows) {
      const item = coerceLiteral(row[col.name], col);
      if (!item) {
        setError(`Row has no ${col.name}`);
        return;
      }
      items.push(item);
    }
    setError(null);
    if (items.length === 1) {
      onUpdate(clause.id, { operator: '=', value: items[0] });
    } else {
      onUpdate(clause.id, {
        operator: 'IN',
        value: { kind: 'list', items },
      });
    }
  };

  return (
    <div className="script-where__value">
      {(clause.operator === 'IN' || listItems) && listItems ? (
        <div className="fk-drop-slot fk-drop-slot--filled">
          <div className="fk-drop-slot__chips">
            {listItems.map((item, i) => (
              <div key={i} className="fk-drop-slot__chip">
                <span className="fk-drop-slot__chip-label">
                  {chipLabel(item)}
                </span>
              </div>
            ))}
            <CloseButton
              size="sm"
              aria-label="Clear values"
              onClick={() => onUpdate(clause.id, { value: undefined })}
            />
          </div>
        </div>
      ) : null}

      {clause.operator !== 'IN' && !listItems && (
        <>
          {isBooleanType(col.type) ? (
            <Select
              size="xs"
              data={[
                { value: 'true', label: 'true' },
                { value: 'false', label: 'false' },
              ]}
              value={
                clause.value?.kind === 'literal'
                  ? String(Boolean(clause.value.value))
                  : null
              }
              onChange={(v) => {
                if (v == null) {
                  onUpdate(clause.id, { value: undefined });
                  return;
                }
                onUpdate(clause.id, {
                  value: { kind: 'literal', value: v === 'true' },
                });
              }}
              clearable
            />
          ) : isNumericType(col.type) ? (
            <NumberInput
              size="xs"
              placeholder={col.type}
              value={(() => {
                if (
                  clause.value?.kind !== 'literal' ||
                  clause.value.value === null
                ) {
                  return undefined;
                }
                const n = Number(clause.value.value);
                return Number.isFinite(n) ? n : undefined;
              })()}
              onChange={(n) => {
                if (n === '' || n === undefined) {
                  onUpdate(clause.id, { value: undefined });
                  return;
                }
                onUpdate(clause.id, {
                  value: { kind: 'literal', value: Number(n) },
                });
              }}
            />
          ) : (
            <TextInput
              size="xs"
              placeholder={col.type}
              value={literalDisplay(clause.value)}
              onChange={(e) => {
                const v = e.currentTarget.value;
                if (v === '') {
                  onUpdate(clause.id, { value: undefined });
                  return;
                }
                onUpdate(clause.id, {
                  value: { kind: 'literal', value: v },
                });
              }}
            />
          )}
        </>
      )}

      <div
        className={`fk-drop-slot script-where__drop${active ? ' fk-drop-slot--active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setActive(true);
        }}
        onDragLeave={() => setActive(false)}
        onDrop={handleDrop}
      >
        <Text size="xs" c="dimmed">
          Drop rows for IN ({col.name})
        </Text>
      </div>
      {error && (
        <Text size="xs" c="red" mt={4}>
          {error}
        </Text>
      )}
    </div>
  );
}

export function WhereClauseEditor({
  columns,
  where,
  onAdd,
  onUpdate,
  onRemove,
  lookupRows,
}: WhereClauseEditorProps) {
  const cols = formColumns(columns);
  const colOptions = cols.map((c) => ({
    value: c.name,
    label: c.fk ? `${c.name} (FK)` : c.name,
  }));

  return (
    <Stack gap="sm" className="script-where">
      <Group justify="space-between">
        <Text size="sm" fw={600}>
          WHERE
        </Text>
        <ActionIcon
          size="sm"
          variant="light"
          aria-label="Add WHERE condition"
          onClick={onAdd}
        >
          +
        </ActionIcon>
      </Group>

      {where.length === 0 && (
        <Text size="xs" c="dimmed">
          No conditions — SELECT returns all rows. Add a filter or drag an FK
          row onto a condition.
        </Text>
      )}

      {where.map((clause) => {
        const col = cols.find((c) => c.name === clause.column);
        const needsValue =
          clause.operator !== 'IS NULL' && clause.operator !== 'IS NOT NULL';
        const isFk = Boolean(col?.fk);

        return (
          <div key={clause.id} className="script-where__row">
            <Group gap="xs" align="flex-start" wrap="nowrap">
              <Select
                size="xs"
                placeholder="Column"
                data={colOptions}
                value={clause.column || null}
                onChange={(name) => {
                  onUpdate(clause.id, {
                    column: name ?? '',
                    value: undefined,
                  });
                }}
                searchable
                w={140}
                style={{ flexShrink: 0 }}
              />
              <Select
                size="xs"
                data={OPERATORS}
                value={clause.operator}
                onChange={(op) => {
                  if (!op) return;
                  const next = op as WhereOperator;
                  const patch: Partial<Omit<WhereClause, 'id'>> = {
                    operator: next,
                  };
                  if (next === 'IS NULL' || next === 'IS NOT NULL') {
                    patch.value = undefined;
                  }
                  onUpdate(clause.id, patch);
                }}
                allowDeselect={false}
                w={110}
                style={{ flexShrink: 0 }}
              />
              <ActionIcon
                size="sm"
                variant="subtle"
                color="red"
                aria-label="Remove condition"
                mt={4}
                onClick={() => onRemove(clause.id)}
              >
                ×
              </ActionIcon>
            </Group>

            {needsValue && col && isFk && (
              <div className="script-where__value">
                <FkDropSlot
                  col={col}
                  value={clause.value}
                  lookupRows={lookupRows}
                  onChange={(v) =>
                    onUpdate(clause.id, {
                      operator: '=',
                      value: v ?? undefined,
                    })
                  }
                  onMultiFkDrop={(items) =>
                    onUpdate(clause.id, {
                      operator: 'IN',
                      value: { kind: 'list', items },
                    })
                  }
                />
              </div>
            )}

            {needsValue && col && !isFk && (
              <LiteralListDrop
                col={col}
                clause={clause}
                onUpdate={onUpdate}
              />
            )}

            {needsValue && !col && clause.column && (
              <Text size="xs" c="dimmed" mt={4}>
                Unknown column
              </Text>
            )}
          </div>
        );
      })}
    </Stack>
  );
}
