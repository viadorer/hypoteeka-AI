'use client';

import { getTenantConfig, getDefaultTenantId, type TenantConfig } from './config';

/**
 * Client-side tenant config hook.
 * Reads NEXT_PUBLIC_TENANT_ID at build time.
 */
export function useTenant(): TenantConfig {
  return getTenantConfig(getDefaultTenantId());
}
