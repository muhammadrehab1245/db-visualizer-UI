import type {
  DeleteRowRequest,
  InsertRowRequest,
  RowMutationResponse,
  UpdateRowRequest,
} from '../../../shared/types/rows';
import { apiClient, getApiErrorMessage } from '../../../shared/api/client';

export async function insertRow(
  body: InsertRowRequest,
): Promise<RowMutationResponse> {
  try {
    const { data } = await apiClient.post<RowMutationResponse>('/rows', body);
    return data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function updateRow(
  body: UpdateRowRequest,
): Promise<RowMutationResponse> {
  try {
    const { data } = await apiClient.patch<RowMutationResponse>('/rows', body);
    return data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function deleteRow(
  body: DeleteRowRequest,
): Promise<RowMutationResponse> {
  try {
    const { data } = await apiClient.delete<RowMutationResponse>('/rows', {
      data: body,
    });
    return data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
