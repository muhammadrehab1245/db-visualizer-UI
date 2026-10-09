export type TenantId = 'pso' | 'halan' | 'nbp';

export type TenantConfig = {
  id: TenantId;
  label: string;
  database: string;
  schema: string;
};

export const TENANTS: Record<TenantId, TenantConfig> = {
  pso: {
    id: 'pso',
    label: 'PSO',
    database: 'backoffice_v2',
    schema: 'dbo',
  },
  halan: {
    id: 'halan',
    label: 'Halan',
    database: 'backoffice_v2',
    schema: 'dbo',
  },
  nbp: {
    id: 'nbp',
    label: 'NBP',
    database: 'nbp_backoffice',
    schema: 'dbo',
  },
};

export const DEFAULT_TENANT: TenantId = 'pso';

export const TENANT_OPTIONS = (
  Object.values(TENANTS) as TenantConfig[]
).map((t) => ({
  value: t.id,
  label: t.label,
}));
