/**
 * Tenant Configuration
 * 
 * Centrální místo pro čtení konfigurace tenantu.
 * - getTenantConfig() = sync, hardcoded fallback (pro build-time: layout, og-image)
 * - getTenantConfigFromDB() = async, čte z Supabase tabulky `tenants` (pro runtime: chat, prompt builder)
 * 
 * Admin panel edituje DB tabulku `tenants` → getTenantConfigFromDB() vrací aktuální data.
 */

import { supabase, isSupabaseConfigured } from '../supabase/client';

export interface TenantConfig {
  id: string;
  name: string;
  domain: string;
  branding: {
    primaryColor: string;
    accentColor: string;
    title: string;
    description: string;
    logoUrl?: string;
  };
  aiConfig: {
    provider: string;
    model: string;
    temperature: number;
    maxSteps: number;
    apiKeyEnv: string;
  };
  features: {
    liveRates: boolean;
    vocativeGreeting: boolean;
    leadCapture: boolean;
    knowledgeBaseRag: boolean;
    ctaIntensity: 'low' | 'medium' | 'high';
    primaryFlow: 'mortgage' | 'valuation';
  };
  gaId?: string;
  agentName: string;
}

const TENANT_CONFIGS: Record<string, TenantConfig> = {
  hypoteeka: {
    id: 'hypoteeka',
    name: 'Hypoteeka.cz',
    domain: 'hypoteeka.cz',
    branding: {
      primaryColor: '#E91E63',
      accentColor: '#0047FF',
      title: 'Hypoteeka AI',
      description: 'Hypoteční poradce',
    },
    aiConfig: {
      provider: 'google',
      model: 'gemini-2.0-flash',
      temperature: 0.7,
      maxSteps: 5,
      apiKeyEnv: 'GOOGLE_AI_KEY_HYPOTEEKA',
    },
    features: {
      liveRates: true,
      vocativeGreeting: true,
      leadCapture: true,
      knowledgeBaseRag: false,
      ctaIntensity: 'medium',
      primaryFlow: 'mortgage',
    },
    gaId: 'G-Q6HN5J19BT',
    agentName: 'Hugo',
  },
  odhad: {
    id: 'odhad',
    name: 'Odhad.online',
    domain: 'odhad.online',
    branding: {
      primaryColor: '#2962FF',
      accentColor: '#0A1E5C',
      title: 'Odhad.online',
      description: 'Orientační odhad ceny nemovitosti',
      logoUrl: '/images/odhad-online.png',
    },
    aiConfig: {
      provider: 'google',
      model: 'gemini-2.0-flash',
      temperature: 0.5,
      maxSteps: 5,
      apiKeyEnv: 'GOOGLE_AI_KEY_ODHAD',
    },
    features: {
      liveRates: false,
      vocativeGreeting: true,
      leadCapture: true,
      knowledgeBaseRag: false,
      ctaIntensity: 'medium',
      primaryFlow: 'valuation',
    },
    agentName: 'Hugo',
  },
};

const FALLBACK_TENANT = 'hypoteeka';

/**
 * Vrátí default tenant ID z env var NEXT_PUBLIC_TENANT_ID.
 * Fallback na 'hypoteeka' pokud není nastavena.
 */
export function getDefaultTenantId(): string {
  return process.env.NEXT_PUBLIC_TENANT_ID ?? FALLBACK_TENANT;
}

/**
 * Vrátí konfiguraci tenantu.
 * Později: bude číst z Supabase tabulky `tenants`.
 */
export function getTenantConfig(tenantId?: string): TenantConfig {
  const id = tenantId ?? getDefaultTenantId();
  return TENANT_CONFIGS[id] ?? TENANT_CONFIGS[FALLBACK_TENANT];
}

/**
 * Vrátí API key pro daného tenanta z env proměnných.
 * Fallback na GOOGLE_GENERATIVE_AI_API_KEY pro zpětnou kompatibilitu.
 */
