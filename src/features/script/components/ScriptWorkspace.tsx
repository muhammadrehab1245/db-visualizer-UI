import {
  Button,
  Checkbox,
  Drawer,
  Group,
  MultiSelect,
  NumberInput,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import Editor from '@monaco-editor/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TableDataResult } from '../../../shared/types/data';
import type { QueryResponse } from '../../../shared/types/query';
import {
  formColumns,
  formatCell,
  isBooleanType,
  isNumericType,
} from '../../schema/utils/rowHelpers';
import { executeQuery } from '../api/queryApi';
import { useScriptStore } from '../store/scriptStore';
import type { ColumnValue, ScriptDraft, ScriptKind } from '../types';
import { draftToInsertSql } from '../utils/draftToInsertSql';
import { draftToSelectSql } from '../utils/draftToSelectSql';
import { draftToUpdateSql } from '../utils/draftToUpdateSql';
import { FkDropSlot } from './FkDropSlot';
import { WhereClauseEditor } from './WhereClauseEditor';

const RAW_PRESETS = [
  { value: '__literal__', label: 'Value' },
  { value: 'GETDATE()', label: 'GETDATE()' },
  { value: 'NULL', label: 'NULL' },
];

function isRunnableSelect(sql: string): boolean {
  const trimmed = sql.trim().replace(/;+\s*$/, '');
  const upper = trimmed.toUpperCase();
  return upper.startsWith('SELECT') || upper.startsWith('WITH');
}

function columnValues(
  draft: ScriptDraft,
): Record<string, ColumnValue> | null {
  if (draft.kind === 'insert') return draft.values;
  if (draft.kind === 'update') return draft.set;
  return null;
}

function titleForKind(kind: ScriptDraft['kind']): string {
  if (kind === 'select') return 'SELECT';
  if (kind === 'update') return 'UPDATE';
  return 'INSERT';
}

type ScriptWorkspaceProps = {
  /** Currently loaded grid results — used for FK duplicate warnings */
  dataResults?: TableDataResult[];
};

export function ScriptWorkspace({ dataResults = [] }: ScriptWorkspaceProps) {
  const draft = useScriptStore((s) => s.draft);
  const workspaceOpen = useScriptStore((s) => s.workspaceOpen);
  const setColumnValue = useScriptStore((s) => s.setColumnValue);
  const setSelectColumns = useScriptStore((s) => s.setSelectColumns);
  const addWhereClause = useScriptStore((s) => s.addWhereClause);
  const updateWhereClause = useScriptStore((s) => s.updateWhereClause);
  const removeWhereClause = useScriptStore((s) => s.removeWhereClause);
  const switchKind = useScriptStore((s) => s.switchKind);
  const closeWorkspace = useScriptStore((s) => s.closeWorkspace);
  const clear = useScriptStore((s) => s.clear);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null);

  const lookupRows = useCallback(
    (table: string): Record<string, unknown>[] => {
      const result = dataResults.find((r) => r.table === table && r.ok);
      return result?.rows ?? [];
    },
    [dataResults],
  );

  const sql = useMemo(() => {
    if (!draft) return '';
    if (draft.kind === 'select') return draftToSelectSql(draft);
    if (draft.kind === 'update') return draftToUpdateSql(draft);
    return draftToInsertSql(draft);
  }, [draft]);

  const canRun = isRunnableSelect(sql);

  useEffect(() => {
    setQueryResult(null);
    setRunError(null);
  }, [draft?.kind, draft?.table, sql]);

  const fields = useMemo(() => {
    if (!draft || (draft.kind !== 'insert' && draft.kind !== 'update')) {
      return [];
    }
    return formColumns(draft.columns).filter((c) => !c.identity);
  }, [draft]);

  const selectColumnOptions = useMemo(() => {
    if (!draft || draft.kind !== 'select') return [];
    return formColumns(draft.columns).map((c) => ({
      value: c.name,
      label: c.name,
    }));
  }, [draft]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopyMsg('Copied');
      setTimeout(() => setCopyMsg(null), 1500);
    } catch {
      setCopyMsg('Copy failed');
      setTimeout(() => setCopyMsg(null), 1500);
    }
  };

  const handleRun = async () => {
    if (!draft || !canRun) return;
    setRunning(true);
    setRunError(null);
    setQueryResult(null);
    try {
      const result = await executeQuery({
        database: draft.database,
        schema: draft.schema,
        sql,
        maxRows: 500,
      });
      if (result.error) {
        setRunError(result.error);
        setQueryResult(null);
      } else {
        setQueryResult(result);
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setRunning(false);
    }
  };

  const handleClear = () => {
    setQueryResult(null);
    setRunError(null);
    clear();
  };

  const setLiteral = (colName: string, value: string | number | boolean | null) => {
    setColumnValue(colName, { kind: 'literal', value });
  };

  const valuesMap = draft ? columnValues(draft) : null;

  const modeForColumn = (colName: string): string => {
    if (!valuesMap) return '__literal__';
    const v = valuesMap[colName];
    if (!v) return '__literal__';
    if (v.kind === 'raw') return v.sql;
    return '__literal__';
  };

  const handleModeChange = (colName: string, mode: string | null) => {
    if (!mode || mode === '__literal__') {
      if (!valuesMap) return;
      const prev = valuesMap[colName];
      if (prev?.kind === 'raw') {
        setColumnValue(colName, { kind: 'literal', value: '' });
      }
      return;
    }
    setColumnValue(colName, { kind: 'raw', sql: mode });
  };

  const literalDisplay = (value: ColumnValue | undefined): string => {
    if (!value || value.kind !== 'literal') return '';
    if (value.value === null) return '';
    return String(value.value);
  };

  const titleKind = draft ? titleForKind(draft.kind) : 'INSERT';
  const resultColumns = queryResult?.columns ?? [];
  const resultRows = queryResult?.rows ?? [];

  const renderSetFields = () => {
    if (!valuesMap) return null;
    return (
      <Stack gap="sm" className="script-workspace__fields">
        {fields.map((col) => {
          if (col.fk) {
            return (
              <FkDropSlot
                key={col.name}
                col={col}
                value={valuesMap[col.name]}
                lookupRows={lookupRows}
                onChange={(v) => setColumnValue(col.name, v)}
              />
            );
          }

          if (isBooleanType(col.type)) {
            const v = valuesMap[col.name];
            const checked =
              v?.kind === 'literal' ? Boolean(v.value) : false;
            return (
              <Checkbox
                key={col.name}
                label={col.name}
                description={col.type}
                checked={checked}
                onChange={(e) =>
                  setLiteral(col.name, e.currentTarget.checked)
                }
              />
            );
          }

          const mode = modeForColumn(col.name);
          const isRaw = mode !== '__literal__';

          return (
            <div key={col.name} className="script-field">
              <Group gap="xs" align="flex-end" wrap="nowrap">
                <Select
                  label={col.name}
                  description={col.type}
                  data={RAW_PRESETS}
                  value={mode}
                  onChange={(m) => handleModeChange(col.name, m)}
                  allowDeselect={false}
                  w={140}
                  size="xs"
                />
                {!isRaw &&
                  (isNumericType(col.type) ? (
                    <NumberInput
                      label=" "
                      size="xs"
                      style={{ flex: 1 }}
                      value={(() => {
                        const lit = valuesMap[col.name];
                        if (
                          lit?.kind !== 'literal' ||
                          lit.value === null
                        ) {
                          return undefined;
                        }
                        const n = Number(lit.value);
                        return Number.isFinite(n) ? n : undefined;
                      })()}
                      onChange={(n) =>
                        setLiteral(
                          col.name,
                          n === '' || n === undefined ? null : Number(n),
                        )
                      }
                    />
                  ) : (
                    <TextInput
                      label=" "
                      size="xs"
                      style={{ flex: 1 }}
                      value={literalDisplay(valuesMap[col.name])}
                      onChange={(e) =>
                        setLiteral(col.name, e.currentTarget.value)
                      }
                    />
                  ))}
              </Group>
            </div>
          );
        })}
      </Stack>
    );
  };

  return (
    <Drawer
      withOverlay={false}
      opened={workspaceOpen && !!draft}
      onClose={closeWorkspace}
      title={draft ? `Script ${titleKind} · ${draft.table}` : `Script ${titleKind}`}
      position="right"
      size="lg"
      padding="md"
    >
      {draft && (
        <Stack gap="md" className="script-workspace">
          <SegmentedControl
            size="xs"
            fullWidth
            value={draft.kind}
            onChange={(v) => switchKind(v as ScriptKind)}
            data={[
              { label: 'INSERT', value: 'insert' },
              { label: 'SELECT', value: 'select' },
              { label: 'UPDATE', value: 'update' },
            ]}
          />

          {draft.kind === 'insert' && (
            <>
              <Text size="xs" c="dimmed">
                Fill fields or drag rows from the data grid onto FK slots. SQL
                updates below.
              </Text>
              {renderSetFields()}
            </>
          )}

          {draft.kind === 'update' && (
            <>
              <Text size="xs" c="dimmed">
                Set columns to update (drag FK rows / literal / GETDATE / NULL),
                then add WHERE conditions.
              </Text>
              {renderSetFields()}
              <WhereClauseEditor
                columns={draft.columns}
                where={draft.where}
                onAdd={addWhereClause}
                onUpdate={updateWhereClause}
                onRemove={removeWhereClause}
                lookupRows={lookupRows}
              />
            </>
          )}

          {draft.kind === 'select' && (
            <>
              <Text size="xs" c="dimmed">
                Pick columns (empty = *) and add WHERE conditions. Drag FK rows
                from the grid onto FK slots.
              </Text>

              <MultiSelect
                label="Columns"
                description="Leave empty for SELECT *"
                size="xs"
                data={selectColumnOptions}
                value={draft.selectColumns}
                onChange={setSelectColumns}
                searchable
                clearable
                placeholder="* (all columns)"
              />

              <WhereClauseEditor
                columns={draft.columns}
                where={draft.where}
                onAdd={addWhereClause}
                onUpdate={updateWhereClause}
                onRemove={removeWhereClause}
                lookupRows={lookupRows}
              />
            </>
          )}

          <div className="script-workspace__sql">
            <Group justify="space-between" mb={6}>
              <Text size="sm" fw={600}>
                Generated SQL
              </Text>
              <Group gap="xs">
                {copyMsg && (
                  <Text size="xs" c="dimmed">
                    {copyMsg}
                  </Text>
                )}
                <Button
                  size="xs"
                  variant="filled"
                  loading={running}
                  disabled={!canRun || running}
                  onClick={() => void handleRun()}
                >
                  Run
                </Button>
                <Button size="xs" variant="light" onClick={() => void handleCopy()}>
                  Copy SQL
                </Button>
                <Button size="xs" variant="subtle" color="red" onClick={handleClear}>
                  Clear
                </Button>
              </Group>
            </Group>
            <div className="script-workspace__editor">
              <Editor
                height="220px"
                language="sql"
                theme="vs-dark"
                value={sql}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 12,
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>

          {runError && (
            <Text size="sm" c="red.4">
              {runError}
            </Text>
          )}

          {queryResult && !runError && (
            <div className="script-workspace__results">
              <Group justify="space-between" mb={6}>
                <Text size="sm" fw={600}>
                  Results
                </Text>
                <Text size="xs" c="dimmed">
                  {queryResult.rowCount ?? resultRows.length} row(s)
                  {queryResult.durationMs != null
                    ? ` · ${queryResult.durationMs} ms`
                    : ''}
                </Text>
              </Group>
              {resultColumns.length === 0 ? (
                <Text size="xs" c="dimmed">
                  No columns returned.
                </Text>
              ) : (
                <ScrollArea h={220} type="auto">
                  <Table
                    striped
                    highlightOnHover
                    stickyHeader
                    horizontalSpacing="sm"
                    verticalSpacing={4}
                    className="script-workspace__results-table"
                  >
                    <Table.Thead>
                      <Table.Tr>
                        {resultColumns.map((col) => (
                          <Table.Th key={col.name}>
                            <span className="table-data-panel__col-name">
                              {col.name}
                            </span>
                            <span className="table-data-panel__col-type">
                              {col.type}
                            </span>
                          </Table.Th>
                        ))}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {resultRows.length === 0 ? (
                        <Table.Tr>
                          <Table.Td colSpan={resultColumns.length}>
                            <Text size="sm" c="dimmed">
                              No rows
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ) : (
                        resultRows.map((row, rowIndex) => (
                          <Table.Tr key={rowIndex}>
                            {resultColumns.map((col) => (
                              <Table.Td key={col.name}>
                                {formatCell(row[col.name])}
                              </Table.Td>
                            ))}
                          </Table.Tr>
                        ))
                      )}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              )}
            </div>
          )}
        </Stack>
      )}
    </Drawer>
  );
}
