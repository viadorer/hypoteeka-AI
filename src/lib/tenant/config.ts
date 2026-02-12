/**
 * Tenant Configuration
 * 
 * Centrální místo pro čtení konfigurace tenantu.
 * Teď: hardcoded konfigurace (dev mode).
 * Později: čtení z Supabase tabulky `tenants`.
 */

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
  };
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
    },
  },
  odhad: {
    id: 'odhad',
    name: 'Odhad.online',
    domain: 'odhad.online',
    branding: {
      primaryColor: '#2196F3',
      accentColor: '#FF9800',
      title: 'Odhad.online',
      description: 'Odhad nemovitosti',
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
    },
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
