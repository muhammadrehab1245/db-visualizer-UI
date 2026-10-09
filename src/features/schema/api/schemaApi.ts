import type { DatabaseSchema } from '../../../shared/types/schema';
import { apiClient, getApiErrorMessage } from '../../../shared/api/client';

type SchemaRequestBody = {
  tables?: string[];
};

export type FetchSchemaOptions = {
  schema: string;
  database: string;
  tables?: string[];
};

export async function fetchSchema({
  schema,
  database,
  tables,
}: FetchSchemaOptions): Promise<DatabaseSchema> {
  try {
    const body: SchemaRequestBody =
      tables && tables.length > 0 ? { tables } : {};

    const { data } = await apiClient.post<DatabaseSchema>(
      '/schema',
      body,
      { params: { schema, database } },
    );
    return data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function checkHealth(): Promise<{ ok: boolean }> {
  try {
    const { data } = await apiClient.get<{ ok: boolean }>('/health');
    return data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
