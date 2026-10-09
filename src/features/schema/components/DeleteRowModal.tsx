import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import type { Column } from '../../../shared/types/schema';
import { deleteRow } from '../api/rowsApi';
import {
  buildPrimaryKey,
  formatCell,
  rowLabel,
} from '../utils/rowHelpers';

type DeleteRowModalProps = {
  opened: boolean;
  onClose: () => void;
  database: string;
  schema: string;
  table: string;
  columns: Column[];
  row: Record<string, unknown> | null;
  onSuccess: () => void;
};

export function DeleteRowModal({
  opened,
  onClose,
  database,
  schema,
  table,
  columns,
  row,
  onSuccess,
}: DeleteRowModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = row ? buildPrimaryKey(row, columns) : {};
  const label = row ? rowLabel(row, columns) : '';
  const keyText = Object.entries(key)
    .map(([k, v]) => `${k}=${formatCell(v)}`)
    .join(', ');

  const handleConfirm = async () => {
    if (!row) return;
    setLoading(true);
    setError(null);
    try {
      await deleteRow({ database, schema, table, key });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Delete from ${table}`}
      centered
    >
      <Stack gap="md">
        <Text size="sm">
          Delete this row?
        </Text>
        <Text size="sm" c="dimmed">
          <strong>Key:</strong> {keyText || '—'}
        </Text>
        <Text size="sm" c="dimmed">
          <strong>Label:</strong> {label}
        </Text>
        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button color="red" loading={loading} onClick={() => void handleConfirm()}>
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
