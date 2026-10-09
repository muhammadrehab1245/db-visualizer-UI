import type { QueryRequest, QueryResponse } from '../../../shared/types/query';
import { apiClient, getApiErrorMessage } from '../../../shared/api/client';

export async function executeQuery(
  body: QueryRequest,
): Promise<QueryResponse> {
  try {
    const { data } = await apiClient.post<QueryResponse>('/query', body);
    return data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
