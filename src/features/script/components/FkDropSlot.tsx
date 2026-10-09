import { CloseButton, Text } from '@mantine/core';
import { useState, type DragEvent } from 'react';
import type { Column } from '../../../shared/types/schema';
import { getDragRowPayload } from '../dnd';
import type { ColumnValue, FkRefValue } from '../types';
import { countFkMatchRows } from '../utils/countFkMatchRows';

export type LookupRowsFn = (table: string) => Record<string, unknown>[];

type FkDropSlotProps = {
  col: Column;
  value: ColumnValue | undefined;
  onChange: (value: ColumnValue | null) => void;
  /** When multiple rows dropped, build FK list (WHERE IN). */
  onMultiFkDrop?: (items: ColumnValue[]) => void;
  lookupRows?: LookupRowsFn;
};

function matchValueFromRow(
  row: Record<string, unknown>,
  matchColumn: string,
  valueColumn: string,
): string {
  const match = row[matchColumn];
  if (match != null && match !== '') return String(match);
  const fallback = row[valueColumn];
  if (fallback != null && fallback !== '') return String(fallback);
  return '';
}

function fkValueFromRow(
  row: Record<string, unknown>,
  fk: NonNullable<Column['fk']>,
): ColumnValue | null {
  const matchColumn = fk.displayColumn ?? fk.column;
  const matchValue = matchValueFromRow(row, matchColumn, fk.column);
  if (!matchValue) return null;
  return {
    kind: 'fk',
    fk: {
      table: fk.table,
      valueColumn: fk.column,
      matchColumn,
      matchValue,
    },
  };
}

function duplicateWarning(
  fk: FkRefValue,
  lookupRows: LookupRowsFn | undefined,
): string | null {
  if (!lookupRows) return null;
  const rows = lookupRows(fk.table);
  const count = countFkMatchRows(
    rows,
    fk.matchColumn,
    fk.matchValue,
    fk.valueColumn,
  );
  if (count <= 1) return null;
  return `${count} rows share ${fk.matchColumn}=${fk.matchValue} — subquery may match multiple rows`;
}

export function FkDropSlot({
  col,
  value,
  onChange,
  onMultiFkDrop,
  lookupRows,
}: FkDropSlotProps) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [multiNote, setMultiNote] = useState<string | null>(null);
  const fk = col.fk;

  if (!fk) return null;

  const fkValue: FkRefValue | null = value?.kind === 'fk' ? value.fk : null;
  const listItems = value?.kind === 'list' ? value.items : null;

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setActive(true);
  };

  const handleDragLeave = () => setActive(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setActive(false);
    const payload = getDragRowPayload(e.dataTransfer);
    if (!payload) {
      setError('Invalid drag payload');
      return;
    }
    if (payload.table !== fk.table) {
      setError(`Drop a row from ${fk.table}`);
      return;
    }

    if (payload.rows.length > 1 && onMultiFkDrop) {
      const items: ColumnValue[] = [];
      for (const row of payload.rows) {
        const item = fkValueFromRow(row, fk);
        if (!item || item.kind !== 'fk') {
          setError(`Row has no ${fk.displayColumn ?? fk.column}`);
          return;
        }
        items.push(item);
      }
      setError(null);
      setMultiNote(null);
      const warns = items
        .filter((i): i is Extract<ColumnValue, { kind: 'fk' }> => i.kind === 'fk')
        .map((i) => duplicateWarning(i.fk, lookupRows))
        .filter(Boolean);
      setWarning(warns[0] ?? null);
      onMultiFkDrop(items);
      return;
    }

    const row = payload.rows[0];
    const item = fkValueFromRow(row, fk);
    if (!item || item.kind !== 'fk') {
      setError(`Row has no ${fk.displayColumn ?? fk.column}`);
      return;
    }
    setError(null);
    setMultiNote(
      payload.rows.length > 1
        ? `Using first of ${payload.rows.length} rows`
        : null,
    );
    setWarning(duplicateWarning(item.fk, lookupRows));
    onChange(item);
  };

  const filled = Boolean(fkValue) || Boolean(listItems?.length);

  return (
    <div className="script-field">
      <Text size="sm" fw={500}>
        {col.name}
      </Text>
      <Text size="xs" c="dimmed" mb={4}>
        FK → {fk.table}.{fk.column}
        {fk.displayColumn ? ` (${fk.displayColumn})` : ''} · drag row here
      </Text>
      <div
        className={`fk-drop-slot${active ? ' fk-drop-slot--active' : ''}${filled ? ' fk-drop-slot--filled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {listItems && listItems.length > 0 ? (
          <div className="fk-drop-slot__chips">
            {listItems.map((item, i) => (
              <div key={i} className="fk-drop-slot__chip">
                <span className="fk-drop-slot__chip-label">
                  {item.kind === 'fk'
                    ? `${item.fk.matchColumn} = ${item.fk.matchValue}`
                    : item.kind === 'literal'
                      ? String(item.value)
                      : '?'}
                </span>
              </div>
            ))}
            <CloseButton
              size="sm"
              aria-label={`Clear ${col.name}`}
              onClick={() => {
                setError(null);
                setWarning(null);
                setMultiNote(null);
                onChange(null);
              }}
            />
          </div>
        ) : fkValue ? (
          <div className="fk-drop-slot__chip">
            <span className="fk-drop-slot__chip-label">
              {fkValue.matchColumn} = {fkValue.matchValue}
            </span>
            <CloseButton
              size="sm"
              aria-label={`Clear ${col.name}`}
              onClick={() => {
                setError(null);
                setWarning(null);
                setMultiNote(null);
                onChange(null);
              }}
            />
          </div>
        ) : (
          <Text size="xs" c="dimmed">
            Drop {fk.table} row
          </Text>
        )}
      </div>
      {error && (
        <Text size="xs" c="red" mt={4}>
          {error}
        </Text>
      )}
      {warning && (
        <Text size="xs" c="yellow.6" mt={4}>
          {warning}
        </Text>
      )}
      {multiNote && (
        <Text size="xs" c="dimmed" mt={4}>
          {multiNote}
        </Text>
      )}
    </div>
  );
}
