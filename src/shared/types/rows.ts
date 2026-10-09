export type RowMutationBase = {
  database: string;
  schema: string;
  table: string;
};

export type InsertRowRequest = RowMutationBase & {
  row: Record<string, unknown>;
};

export type UpdateRowRequest = RowMutationBase & {
  key: Record<string, unknown>;
  row: Record<string, unknown>;
};

export type DeleteRowRequest = RowMutationBase & {
  key: Record<string, unknown>;
};

export type RowMutationResponse = {
  ok: boolean;
  table: string;
  key?: Record<string, unknown>;
  row?: Record<string, unknown>;
  affected?: number;
  error?: string;
};

export type FkOption = {
  value: string;
  label: string;
};

export type FkOptionsLookup = {
  id: string;
  table: string;
  valueColumn: string;
  displayColumn?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type FkOptionsRequest = {
  database: string;
  schema: string;
  lookups: FkOptionsLookup[];
};

export type FkOptionsResult = {
  id: string;
  ok: boolean;
  table?: string;
  valueColumn?: string;
  displayColumn?: string;
  options?: FkOption[];
  total?: number;
  page?: number;
  pageSize?: number;
  error?: string;
};

export type FkOptionsResponse = {
  database: string;
  schema: string;
  results: FkOptionsResult[];
};
