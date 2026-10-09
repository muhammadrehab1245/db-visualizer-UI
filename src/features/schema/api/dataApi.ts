import type { DataResponse, FetchDataRequest } from '../../../shared/types/data';
import type {
  FkOptionsLookup,
  FkOptionsRequest,
  FkOptionsResponse,
} from '../../../shared/types/rows';
import type { Column } from '../../../shared/types/schema';
import { apiClient, getApiErrorMessage } from '../../../shared/api/client';

export async function fetchTableData(
  body: FetchDataRequest,
): Promise<DataResponse> {
  try {
    const { data } = await apiClient.post<DataResponse>('/data', body);
    return data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export function buildFkLookups(
  table: string,
  columns: Column[],
): FkOptionsLookup[] {
  return columns
    .filter((col) => col.fk)
    .map((col) => {
      const fk = col.fk!;
      const lookup: FkOptionsLookup = {
        id: `${table}.${col.name}`,
        table: fk.table,
        valueColumn: fk.column,
        page: 1,
        pageSize: 200,
      };
      if (fk.displayColumn) {
        lookup.displayColumn = fk.displayColumn;
      }
      return lookup;
    });
}

export async function fetchFkOptionsBatch(
  body: FkOptionsRequest,
): Promise<FkOptionsResponse> {
  try {
    const { data } = await apiClient.post<FkOptionsResponse>(
      '/fk-options',
      body,
    );
    return data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
