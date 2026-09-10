/**
 * Broker Pool — routing leadu na konkrétního brokera (zjednodušená verze).
 *
 * Matching:
 *   1. Vyber aktivní brokery, kteří mají odpovídající vertical tag.
 *   2. Round-robin: vyber toho, kdo nejdéle nedostal lead (NULLS FIRST pro nové).
 *   3. Pokud nikdo nemá tag pro danou vertikálu → fallback na jakéhokoliv aktivního.
 *   4. Pokud Supabase down nebo žádný aktivní → hardcoded David fallback.
 *
 * Co tato verze NEDĚLÁ (úmyslně):
 *   - working hours / OOO
 *   - capacity counters
 *   - expertise score
 *   - geo prefix
 *   Přidáme až s reálnou potřebou (>5 brokerů, conversion data).
 */

import { supabase, isSupabaseConfigured } from './supabase/client';
import type { ClientProfile } from './agent/client-profile';
import { classifyVerticalForRouting } from './agent/lead-scoring';

export type BrokerVertical = 'bydleni' | 'investice' | 'refi' | 'prodej' | 'unknown';

export interface BrokerHandoffPayload {
  broker: {
    id: string;
    displayName: string;       // "David"
    fullName: string;          // "David Choc"
    email: string;
    phone: string;
    whatsappPhone: string | null;
    photoUrl: string | null;
    roleLabel: string;         // "Hypoteční specialista · Quadrum"
    shortDescription: string | null;
    specializations: string[]; // ['Hypotéky', 'Investice', ...]
    company: string;
    vazanyZastupceOf: string | null;
    legalDisclosure: string | null;
  };
  vertical: BrokerVertical;
  fallback: boolean;
  assignmentId: string;
}

export type MatchFailure = {
  ok: false;
  reason: 'no_broker_available' | 'supabase_unavailable';
  detail: string;
};

export type MatchSuccess = { ok: true; payload: BrokerHandoffPayload };
export type MatchResult = MatchSuccess | MatchFailure;

interface BrokerRow {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  phone: string;
  whatsapp_phone: string | null;
  photo_url: string | null;
  role_label: string;
  short_description: string | null;
  specializations: string[];
  vertical_tags: string[];
  company: string;
  vazany_zastupce_of: string | null;
  legal_disclosure: string | null;
  is_active: boolean;
  accepts_leads: boolean;
}

/**
 * Mapuje routing vertikálu z lead-scoring na zjednodušenou trojici
 * používanou v poolu (bydleni / investice / refi).
 */
function toBrokerVertical(profile: ClientProfile): BrokerVertical {
  const routing = classifyVerticalForRouting(profile);
  switch (routing) {
    case 'refi':
      return 'refi';
    case 'investice':
      return 'investice';
    case 'bydleni':
      return 'bydleni';
    case 'prodej':
      return 'prodej';
    default:
      return 'unknown';
  }
}

/** Slug majitele byznysu — prodejní leady jdou vždy jemu, mimo round-robin. */
const OWNER_BROKER_SLUG = 'david-choc';

function toBrokerPayload(b: BrokerRow): BrokerHandoffPayload['broker'] {
  return {
    id: b.id,
    displayName: b.display_name,
    fullName: `${b.first_name} ${b.last_name}`,
    email: b.email,
    phone: b.phone,
    whatsappPhone: b.whatsapp_phone,
    photoUrl: b.photo_url,
    roleLabel: b.role_label,
    shortDescription: b.short_description,
    specializations: b.specializations,
    company: b.company,
    vazanyZastupceOf: b.vazany_zastupce_of,
    legalDisclosure: b.legal_disclosure,
  };
}

/**
 * Hlavní matching funkce. Vrací kandidáta (nepřiřazuje).
 * Skutečné přiřazení v assignLeadToBroker().
 */
