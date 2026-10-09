import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
} from '@xyflow/react';
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import type { DataTableRequest, TableDataResult } from '../../../shared/types/data';
import type { Column } from '../../../shared/types/schema';
import { ScriptWorkspace } from '../../script/components/ScriptWorkspace';
import { useScriptStore } from '../../script/store/scriptStore';
import type { AppMode } from '../../script/types';
import { fetchTableData } from '../api/dataApi';
import { fetchSchema } from '../api/schemaApi';
import { useSchemaStore } from '../store/schemaStore';
import { TableDataPanel, PAGE_SIZE } from './TableDataPanel';
import { TableNode } from './TableNode';

const nodeTypes: NodeTypes = {
  table: TableNode,
};

const MAX_SELECTED_TABLES = 10;

const DEFAULT_TABLES = [
  'permissions',
  'end_points',
  'url_endpoint',
  'base_url',
  'role_permission',
  'roles',
];

type SchemaCanvasProps = {
  database: string;
  defaultSchema?: string;
  appMode?: AppMode;
};

function resolveTableName(
  tables: { id: string; name: string }[],
  nodeId: string,
): string {
  return tables.find((t) => t.id === nodeId || t.name === nodeId)?.name ?? nodeId;
}

function SchemaCanvasInner({
  database,
  defaultSchema = 'dbo',
  appMode = 'explore',
}: SchemaCanvasProps) {
  const nodes = useSchemaStore((s) => s.nodes);
  const edges = useSchemaStore((s) => s.edges);
  const tables = useSchemaStore((s) => s.tables);
  const onNodesChange = useSchemaStore((s) => s.onNodesChange);
  const loadSchema = useSchemaStore((s) => s.loadSchema);
  const setSelection = useSchemaStore((s) => s.setSelection);
  const clearSelection = useSchemaStore((s) => s.clearSelection);
  const selectedTableIds = useSchemaStore((s) => s.selectedTableIds);
  const activeTableId = useSchemaStore((s) => s.activeTableId);
  const autoLayout = useSchemaStore((s) => s.autoLayout);
  const startInsert = useScriptStore((s) => s.startInsert);
  const startSelect = useScriptStore((s) => s.startSelect);
  const startUpdate = useScriptStore((s) => s.startUpdate);
  const { fitView } = useReactFlow();

  const [schemaName, setSchemaName] = useState(defaultSchema);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectHint, setSelectHint] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const [dataLoading, setDataLoading] = useState(false);
  const [dataRequestError, setDataRequestError] = useState<string | null>(null);
  const [dataResults, setDataResults] = useState<TableDataResult[]>([]);
  const [dataPages, setDataPages] = useState<Record<string, number>>({});
  const [panelOpen, setPanelOpen] = useState(false);

  const selectedTableNames = selectedTableIds.map((id) =>
    resolveTableName(tables, id),
  );
  const activeTableName = activeTableId
    ? resolveTableName(tables, activeTableId)
    : (selectedTableNames[0] ?? '');

  const loadFromApi = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        setError('Schema name is required');
        return;
      }

      setLoading(true);
      setError(null);
      setSelectHint(null);
      setPanelOpen(false);
      setDataResults([]);
      setDataPages({});
      useSchemaStore.setState({
        tables: [],
        nodes: [],
        edges: [],
        selectedTableIds: [],
        activeTableId: null,
      });
      try {
        const json = await fetchSchema({
          schema: trimmed,
          database,
          tables: DEFAULT_TABLES,
        });
        await loadSchema(json);
        requestAnimationFrame(() => fitView({ padding: 0.2 }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load schema');
      } finally {
        setLoading(false);
      }
    },
    [database, fitView, loadSchema],
  );

  const buildTableRequest = useCallback(
    (tableName: string, page: number): DataTableRequest => {
      const pkCol = tables
        .find((t) => t.name === tableName || t.id === tableName)
        ?.columns.find((c) => c.pk)?.name;

      return {
        name: tableName,
        page,
        pageSize: PAGE_SIZE,
        ...(pkCol ? { orderBy: pkCol, order: 'asc' as const } : {}),
      };
    },
    [tables],
  );

  const loadTablesData = useCallback(
    async (tableNames: string[], pages: Record<string, number>) => {
      if (tableNames.length === 0) return;

      setDataLoading(true);
      setDataRequestError(null);
      try {
        const response = await fetchTableData({
          database,
          schema: schemaName.trim() || defaultSchema,
          tables: tableNames.map((name) =>
            buildTableRequest(name, pages[name] ?? 1),
          ),
        });

        const byName = new Map(response.results.map((r) => [r.table, r]));
        setDataResults(
          tableNames.map(
            (name) =>
              byName.get(name) ?? {
                table: name,
                ok: false,
                error: 'No result returned for table',
              },
          ),
        );
      } catch (err) {
        setDataResults([]);
        setDataRequestError(
          err instanceof Error ? err.message : 'Failed to load table data',
        );
      } finally {
        setDataLoading(false);
      }
    },
    [buildTableRequest, database, defaultSchema, schemaName],
  );

  const loadOneTablePage = useCallback(
    async (tableName: string, page: number) => {
      setDataLoading(true);
      setDataRequestError(null);
      try {
        const response = await fetchTableData({
          database,
          schema: schemaName.trim() || defaultSchema,
          tables: [buildTableRequest(tableName, page)],
        });
        const result = response.results[0] ?? {
          table: tableName,
          ok: false,
          error: 'No result returned for table',
        };
        setDataResults((prev) => {
          const next = [...prev];
          const idx = next.findIndex((r) => r.table === tableName);
          if (idx >= 0) next[idx] = result;
          else next.push(result);
          return next;
        });
      } catch (err) {
        setDataRequestError(
          err instanceof Error ? err.message : 'Failed to load table data',
        );
      } finally {
        setDataLoading(false);
      }
    },
    [buildTableRequest, database, defaultSchema, schemaName],
  );

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    void loadFromApi(defaultSchema);
  }, [defaultSchema, loadFromApi]);

  const handleAutoLayout = async () => {
    await autoLayout();
    requestAnimationFrame(() => fitView({ padding: 0.2, duration: 300 }));
  };

  const handleNodeClick = (event: MouseEvent, node: { id: string }) => {
    const multi = event.ctrlKey || event.metaKey;
    const name = resolveTableName(tables, node.id);
    setSelectHint(null);

    if (multi) {
      const current = useSchemaStore.getState().selectedTableIds;
      const exists = current.includes(node.id);
      let next: string[];

      if (exists) {
        next = current.filter((id) => id !== node.id);
      } else {
        if (current.length >= MAX_SELECTED_TABLES) {
          setSelectHint(`Max ${MAX_SELECTED_TABLES} tables`);
          return;
        }
        next = [...current, node.id];
      }

      if (next.length === 0) {
        clearSelection();
        setPanelOpen(false);
        setDataResults([]);
        setDataPages({});
        return;
      }

      const activeId = exists
        ? (next[next.length - 1] ?? null)
        : node.id;
      setSelection(next, activeId);

      const names = next.map((id) => resolveTableName(tables, id));
      const pages: Record<string, number> = {};
      for (const n of names) pages[n] = 1;
      setDataPages(pages);
      setPanelOpen(true);
      setDataResults([]);
      void loadTablesData(names, pages);
      return;
    }

    // Single select — replace
    setSelection([node.id], node.id);
    const pages = { [name]: 1 };
    setDataPages(pages);
    setPanelOpen(true);
    setDataResults([]);
    void loadTablesData([name], pages);
  };

  const handlePaneClick = () => {
    clearSelection();
    setPanelOpen(false);
    setDataResults([]);
    setDataPages({});
    setDataRequestError(null);
    setSelectHint(null);
  };

  const handleActiveTableChange = (tableName: string) => {
    const nodeId =
      tables.find((t) => t.name === tableName || t.id === tableName)?.id ??
      tableName;
    setSelection(selectedTableIds, nodeId);
  };

  const handlePageChange = (tableName: string, page: number) => {
    setDataPages((prev) => ({ ...prev, [tableName]: page }));
    void loadOneTablePage(tableName, page);
  };

  const handleClosePanel = () => {
    clearSelection();
    setPanelOpen(false);
    setDataResults([]);
    setDataPages({});
    setDataRequestError(null);
    setSelectHint(null);
  };

  const resolveScriptTable = (tableName: string, columns: Column[]) => {
    const schemaTable = tables.find(
      (t) => t.name === tableName || t.id === tableName,
    );
    const cols =
      schemaTable?.columns?.length ? schemaTable.columns : columns;
    return {
      database,
      schema: schemaName.trim() || defaultSchema,
      table: schemaTable?.name ?? tableName,
      columns: cols,
    };
  };

  const handleScriptInsert = (tableName: string, columns: Column[]) => {
    startInsert(resolveScriptTable(tableName, columns));
  };

  const handleScriptSelect = (tableName: string, columns: Column[]) => {
    startSelect(resolveScriptTable(tableName, columns));
  };

  const handleScriptUpdate = (tableName: string, columns: Column[]) => {
    startUpdate(resolveScriptTable(tableName, columns));
  };

  return (
    <div className={`schema-workspace${panelOpen ? ' schema-workspace--split' : ''}`}>
      <div className="schema-canvas">
        <div className="schema-toolbar">
          <span className="schema-toolbar__title">Schema</span>
          <input
            className="schema-toolbar__input"
            type="text"
            value={schemaName}
            onChange={(e) => setSchemaName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void loadFromApi(schemaName);
            }}
            placeholder="dbo"
            disabled={loading}
            aria-label="SQL Server schema name"
          />
          <button
            type="button"
            className="schema-toolbar__btn"
            disabled={loading}
            onClick={() => void loadFromApi(schemaName)}
          >
            {loading ? 'Loading…' : 'Load'}
          </button>
          <button
            type="button"
            className="schema-toolbar__btn"
            disabled={loading || nodes.length === 0}
            onClick={() => void handleAutoLayout()}
          >
            Auto layout
          </button>
          {selectedTableIds.length > 0 && (
            <span className="schema-toolbar__meta">
              {selectedTableIds.length} selected
              {selectedTableIds.length > 1 ? ' · Ctrl+click to toggle' : ''}
            </span>
          )}
          {selectHint && (
            <span className="schema-toolbar__error">{selectHint}</span>
          )}
          {error && <span className="schema-toolbar__error">{error}</span>}
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          multiSelectionKeyCode={null}
          selectionKeyCode={null}
          fitView
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={18} size={1} color="#222222" />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor="#1A1A1A"
            maskColor="rgba(0, 0, 0, 0.7)"
            style={{ background: '#111111' }}
          />
        </ReactFlow>
      </div>

      {panelOpen && selectedTableNames.length > 0 && (
        <TableDataPanel
          tableNames={selectedTableNames}
          activeTable={activeTableName}
          onActiveTableChange={handleActiveTableChange}
          loading={dataLoading}
          requestError={dataRequestError}
          results={dataResults}
          pages={dataPages}
          onPageChange={handlePageChange}
          onClose={handleClosePanel}
          database={database}
          schema={schemaName.trim() || defaultSchema}
          appMode={appMode}
          onScriptInsert={handleScriptInsert}
          onScriptSelect={handleScriptSelect}
          onScriptUpdate={handleScriptUpdate}
          onMutated={(table) => {
            void loadOneTablePage(table, dataPages[table] ?? 1);
          }}
        />
      )}

      {appMode === 'script' && <ScriptWorkspace dataResults={dataResults} />}
    </div>
  );
}

export function SchemaCanvas(props: SchemaCanvasProps) {
  return (
    <ReactFlowProvider>
      <SchemaCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
