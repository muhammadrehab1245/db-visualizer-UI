export type ForeignKeyRef = {
  table: string;
  column: string;
  displayColumn?: string;
};

export type Column = {
  name: string;
  type: string;
  pk?: boolean;
  fk?: ForeignKeyRef;
  nullable?: boolean;
  identity?: boolean;
};

export type TableSchema = {
  id: string;
  name: string;
  columns: Column[];
};

/** Shape returned by POST /schema */
export type DatabaseSchema = {
  tables: TableSchema[];
};
