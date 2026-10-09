import { Button, Checkbox, Group, ScrollArea, Tabs, Table, Text } from '@mantine/core';
import { useEffect, useState, type DragEvent } from 'react';
import type { TableDataResult } from '../../../shared/types/data';
import type { Column } from '../../../shared/types/schema';
import { setDragRowPayload } from '../../script/dnd';
import type { AppMode } from '../../script/types';
import { DeleteRowModal } from './DeleteRowModal';
import { RowFormDrawer, type RowFormMode } from './RowFormDrawer';
import {
  formatFkCell,
  gridColumns,
} from '../utils/rowHelpers';

const PAGE_SIZE = 50;

type TableDataPanelProps = {
  /** Table names in selection order (tab order) */
  tableNames: string[];
  activeTable: string;
  onActiveTableChange: (tableName: string) => void;
  loading: boolean;
  requestError: string | null;
  results: TableDataResult[];
  pages: Record<string, number>;
  onPageChange: (tableName: string, page: number) => void;
  onClose: () => void;
  database: string;
  schema: string;
  onMutated: (tableName: string) => void;
  appMode?: AppMode;
  /** Script mode: open INSERT script workspace for active table */
  onScriptInsert?: (tableName: string, columns: Column[]) => void;
  /** Script mode: open SELECT script workspace for active table */
  onScriptSelect?: (tableName: string, columns: Column[]) => void;
  /** Script mode: open UPDATE script workspace for active table */
  onScriptUpdate?: (tableName: string, columns: Column[]) => void;
};

function rowSelectionKey(
  row: Record<string, unknown>,
  columns: Column[],
  index: number,
): string {
  const pks = columns.filter((c) => c.pk);
  if (pks.length > 0) {
    return pks.map((c) => String(row[c.name] ?? '')).join('|');
  }
  return `idx:${index}`;
}