export function getTenantApiKey(tenantId?: string): string | undefined {
  const config = getTenantConfig(tenantId);
  return process.env[config.aiConfig.apiKeyEnv] ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

/**
 * Vrátí seznam všech aktivních tenantů.
 */
export function getAllTenants(): TenantConfig[] {
  return Object.values(TENANT_CONFIGS);
}

// ============================================================
// DB-backed tenant config (async, pro runtime)
// ============================================================

interface TenantDbRow {
  id: string;
  name: string;
  domain: string;
  branding: Record<string, unknown>;
  ai_config: Record<string, unknown>;
  features: Record<string, unknown>;
  agent_name: string | null;
  welcome_config: Record<string, unknown>;
  is_active: boolean;
}

// Cache: tenantId → { config, timestamp }
const dbConfigCache: Record<string, { config: TenantConfig; timestamp: number }> = {};
const DB_CACHE_TTL = 5 * 60 * 1000; // 5 minut

function mapDbRowToConfig(row: TenantDbRow): TenantConfig {
  const b = row.branding ?? {};
  const a = row.ai_config ?? {};
  const f = row.features ?? {};
  const hardcoded = TENANT_CONFIGS[row.id];

  return {
    id: row.id,
    name: row.name ?? hardcoded?.name ?? row.id,
    domain: row.domain ?? hardcoded?.domain ?? '',
    branding: {
      primaryColor: (b.primary_color as string) ?? (b.primaryColor as string) ?? hardcoded?.branding.primaryColor ?? '#E91E63',
      accentColor: (b.accent_color as string) ?? (b.accentColor as string) ?? hardcoded?.branding.accentColor ?? '#0047FF',
      title: (b.title as string) ?? hardcoded?.branding.title ?? row.name,
      description: (b.description as string) ?? hardcoded?.branding.description ?? '',
      logoUrl: (b.logo_url as string) ?? (b.logoUrl as string) ?? hardcoded?.branding.logoUrl,
    },
    aiConfig: {
      provider: (a.provider as string) ?? hardcoded?.aiConfig.provider ?? 'google',
      model: (a.model as string) ?? hardcoded?.aiConfig.model ?? 'gemini-2.0-flash',
      temperature: (a.temperature as number) ?? hardcoded?.aiConfig.temperature ?? 0.7,
      maxSteps: (a.max_steps as number) ?? (a.maxSteps as number) ?? hardcoded?.aiConfig.maxSteps ?? 5,
      apiKeyEnv: (a.api_key_env as string) ?? (a.apiKeyEnv as string) ?? hardcoded?.aiConfig.apiKeyEnv ?? '',
    },
    features: {
      liveRates: (f.live_rates as boolean) ?? (f.liveRates as boolean) ?? hardcoded?.features.liveRates ?? false,
      vocativeGreeting: (f.vocative_greeting as boolean) ?? (f.vocativeGreeting as boolean) ?? hardcoded?.features.vocativeGreeting ?? true,
      leadCapture: (f.lead_capture as boolean) ?? (f.leadCapture as boolean) ?? hardcoded?.features.leadCapture ?? true,
      knowledgeBaseRag: (f.knowledge_base_rag as boolean) ?? (f.knowledgeBaseRag as boolean) ?? hardcoded?.features.knowledgeBaseRag ?? false,
      ctaIntensity: ((f.cta_intensity ?? f.ctaIntensity) as 'low' | 'medium' | 'high') ?? hardcoded?.features.ctaIntensity ?? 'medium',
      primaryFlow: ((f.primary_flow ?? f.primaryFlow) as 'mortgage' | 'valuation') ?? hardcoded?.features.primaryFlow ?? 'mortgage',
    },
    gaId: hardcoded?.gaId,
    agentName: row.agent_name ?? hardcoded?.agentName ?? 'Hugo',
  };
}

/**
 * Async verze - čte z Supabase DB tabulky `tenants`.
 * Cachované 5 minut. Fallback na hardcoded config.
 * Použij v runtime kódu (chat route, prompt builder).
 */
export async function getTenantConfigFromDB(tenantId?: string): Promise<TenantConfig> {
  const id = tenantId ?? getDefaultTenantId();

  // Check cache
  const cached = dbConfigCache[id];
  if (cached && Date.now() - cached.timestamp < DB_CACHE_TTL) {
    return cached.config;
  }

  // Try DB
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        const config = mapDbRowToConfig(data as TenantDbRow);
        dbConfigCache[id] = { config, timestamp: Date.now() };
        return config;
      }
    } catch (err) {
      console.warn('[TenantConfig] DB error, using hardcoded fallback:', err);
    }
  }

  // Fallback to hardcoded
  return getTenantConfig(id);
}

/**
 * Async verze getTenantApiKey - čte z DB.
 */
export async function getTenantApiKeyFromDB(tenantId?: string): Promise<string | undefined> {
  const config = await getTenantConfigFromDB(tenantId);
  return process.env[config.aiConfig.apiKeyEnv] ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}
