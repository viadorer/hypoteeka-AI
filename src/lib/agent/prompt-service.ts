/**
 * Prompt Service
 * 
 * Načítá prompty z DB (Supabase) nebo fallback na lokální data.
 * Prompty jsou cachované po dobu 5 minut.
 */

import { supabase, isSupabaseConfigured } from '../supabase/client';
import type { ConversationPhase } from './conversation-state';

export interface PromptTemplate {
  slug: string;
  category: string;
  content: string;
  phase: ConversationPhase | null;
  sortOrder: number;
}

export interface CommunicationStyle {
  slug: string;
  name: string;
  tone: string;
  stylePrompt: string;
}

// Cache
let promptCache: { tenantId: string; templates: PromptTemplate[]; style: CommunicationStyle | null; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minut

/**
 * Načte prompt templates z DB pro daného tenanta.
 * Fallback na lokální data pokud Supabase není dostupný.
 */
export async function getPromptTemplates(tenantId: string = 'hypoteeka'): Promise<PromptTemplate[]> {
  // Check cache
  if (promptCache && promptCache.tenantId === tenantId && Date.now() - promptCache.timestamp < CACHE_TTL) {
    return promptCache.templates;
  }

  // Try Supabase
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('slug, category, content, phase, sort_order')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!error && data && data.length > 0) {
        const templates = data.map(row => ({
          slug: row.slug,
          category: row.category,
          content: row.content,
          phase: row.phase as ConversationPhase | null,
          sortOrder: row.sort_order,
        }));
        promptCache = { tenantId, templates, style: promptCache?.style ?? null, timestamp: Date.now() };
        console.log(`[PromptService] Loaded ${templates.length} templates from DB for tenant '${tenantId}'`);
        return templates;
      }
    } catch (err) {
      console.warn('[PromptService] DB error, using fallback:', err);
    }
  }

  // No fallback - DB is required
  console.error('[PromptService] No prompt templates found in DB for tenant:', tenantId);
  return [];
}

/**
 * Načte komunikační styl z DB.
 * Fallback na default styl.
 */
export async function getCommunicationStyle(tenantId: string = 'hypoteeka'): Promise<CommunicationStyle> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('communication_styles')
        .select('slug, name, tone, style_prompt')
        .eq('tenant_id', tenantId)
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      if (!error && data) {
        return {
          slug: data.slug,
          name: data.name,
          tone: data.tone,
          stylePrompt: data.style_prompt,
        };
      }
    } catch (err) {
      console.warn('[PromptService] Style DB error, using fallback:', err);
    }
  }

  return {
    slug: 'professional',
    name: 'Profesionální poradce',
    tone: 'professional',
    stylePrompt: 'Komunikuješ profesionálně ale přátelsky. Vykáš. Jsi věcný a konkrétní. Nepoužíváš emotikony. Odpovídáš krátce, max 2-3 věty. Když máš čísla, ukazuješ je. Nemluvíš obecně.',
  };
}

/**
 * Sestaví base prompt z templates (bez phase-specific instrukcí).
 */
export async function getBasePromptParts(tenantId: string = 'hypoteeka'): Promise<string[]> {
  const templates = await getPromptTemplates(tenantId);
  const style = await getCommunicationStyle(tenantId);

  const baseParts = templates
    .filter(t => t.phase === null && t.category !== 'tool_instruction')
    .map(t => t.content);

  // Přidej komunikační styl
  baseParts.push(`\nSTYL KOMUNIKACE: ${style.stylePrompt}`);

  return baseParts;
}

/**
 * Vrátí phase-specific instrukci.
 */
export async function getPhaseInstruction(phase: ConversationPhase, tenantId: string = 'hypoteeka'): Promise<string> {
  const templates = await getPromptTemplates(tenantId);
  const phaseTemplate = templates.find(t => t.phase === phase && t.category === 'phase_instruction');
  if (phaseTemplate) return phaseTemplate.content;

  console.error('[PromptService] Phase instruction not found in DB:', phase);
  return '';
}

/**
 * Vrátí tool instrukce.
 */
export async function getToolInstruction(tenantId: string = 'hypoteeka'): Promise<string> {
  const templates = await getPromptTemplates(tenantId);
  const toolTemplate = templates.find(t => t.category === 'tool_instruction');
  if (toolTemplate) return toolTemplate.content;

  console.error('[PromptService] Tool instruction not found in DB');
  return '';
}

// ============================================================
// ARCHIV: Lokální fallback prompty byly zakomentovány.
// Vše se čte výhradně z DB (Supabase prompt_templates).
// Pokud DB selže, agent nebude fungovat - to je záměr.
// Původní fallback data viz git historie.
// ============================================================
