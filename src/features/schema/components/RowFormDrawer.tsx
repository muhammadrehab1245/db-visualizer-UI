import {
  Button,
  Checkbox,
  Drawer,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect, useMemo, useState } from 'react';
import type { FkOption } from '../../../shared/types/rows';
import type { Column } from '../../../shared/types/schema';
import { buildFkLookups, fetchFkOptionsBatch } from '../api/dataApi';
import { insertRow, updateRow } from '../api/rowsApi';
import {
  buildInsertPayload,
  buildPrimaryKey,
  buildUpdatePayload,
  formColumns,
  isBooleanType,
  isNumericType,
  isTextAreaType,
} from '../utils/rowHelpers';

export type RowFormMode = 'insert' | 'edit';

type RowFormDrawerProps = {
  opened: boolean;
  onClose: () => void;
  mode: RowFormMode;
  database: string;
  schema: string;
  table: string;
  columns: Column[];
  /** Current row when editing */
  row?: Record<string, unknown> | null;
  onSuccess: () => void;
};

type FkFieldState = {
  options: FkOption[];
  error?: string;
};

function initialValues(
  columns: Column[],
  mode: RowFormMode,
  row?: Record<string, unknown> | null,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const col of formColumns(columns)) {
    if (mode === 'insert' && col.identity) continue;
    if (row && col.name in row) {
      const v = row[col.name];
      values[col.name] = v == null ? '' : v;
    } else if (isBooleanType(col.type)) {
      values[col.name] = false;
    } else {
      values[col.name] = '';
    }
  }
  return values;
}

function FkSelectField({
  col,
  options,
  loading,
  loadError,
  value,
  onChange,
  error,
  disabled,
}: {
  col: Column;
  options: FkOption[];
  loading?: boolean;
  loadError?: string;
  value: string | null;
  onChange: (v: string | null) => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <Select
      label={col.name}
      description={
        col.fk ? `FK → ${col.fk.table}.${col.fk.column}` : undefined
      }
      data={options}
      value={value === '' || value == null ? null : String(value)}
      onChange={onChange}
      searchable
      clearable={col.nullable !== false}
      disabled={disabled || loading}
      error={error ?? loadError}
      nothingFoundMessage={loading ? 'Loading…' : 'No options'}
      required={col.nullable === false}
    />
  );
}

export function RowFormDrawer({
  opened,
  onClose,
  mode,
  database,
  schema,
  table,
  columns,
  row,
  onSuccess,
}: RowFormDrawerProps) {
  const fields = useMemo(() => {
    const cols = formColumns(columns);
    if (mode === 'insert') return cols.filter((c) => !c.identity);
    return cols;
  }, [columns, mode]);

  const form = useForm({
    initialValues: initialValues(columns, mode, row),
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fkLoading, setFkLoading] = useState(false);
  const [fkById, setFkById] = useState<Record<string, FkFieldState>>({});

  useEffect(() => {
    if (!opened) return;
    form.setValues(initialValues(columns, mode, row));
    form.clearErrors();
    setSubmitError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when drawer opens / row changes
  }, [opened, mode, table, row, columns]);

  useEffect(() => {
    if (!opened) return;

    const lookups = buildFkLookups(table, fields);
    if (lookups.length === 0) {
      setFkById({});
      setFkLoading(false);
      return;
    }

    let cancelled = false;
    setFkLoading(true);
    setFkById({});

    void fetchFkOptionsBatch({ database, schema, lookups })
      .then((response) => {
        if (cancelled) return;
        const next: Record<string, FkFieldState> = {};
        for (const result of response.results) {
          next[result.id] = result.ok
            ? { options: result.options ?? [] }
            : {
                options: [],
                error: result.error ?? `Failed to load options for ${result.id}`,
              };
        }
        setFkById(next);
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load FK options';
        const next: Record<string, FkFieldState> = {};
        for (const lookup of lookups) {
          next[lookup.id] = { options: [], error: message };
        }
        setFkById(next);
      })
      .finally(() => {
        if (!cancelled) setFkLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [opened, database, schema, table, fields]);

  const handleSubmit = form.onSubmit(async (values) => {
    const errors: Record<string, string> = {};
    for (const col of fields) {
      if (mode === 'edit' && col.pk) continue;
      if (col.nullable !== false) continue;
      const v = values[col.name];
      if (v === '' || v === null || v === undefined) {
        errors[col.name] = 'Required';
      }
    }
    if (Object.keys(errors).length > 0) {
      form.setErrors(errors);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      if (mode === 'insert') {
        await insertRow({
          database,
          schema,
          table,
          row: buildInsertPayload(values, columns),
        });
      } else {
        if (!row) throw new Error('No row to update');
        const key = buildPrimaryKey(row, columns);
        await updateRow({
          database,
          schema,
          table,
          key,
          row: buildUpdatePayload(values, columns),
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={mode === 'insert' ? `Insert · ${table}` : `Edit · ${table}`}
      position="right"
      size="md"
      padding="md"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="sm">
          {fields.map((col) => {
            const locked = mode === 'edit' && !!col.pk;
            const required = col.nullable === false && !locked;

            if (col.fk) {
              const lookupId = `${table}.${col.name}`;
              const fkState = fkById[lookupId];
              return (
                <FkSelectField
                  key={col.name}
                  col={col}
                  options={fkState?.options ?? []}
                  loading={fkLoading}
                  loadError={fkState?.error}
                  value={
                    form.values[col.name] == null
                      ? null
                      : typeof form.values[col.name] === 'object'
                        ? JSON.stringify(form.values[col.name])
                        : String(
                            form.values[col.name] as string | number | boolean,
                          )
                  }
                  onChange={(v) => form.setFieldValue(col.name, v ?? '')}
                  error={form.errors[col.name] as string | undefined}
                  disabled={locked}
                />
              );
            }

            if (isBooleanType(col.type)) {
              return (
                <Checkbox
                  key={col.name}
                  label={col.name}
                  disabled={locked}
                  {...form.getInputProps(col.name, { type: 'checkbox' })}
                />
              );
            }

            if (isNumericType(col.type)) {
              return (
                <NumberInput
                  key={col.name}
                  label={col.name}
                  description={col.type}
                  required={required}
                  disabled={locked}
                  value={
                    form.values[col.name] === '' ||
                    form.values[col.name] == null
                      ? undefined
                      : Number(form.values[col.name])
                  }
                  onChange={(v) =>
                    form.setFieldValue(
                      col.name,
                      v === '' || v === undefined ? '' : v,
                    )
                  }
                  error={form.errors[col.name]}
                />
              );
            }

            if (isTextAreaType(col.type)) {
              return (
                <Textarea
                  key={col.name}
                  label={col.name}
                  description={col.type}
                  required={required}
                  disabled={locked}
                  minRows={3}
                  {...form.getInputProps(col.name)}
                />
              );
            }

            return (
              <TextInput
                key={col.name}
                label={col.name}
                description={col.type}
                required={required}
                disabled={locked}
                {...form.getInputProps(col.name)}
              />
            );
          })}

          {submitError && (
            <Text size="sm" c="red">
              {submitError}
            </Text>
          )}

          <Button type="submit" loading={submitting}>
            {mode === 'insert' ? 'Insert' : 'Save'}
          </Button>
        </Stack>
      </form>
    </Drawer>
  );
}
