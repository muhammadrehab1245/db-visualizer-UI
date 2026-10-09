/** Bracket-quoted T-SQL identifier */
export function bracketIdent(name: string): string {
  return `[${name.replaceAll(']', ']]')}]`;
}

/** NVARCHAR literal with N'...' escaping */
export function nString(value: string): string {
  return `N'${value.replaceAll("'", "''")}'`;
}

export function qualifyTable(
  database: string,
  schema: string,
  table: string,
): string {
  return `${bracketIdent(database)}.${bracketIdent(schema)}.${bracketIdent(table)}`;
}

export function qualifySchemaTable(schema: string, table: string): string {
  return `${bracketIdent(schema)}.${bracketIdent(table)}`;
}
