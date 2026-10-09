import { SegmentedControl, Text } from '@mantine/core';
import { useState } from 'react';
import { SchemaCanvas } from '../features/schema/components/SchemaCanvas';
import type { AppMode } from '../features/script/types';
import {
  DEFAULT_TENANT,
  TENANTS,
  TENANT_OPTIONS,
  type TenantId,
} from '../shared/config/tenants';

const APP_MODE_OPTIONS = [
  { value: 'explore', label: 'Explore' },
  { value: 'script', label: 'Script' },
];

export default function App() {
  const [tenantId, setTenantId] = useState<TenantId>(DEFAULT_TENANT);
  const [appMode, setAppMode] = useState<AppMode>('explore');
  const tenant = TENANTS[tenantId];

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-header__brand">DB Visualizer</h1>
        <SegmentedControl
          size="xs"
          value={tenantId}
          onChange={(value) => setTenantId(value as TenantId)}
          data={TENANT_OPTIONS}
          aria-label="Select tenant database"
        />
        <SegmentedControl
          size="xs"
          value={appMode}
          onChange={(value) => setAppMode(value as AppMode)}
          data={APP_MODE_OPTIONS}
          aria-label="App mode"
        />
        <Text className="app-header__meta" size="xs" c="dimmed">
          {tenant.database} · {tenant.schema}
        </Text>
      </header>
      <main className="app-main">
        <SchemaCanvas
          key={tenantId}
          database={tenant.database}
          defaultSchema={tenant.schema}
          appMode={appMode}
        />
      </main>
    </div>
  );
}
