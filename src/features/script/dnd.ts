export const DBVIZ_ROW_MIME = 'application/x-dbviz-row';

export type DragRowPayload = {
  table: string;
  /** Always ≥1 when set via setDragRowPayload */
  rows: Record<string, unknown>[];
};

export function setDragRowPayload(
  dataTransfer: DataTransfer,
  payload: DragRowPayload,
): void {
  if (!payload.rows.length) {
    throw new Error('DragRowPayload.rows must be non-empty');
  }
  const json = JSON.stringify(payload);
  dataTransfer.setData(DBVIZ_ROW_MIME, json);
  dataTransfer.setData('text/plain', json);
  dataTransfer.effectAllowed = 'copy';
}

export function getDragRowPayload(
  dataTransfer: DataTransfer,
): DragRowPayload | null {
  const raw =
    dataTransfer.getData(DBVIZ_ROW_MIME) ||
    dataTransfer.getData('text/plain');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      table?: string;
      rows?: Record<string, unknown>[];
      row?: Record<string, unknown>;
    };
    if (typeof parsed?.table !== 'string') return null;

    let rows = parsed.rows;
    if ((!rows || !Array.isArray(rows) || rows.length === 0) && parsed.row) {
      rows = [parsed.row];
    }
    if (!rows || !Array.isArray(rows) || rows.length === 0) return null;
    if (!rows.every((r) => r && typeof r === 'object')) return null;

    return { table: parsed.table, rows };
  } catch {
    return null;
  }
}
