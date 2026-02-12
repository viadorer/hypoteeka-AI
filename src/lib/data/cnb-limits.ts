/**
 * ČNB Regulatory Limits Service
 * 
 * Loads LTV, DSTI, DTI limits from database (cnb_limits table).
 * Falls back to hardcoded defaults if DB is unavailable.
 * Cache: 1 hour (limits change very rarely).
 */

import { createClient } from '@supabase/supabase-js';
import { getDefaultTenantId } from '../tenant/config';

export interface CnbLimits {
  ltvLimit: number;
  ltvLimitYoung: number;
  youngAgeLimit: number;
  dstiLimit: number;
  dtiLimit: number;
  validFrom: string;
  source: string;
}

const FALLBACK_LIMITS: CnbLimits = {
  ltvLimit: 0.80,
  ltvLimitYoung: 0.90,
  youngAgeLimit: 36,
  dstiLimit: 0.45,
  dtiLimit: 9.5,
  validFrom: '2024-01-01',
  source: 'hardcoded fallback',
};

let cachedLimits: CnbLimits | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get current ČNB limits for a tenant.
 * Tries DB first, falls back to hardcoded defaults.
 */
export async function getCnbLimits(tenantId = getDefaultTenantId()): Promise<CnbLimits> {
  if (cachedLimits && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedLimits;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('[CnbLimits] No Supabase credentials, using fallback limits');
    cachedLimits = FALLBACK_LIMITS;
    cacheTimestamp = Date.now();
    return FALLBACK_LIMITS;
  }

  try {
    const db = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await db
      .from('cnb_limits')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('valid_to', null)
      .order('valid_from', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.log(`[CnbLimits] DB query failed (${error?.message ?? 'no data'}), using fallback`);
      cachedLimits = FALLBACK_LIMITS;
      cacheTimestamp = Date.now();
      return FALLBACK_LIMITS;
    }

    cachedLimits = {
      ltvLimit: Number(data.ltv_limit),
      ltvLimitYoung: Number(data.ltv_limit_young),
      youngAgeLimit: Number(data.young_age_limit),
      dstiLimit: Number(data.dsti_limit),
      dtiLimit: Number(data.dti_limit),
      validFrom: data.valid_from,
      source: data.source ?? 'DB',
    };
    cacheTimestamp = Date.now();
    console.log(`[CnbLimits] Loaded from DB: LTV ${cachedLimits.ltvLimit * 100}%, DSTI ${cachedLimits.dstiLimit * 100}%, DTI ${cachedLimits.dtiLimit}x (valid from ${cachedLimits.validFrom})`);
    return cachedLimits;
  } catch (err) {
    console.error(`[CnbLimits] Error: ${err instanceof Error ? err.message : err}`);
    cachedLimits = FALLBACK_LIMITS;
    cacheTimestamp = Date.now();
    return FALLBACK_LIMITS;
  }
}
