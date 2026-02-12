/**
 * Prompt Service
 * 
 * Načítá prompty z DB (Supabase) nebo fallback na lokální data.
 * Prompty jsou cachované po dobu 5 minut.
 */

import { supabase, isSupabaseConfigured } from '../supabase/client';
import type { ConversationPhase } from './conversation-state';
import { getDefaultTenantId } from '../tenant/config';

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
export async function getPromptTemplates(tenantId: string = getDefaultTenantId()): Promise<PromptTemplate[]> {
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
export async function getCommunicationStyle(tenantId: string = getDefaultTenantId()): Promise<CommunicationStyle> {
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
export async function getBasePromptParts(tenantId: string = getDefaultTenantId()): Promise<string[]> {
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
export async function getPhaseInstruction(phase: ConversationPhase, tenantId: string = getDefaultTenantId()): Promise<string> {
  const templates = await getPromptTemplates(tenantId);
  const phaseTemplate = templates.find(t => t.phase === phase && t.category === 'phase_instruction');
  if (phaseTemplate) return phaseTemplate.content;

  console.error('[PromptService] Phase instruction not found in DB:', phase);
  return '';
}

/**
 * Vrátí tool instrukce.
 */
export async function getToolInstruction(tenantId: string = getDefaultTenantId()): Promise<string> {
  const templates = await getPromptTemplates(tenantId);
  const toolTemplate = templates.find(t => t.category === 'tool_instruction');
  if (toolTemplate) return toolTemplate.content;

  console.error('[PromptService] Tool instruction not found in DB');
  return '';
}

// ============================================================
// KNOWLEDGE BASE - znalostní báze per tenant
// ============================================================

export interface KnowledgeBaseEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
}

let kbCache: { tenantId: string; entries: KnowledgeBaseEntry[]; timestamp: number } | null = null;
const KB_CACHE_TTL = 5 * 60 * 1000; // 5 minut

/**
 * Načte všechny aktivní knowledge base záznamy pro tenanta (cachované).
 */
async function loadKnowledgeBase(tenantId: string): Promise<KnowledgeBaseEntry[]> {
  if (kbCache && kbCache.tenantId === tenantId && Date.now() - kbCache.timestamp < KB_CACHE_TTL) {
    return kbCache.entries;
  }

  if (!isSupabaseConfigured() || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('id, category, title, content, keywords')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data) return [];

    const entries: KnowledgeBaseEntry[] = data.map(row => ({
      id: row.id,
      category: row.category,
      title: row.title,
      content: row.content,
      keywords: row.keywords ?? [],
    }));

    kbCache = { tenantId, entries, timestamp: Date.now() };
    console.log(`[PromptService] Loaded ${entries.length} knowledge base entries for tenant '${tenantId}'`);
    return entries;
  } catch (err) {
    console.warn('[PromptService] Knowledge base load error:', err);
    return [];
  }
}

/**
 * Vrátí relevantní knowledge base záznamy na základě kontextu konverzace.
 * Matching: keyword overlap s uživatelským dotazem + profil klienta.
 * Vrací max 5 nejrelevantnějších záznamů.
 */
export async function getRelevantKnowledge(
  tenantId: string,
  context: {
    lastUserMessage?: string;
    phase?: string;
    profileFields?: string[];
    widgetsShown?: string[];
  }
): Promise<KnowledgeBaseEntry[]> {
  const entries = await loadKnowledgeBase(tenantId);
  if (entries.length === 0) return [];

  // Build search terms from context
  const searchTerms: string[] = [];

  // From user message
  if (context.lastUserMessage) {
    const words = context.lastUserMessage
      .toLowerCase()
      .replace(/[.,!?]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);
    searchTerms.push(...words);
  }

  // From profile fields (e.g. if user has propertyPrice, add related terms)
  if (context.profileFields) {
    for (const field of context.profileFields) {
      switch (field) {
        case 'propertyPrice': case 'equity': searchTerms.push('ltv', 'vlastní', 'zdroje'); break;
        case 'monthlyIncome': case 'partnerIncome': searchTerms.push('příjem', 'dsti', 'dti', 'bonita'); break;
        case 'age': searchTerms.push('mladí', 'věk', 'výjimka'); break;
        case 'existingMortgageRate': searchTerms.push('refinancování', 'sazba', 'fixace'); break;
      }
    }
  }

  // From phase
  if (context.phase === 'qualification' || context.phase === 'conversion') {
    searchTerms.push('proces', 'schválení', 'dokumenty');
  }

  if (searchTerms.length === 0) return [];

  // Score each entry by keyword overlap
  const scored = entries.map(entry => {
    const entryKeywords = entry.keywords.map(k => k.toLowerCase());
    const titleWords = entry.title.toLowerCase().split(/\s+/);
    const allEntryTerms = [...entryKeywords, ...titleWords];

    let score = 0;
    for (const term of searchTerms) {
      for (const ek of allEntryTerms) {
        if (ek.includes(term) || term.includes(ek)) {
          score++;
        }
      }
    }
    return { entry, score };
  });

  // Return top matches (score > 0), max 5
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.entry);
}

// ============================================================
// ARCHIV: Lokální fallback prompty byly zakomentovány.
// Vše se čte výhradně z DB (Supabase prompt_templates).
// Pokud DB selže, agent nebude fungovat - to je záměr.
// Původní fallback data viz git historie.
// ============================================================
