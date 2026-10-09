import type { Column } from './schema';

export type QueryRequest = {
  database: string;
  schema: string;
  sql: string;
  maxRows?: number;
};

export type QueryResponse = {
  columns?: Column[];
  rows?: Record<string, unknown>[];
  rowCount?: number;
  durationMs?: number;
  error?: string;
};