export async function matchBroker(
  profile: ClientProfile,
  tenantId: string = 'hypoteeka',
): Promise<MatchResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, reason: 'supabase_unavailable', detail: 'Supabase not configured' };
  }

  const vertical = toBrokerVertical(profile);

  // Pull aktivní brokery
  const { data: brokerRows, error: brokerErr } = await supabase
    .from('brokers')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .eq('accepts_leads', true);

  if (brokerErr || !brokerRows || brokerRows.length === 0) {
    return { ok: false, reason: 'no_broker_available', detail: brokerErr?.message ?? 'No active brokers' };
  }

  const brokers = brokerRows as BrokerRow[];

  // PRODEJ: nejcennější vertikála — jde vždy přímo na majitele (David),
  // ne round-robin. Fallback: broker s tagem 'prodej', pak kdokoliv aktivní.
  if (vertical === 'prodej') {
    const owner = brokers.find((b) => b.slug === OWNER_BROKER_SLUG)
      ?? brokers.find((b) => b.vertical_tags.includes('prodej'))
      ?? brokers[0];
    return {
      ok: true,
      payload: {
        broker: toBrokerPayload(owner),
        vertical,
        fallback: owner.slug !== OWNER_BROKER_SLUG,
        assignmentId: '',
      },
    };
  }

  // Filtruj na ty s relevantním vertical tagem (pokud vertical = 'unknown', vrať všechny)
  const matchingByVertical =
    vertical === 'unknown'
      ? brokers
      : brokers.filter((b) => b.vertical_tags.includes(vertical));

  const candidates = matchingByVertical.length > 0 ? matchingByVertical : brokers;
  const isFallback = matchingByVertical.length === 0;

  // Round-robin: kdo nejdéle nedostal lead
  const brokerIds = candidates.map((b) => b.id);
  const { data: lastAssignments } = await supabase
    .from('broker_assignments')
    .select('broker_id, created_at')
    .in('broker_id', brokerIds)
    .order('created_at', { ascending: false });

  const latestByBroker = new Map<string, string>();
  for (const a of (lastAssignments ?? []) as Array<{ broker_id: string; created_at: string }>) {
    if (!latestByBroker.has(a.broker_id)) latestByBroker.set(a.broker_id, a.created_at);
  }

  // NULLS FIRST: broker bez historie dostane lead jako první (férové pro nové)
  candidates.sort((a, b) => {
    const ta = latestByBroker.get(a.id);
    const tb = latestByBroker.get(b.id);
    if (!ta && !tb) return 0;
    if (!ta) return -1;
    if (!tb) return 1;
    return ta.localeCompare(tb); // starší (menší) → dřív
  });

  const winner = candidates[0];

  return {
    ok: true,
    payload: {
      broker: toBrokerPayload(winner),
      vertical,
      fallback: isFallback,
      assignmentId: '',  // doplní assignLeadToBroker()
    },
  };
}

/**
 * Vytvoří broker_assignments řádek. Volat AŽ po klientově souhlasu.
 */
export async function assignLeadToBroker(params: {
  match: BrokerHandoffPayload;
  leadId?: string;
  sessionId?: string;
  tenantId?: string;
}): Promise<{ ok: boolean; assignmentId?: string; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }

  const { data, error } = await supabase
    .from('broker_assignments')
    .insert({
      broker_id: params.match.broker.id,
      lead_id: params.leadId ?? null,
      session_id: params.sessionId ?? null,
      tenant_id: params.tenantId ?? 'hypoteeka',
      vertical: params.match.vertical === 'unknown' ? null : params.match.vertical,
      status: 'open',
    })
    .select('id')
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Insert failed' };
  }

  return { ok: true, assignmentId: data.id };
}

/**
 * Označí assignment jako notifikovaný (broker dostal email).
 */
export async function markAssignmentNotified(assignmentId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase || !assignmentId) return;
  await supabase
    .from('broker_assignments')
    .update({ notified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', assignmentId);
}

/**
 * Fallback brokera, pokud Supabase je down nebo žádný aktivní broker.
 * Aktuálně = David Choc, hardcoded. Až bude pool > 1, používá se reálně
 * jen jako safety net.
 */
export function getDefaultBrokerFallback(): BrokerHandoffPayload {
  return {
    broker: {
      id: 'fallback-david',
      displayName: 'David',
      fullName: 'David Choc',
      email: 'david.choc@quadrum.cz',
      phone: '+420774052232',
      whatsappPhone: '+420774052232',
      photoUrl: null,
      roleLabel: 'Hypoteční specialista · Quadrum',
      shortDescription:
        'Vázaný zástupce SAB servis pro spotřebitelské úvěry. Porovnám nabídky 8+ bank a vyjednám podmínky, které běžně nedostanete. Konzultace zdarma.',
      specializations: ['Hypotéky', 'Refinancování', 'Investice', 'OSVČ', 'Mladí do 36'],
      company: 'Quadrum',
      vazanyZastupceOf: 'SAB servis s.r.o.',
      legalDisclosure: null,
    },
    vertical: 'unknown',
    fallback: true,
    assignmentId: '',
  };
}

/**
 * Hromadné načtení brokerů pro UI (vizitka v handoffu).
 * Pokud broker_ids prázdné, vrátí všechny aktivní pro daný tenant.
 */
export async function loadSpecialistsForWidget(
  brokerIds?: string[],
  tenantId: string = 'hypoteeka',
): Promise<BrokerHandoffPayload['broker'][]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [getDefaultBrokerFallback().broker];
  }

  let q = supabase
    .from('brokers')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  if (brokerIds && brokerIds.length > 0) {
    q = q.in('id', brokerIds);
  }

  const { data, error } = await q;
  if (error || !data || data.length === 0) {
    return [getDefaultBrokerFallback().broker];
  }

  return (data as BrokerRow[]).map((b) => ({
    id: b.id,
    displayName: b.display_name,
    fullName: `${b.first_name} ${b.last_name}`,
    email: b.email,
    phone: b.phone,
    whatsappPhone: b.whatsapp_phone,
    photoUrl: b.photo_url,
    roleLabel: b.role_label,
    shortDescription: b.short_description,
    specializations: b.specializations,
    company: b.company,
    vazanyZastupceOf: b.vazany_zastupce_of,
    legalDisclosure: b.legal_disclosure,
  }));
}
