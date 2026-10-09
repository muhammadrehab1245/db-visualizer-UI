import type { Column } from './schema';

export type DataFilter = {
  column: string;
  op: 'eq';
  value: unknown;
};

export type DataTableRequest = {
  name: string;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
  columns?: string[];
  filter?: DataFilter;
};

export type FetchDataRequest = {
  database: string;
  schema: string;
  tables: DataTableRequest[];
};

export type TableDataResult = {
  table: string;
  ok: boolean;
  columns?: Column[];
  rows?: Record<string, unknown>[];
  total?: number;
  page?: number;
  pageSize?: number;
  error?: string;
};

export type DataResponse = {
  database: string;
  schema: string;
  results: TableDataResult[];
};