function GridForResult({
  result,
  loading,
  requestError,
  onEdit,
  onDelete,
  appMode = 'explore',
  tableName,
  selectedKeys,
  onToggleKey,
  onSetSelectedKeys,
}: {
  result: TableDataResult | undefined;
  loading: boolean;
  requestError: string | null;
  onEdit: (row: Record<string, unknown>) => void;
  onDelete: (row: Record<string, unknown>) => void;
  appMode?: AppMode;
  tableName: string;
  selectedKeys: Set<string>;
  onToggleKey: (key: string) => void;
  onSetSelectedKeys: (keys: Set<string>) => void;
}) {
  if (requestError) {
    return (
      <Text size="sm" c="red.4" p="sm">
        {requestError}
      </Text>
    );
  }

  if (!result && loading) {
    return (
      <Text size="sm" c="dimmed" p="sm">
        Loading rows…
      </Text>
    );
  }

  if (!result) {
    return (
      <Text size="sm" c="dimmed" p="sm">
        No data loaded.
      </Text>
    );
  }

  if (!result.ok) {
    return (
      <Text size="sm" c="red.4" p="sm">
        {result.error ?? 'Failed to load table'}
      </Text>
    );
  }

  const columns = gridColumns(result.columns ?? []);
  const rows = result.rows ?? [];

  if (columns.length === 0) {
    return (
      <Text size="sm" c="dimmed" p="sm">
        No columns returned.
      </Text>
    );
  }

  const scriptMode = appMode === 'script';
  const colSpan = columns.length + (scriptMode ? 1 : 1);

  const rowKeys = rows.map((row, i) => rowSelectionKey(row, columns, i));
  const allSelected =
    rowKeys.length > 0 && rowKeys.every((k) => selectedKeys.has(k));

  const handleRowDragStart = (
    e: DragEvent,
    row: Record<string, unknown>,
    rowIndex: number,
  ) => {
    const key = rowSelectionKey(row, columns, rowIndex);
    let dragRows: Record<string, unknown>[];
    if (selectedKeys.has(key) && selectedKeys.size > 1) {
      dragRows = rows.filter((r, i) =>
        selectedKeys.has(rowSelectionKey(r, columns, i)),
      );
    } else {
      dragRows = [row];
    }
    setDragRowPayload(e.dataTransfer, { table: tableName, rows: dragRows });
  };

  return (
    <ScrollArea h="100%" type="auto">
      <Table
        striped
        highlightOnHover
        stickyHeader
        horizontalSpacing="sm"
        verticalSpacing={4}
        className="table-data-panel__table"
      >
        <Table.Thead>
          <Table.Tr>
            {scriptMode && (
              <Table.Th className="table-data-panel__select-th">
                <Checkbox
                  size="xs"
                  aria-label="Select all rows"
                  checked={allSelected}
                  indeterminate={
                    selectedKeys.size > 0 && !allSelected
                  }
                  onChange={() => {
                    if (allSelected) {
                      onSetSelectedKeys(new Set());
                    } else {
                      onSetSelectedKeys(new Set(rowKeys));
                    }
                  }}
                />
              </Table.Th>
            )}
            {columns.map((col) => (
              <Table.Th key={col.name}>
                <span className="table-data-panel__col-name">{col.name}</span>
                <span className="table-data-panel__col-type">{col.type}</span>
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
              </Table.Th>
            ))}
            {!scriptMode && (
              <Table.Th className="table-data-panel__actions-th">
                Actions
              </Table.Th>
            )}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={Math.max(colSpan, 1)}>
                <Text size="sm" c="dimmed">
                  No rows
                </Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            rows.map((row, rowIndex) => {
              const key = rowSelectionKey(row, columns, rowIndex);
              const selected = selectedKeys.has(key);
              return (
                <Table.Tr
                  key={rowIndex}
                  draggable={scriptMode}
                  onDragStart={
                    scriptMode
                      ? (e) => handleRowDragStart(e, row, rowIndex)
                      : undefined
                  }
                  className={[
                    scriptMode ? 'table-data-panel__row--draggable' : '',
                    selected ? 'table-data-panel__row--selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined}
                >
                  {scriptMode && (
                    <Table.Td
                      className="table-data-panel__select-td"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        size="xs"
                        aria-label={`Select row ${rowIndex + 1}`}
                        checked={selected}
                        onChange={() => onToggleKey(key)}
                      />
                    </Table.Td>
                  )}
                  {columns.map((col) => {
                    const cell = formatFkCell(row, col);
                    return (
                      <Table.Td key={col.name} title={cell.title}>
                        {cell.display}
                      </Table.Td>
                    );
                  })}
                  {!scriptMode && (
                    <Table.Td>
                      <Group gap={4} wrap="nowrap">
                        <Button
                          size="compact-xs"
                          variant="subtle"
                          onClick={() => onEdit(row)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="compact-xs"
                          variant="subtle"
                          color="red"
                          onClick={() => onDelete(row)}
                        >
                          Delete
                        </Button>
                      </Group>
                    </Table.Td>
                  )}
                </Table.Tr>
              );
            })
          )}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}

export function TableDataPanel({
  tableNames,
  activeTable,
  onActiveTableChange,
  loading,
  requestError,
  results,
  pages,
  onPageChange,
  onClose,
  database,
  schema,
  onMutated,
  appMode = 'explore',
  onScriptInsert,
  onScriptSelect,
  onScriptUpdate,
}: TableDataPanelProps) {
  const resultByName = new Map(results.map((r) => [r.table, r]));
  const activeResult = resultByName.get(activeTable);
  const page = pages[activeTable] ?? 1;
  const total = activeResult?.ok ? (activeResult.total ?? 0) : 0;
  const pageSize = activeResult?.pageSize ?? PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const scriptMode = appMode === 'script';

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<RowFormMode>('insert');
  const [formRow, setFormRow] = useState<Record<string, unknown> | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRowData, setDeleteRowData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [selectionByTable, setSelectionByTable] = useState<
    Record<string, Set<string>>
  >({});

  useEffect(() => {
    setSelectionByTable({});
  }, [activeTable]);

  const activeColumns: Column[] = activeResult?.ok
    ? (activeResult.columns ?? [])
    : [];

  const selectedKeys = selectionByTable[activeTable] ?? new Set<string>();

  const setSelectedForTable = (table: string, keys: Set<string>) => {
    setSelectionByTable((prev) => ({ ...prev, [table]: keys }));
  };

  const toggleKey = (table: string, key: string) => {
    setSelectionByTable((prev) => {
      const current = new Set(prev[table] ?? []);
      if (current.has(key)) current.delete(key);
      else current.add(key);
      return { ...prev, [table]: current };
    });
  };

  const openInsert = () => {
    if (scriptMode && onScriptInsert && activeTable) {
      onScriptInsert(activeTable, activeColumns);
      return;
    }
    setFormMode('insert');
    setFormRow(null);
    setFormOpen(true);
  };

  const openSelect = () => {
    if (scriptMode && onScriptSelect && activeTable) {
      onScriptSelect(activeTable, activeColumns);
    }
  };

  const openUpdate = () => {
    if (scriptMode && onScriptUpdate && activeTable) {
      onScriptUpdate(activeTable, activeColumns);
    }
  };

  const openEdit = (row: Record<string, unknown>) => {
    setFormMode('edit');
    setFormRow(row);
    setFormOpen(true);
  };

  const openDelete = (row: Record<string, unknown>) => {
    setDeleteRowData(row);
    setDeleteOpen(true);
  };

  const handleMutated = () => {
    if (activeTable) onMutated(activeTable);
  };

  const gridProps = (name: string) => ({
    result: resultByName.get(name),
    loading,
    requestError,
    onEdit: openEdit,
    onDelete: openDelete,
    appMode,
    tableName: name,
    selectedKeys: selectionByTable[name] ?? new Set<string>(),
    onToggleKey: (key: string) => toggleKey(name, key),
    onSetSelectedKeys: (keys: Set<string>) => setSelectedForTable(name, keys),
  });

  return (
    <div className="table-data-panel">
      <div className="table-data-panel__header">
        <Text size="sm" fw={600}>
          {tableNames.length > 1
            ? `${tableNames.length} tables`
            : (activeTable || 'Data')}
        </Text>
        <Text size="xs" c="dimmed">
          {loading
            ? 'Loading…'
            : activeResult?.ok
              ? `${total} row(s)${
                  scriptMode && selectedKeys.size > 0
                    ? ` · ${selectedKeys.size} selected`
                    : ''
                }`
              : ''}
        </Text>
        <Group gap="xs" ml="auto">
          <Button
            size="compact-xs"
            variant="filled"
            disabled={loading || !activeTable || !activeResult?.ok}
            onClick={openInsert}
          >
            {scriptMode ? '+ INSERT' : '+ Insert'}
          </Button>
          {scriptMode && (
            <>
              <Button
                size="compact-xs"
                variant="light"
                disabled={loading || !activeTable || !activeResult?.ok}
                onClick={openSelect}
              >
                + SELECT
              </Button>
              <Button
                size="compact-xs"
                variant="light"
                disabled={loading || !activeTable || !activeResult?.ok}
                onClick={openUpdate}
              >
                + UPDATE
              </Button>
            </>
          )}
          <Button
            size="compact-xs"
            variant="default"
            disabled={loading || page <= 1 || !activeTable}
            onClick={() => onPageChange(activeTable, page - 1)}
          >
            Prev
          </Button>
          <Text size="xs" c="dimmed">
            {page} / {totalPages}
          </Text>
          <Button
            size="compact-xs"
            variant="default"
            disabled={loading || page >= totalPages || !activeTable}
            onClick={() => onPageChange(activeTable, page + 1)}
          >
            Next
          </Button>
          <Button size="compact-xs" variant="subtle" onClick={onClose}>
            Close
          </Button>
        </Group>
      </div>

      {tableNames.length > 1 ? (
        <Tabs
          value={activeTable}
          onChange={(value) => {
            if (value) onActiveTableChange(value);
          }}
          className="table-data-panel__tabs"
        >
          <Tabs.List>
            {tableNames.map((name) => {
              const r = resultByName.get(name);
              const failed = r && !r.ok;
              return (
                <Tabs.Tab key={name} value={name} color={failed ? 'red' : undefined}>
                  {name}
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
          {tableNames.map((name) => (
            <Tabs.Panel key={name} value={name} className="table-data-panel__tab-panel">
              <GridForResult {...gridProps(name)} />
            </Tabs.Panel>
          ))}
        </Tabs>
      ) : (
        <div className="table-data-panel__body">
          <GridForResult {...gridProps(activeTable)} />
        </div>
      )}

      {!scriptMode && (
        <>
          <RowFormDrawer
            opened={formOpen}
            onClose={() => setFormOpen(false)}
            mode={formMode}
            database={database}
            schema={schema}
            table={activeTable}
            columns={activeColumns}
            row={formRow}
            onSuccess={handleMutated}
          />

          <DeleteRowModal
            opened={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            database={database}
            schema={schema}
            table={activeTable}
            columns={activeColumns}
            row={deleteRowData}
            onSuccess={handleMutated}
          />
        </>
      )}
    </div>
  );
}

export { PAGE_SIZE };
