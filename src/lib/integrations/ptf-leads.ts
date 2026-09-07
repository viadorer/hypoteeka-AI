/**
 * PTF reality — předání leadu do sdíleného CRM
 *
 * Lead se posílá přes veřejný endpoint PTF backendu (POST /api/leads,
 * tenant z hlavičky X-Tenant-Slug), NE přímým insertem do tabulky leads.
 * Backend nad vloženým leadem spouští workflow (welcome email, auto-assign
 * makléře, demand) — přímý zápis do DB by je obešel.
 *
 * TENANT: leady se posílají pod tenantem "ptf-reality", ne "hypoteeka".
 * Admin PTF filtruje případy přes `leads.tenant_id = admin_users.tenant_id`
 * (backend/src/modules/admin/leads.routes.ts) a nemá přepínač tenantů —
 * lead pod tenantem "hypoteeka" by v adminu nebyl vidět. Rozlišení dělá
 * `metadata.origin`, na který má admin filtr (stejně jako 'mamtip',
 * 'webnabidky').
 *
 * Env:
 *   PTF_API_URL      – https://ptf-production.up.railway.app
 *   PTF_TENANT_SLUG  – slug tenanta v PTF DB (default "ptf-reality")
 *
 * Bez PTF_API_URL se předání tiše přeskočí (lead zůstává uložený lokálně
 * ve schématu hypoteeka i v Realvisoru).
 */

import type { LeadRecord } from '../storage/types';
import { getPtfPublicDb } from './ptf-db';
import { buildSessionTranscript } from './session-transcript';

const PTF_TIMEOUT_MS = 10_000;

/** PTF case_type pro hypoteční případy. Hodnota v PTF existuje (Flatbook,
 *  migrace 182) a admin pro ni má štítek „Hypotéka" — nic se nezavádí. */
const PTF_CASE_TYPE = 'hypoteka';

/** Strop délky přepisu v aktivitě. `description` je TEXT bez limitu, ale
 *  timeline případu má zůstat čitelná. */
const TRANSCRIPT_MAX_CHARS = 20_000;

export interface PtfLeadResult {
  success: boolean;
  ptfLeadId?: string;
  error?: string;
}

/** "Jan Novák" -> { first: "Jan", last: "Novák" }; jednoslovné jméno se
 *  zduplikuje, PTF endpoint vyžaduje obě pole neprázdná. */
function splitName(name: string): { first: string; last: string } {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { first: 'Neznámý', last: 'Neznámý' };
  const first = tokens[0];
  const last = tokens.slice(1).join(' ') || first;
  return { first, last };
}

/**
 * Doplní čerstvě založený případ v PTF o to, co veřejné API neumí:
 *
 *  1. `case_type = 'hypoteka'` — admin pak případ ukáže se štítkem „Hypotéka"
 *  2. aktivitu typu `note` s přepisem konverzace, zjištěnými údaji
 *     a všemi použitými kalkulačkami včetně výsledků
 *
 * Zapisuje service klíčem přímo do PTF `public` schématu (data, ne struktura) —
 * pro aktivity PTF veřejné API nemá a admin API je za přihlášením.
 */
async function enrichPtfCase(ptfLeadId: string, sessionId: string): Promise<void> {
  const db = getPtfPublicDb();
  if (!db) return;

  // tenant_id je na aktivitě povinný; contact_id doplňuje trigger PTF
  const { data: leadRow, error: readError } = await db
    .from('leads')
    .select('tenant_id, contact_id, property_id')
    .eq('id', ptfLeadId)
    .single();

  if (readError || !leadRow) {
    console.error(`[PTF] Případ ${ptfLeadId} se nepodařilo načíst: ${readError?.message ?? 'nenalezen'}`);
    return;
  }

  const { error: caseTypeError } = await db
    .from('leads')
    .update({ case_type: PTF_CASE_TYPE })
    .eq('id', ptfLeadId);
  if (caseTypeError) {
    console.error(`[PTF] Nastavení case_type selhalo: ${caseTypeError.message}`);
  }

  const transcript = await buildSessionTranscript(sessionId);
  if (!transcript) {
    console.log(`[PTF] Session ${sessionId} nemá přepis — případ ${ptfLeadId} zůstává bez aktivity`);
    return;
  }

  const description = transcript.text.length > TRANSCRIPT_MAX_CHARS
    ? `${transcript.text.slice(0, TRANSCRIPT_MAX_CHARS)}\n\n[…zkráceno, celý přepis je v hypoteeka.sessions, session ${sessionId}]`
    : transcript.text;

  const { error: activityError } = await db.from('activities').insert({
    tenant_id: leadRow.tenant_id,
    lead_id: ptfLeadId,
    contact_id: leadRow.contact_id ?? null,
    property_id: leadRow.property_id ?? null,
    activity_type: 'note',
    subject: `Konverzace s Hugem na hypoteeka.cz (${transcript.data.messageCount} zpráv, ${transcript.data.calculators.length} kalkulaček)`,
    description,
    metadata: {
      origin: 'hypoteeka',
      session_id: sessionId,
      lead_score: transcript.data.leadScore,
      phase: transcript.data.phase,
      persona: transcript.data.persona,
      calculators: transcript.data.calculators,
      profile: transcript.data.profile,
    },
    performed_by: null,
    is_system: true,
    is_ai_generated: true,
  });

  if (activityError) {
    console.error(`[PTF] Zápis přepisu do timeline selhal: ${activityError.message}`);
  } else {
    console.log(`[PTF] Přepis připojen k případu ${ptfLeadId} (${transcript.data.calculators.length} kalkulaček)`);
  }
}

export async function submitLeadToPtf(lead: LeadRecord): Promise<PtfLeadResult> {
  const apiUrl = process.env.PTF_API_URL;
  const tenantSlug = process.env.PTF_TENANT_SLUG ?? 'ptf-reality';

  if (!apiUrl) {
    console.log('[PTF] PTF_API_URL není nastaveno — předání leadu přeskočeno');
    return { success: false, error: 'not-configured' };
  }

  // Záměna PTF_API_URL a PTF_TENANT_SLUG se jinak projeví až nesrozumitelným
  // „Failed to parse URL" uprostřed předání leadu.
  if (!/^https?:\/\//i.test(apiUrl)) {
    console.error(`[PTF] PTF_API_URL není adresa ('${apiUrl}') — čekám https://…, ne tenant slug`);
    return { success: false, error: 'invalid-api-url' };
  }

  // PTF endpoint vyžaduje email; lead jen s telefonem předat nejde.
  if (!lead.email) {
    console.warn(`[PTF] Lead ${lead.id} nemá email — PTF ho vyžaduje, předání přeskočeno (lead zůstává lokálně a v Realvisoru)`);
    return { success: false, error: 'missing-email' };
  }

  const { first, last } = splitName(lead.name);
  const profile = (lead.profile ?? {}) as Record<string, unknown>;

  const payload = {
    first_name: first,
    last_name: last,
    email: lead.email,
    phone: lead.phone || undefined,
    message: lead.context || 'Lead z hypoteeka.cz (AI asistent)',
    // PTF enum lead_source je uzavřený; neznámou hodnotu normalizuje na
    // 'web_formular' a slug si odloží do metadata.form (viz lead-source.ts).
    source: 'hypoteeka',
    gdpr_consent: true, // souhlas zachycen v hypoteeka.consent_log (scope handoff_partner)
    marketing_consent: false,
    metadata: {
      origin: 'hypoteeka',
      hypoteeka_lead_id: lead.id,
      session_id: lead.sessionId || undefined,
      lead_score: lead.leadScore,
      lead_temperature: lead.leadTemperature,
      consent_id: (profile.consentHandoffId as string) ?? undefined,
      realvisor_lead_id: lead.realvisorLeadId,
      realvisor_contact_id: lead.realvisorContactId,
      // hypoteční kontext pro makléře
      property_price: profile.propertyPrice,
      equity: profile.equity,
      monthly_income: profile.monthlyIncome,
      location: profile.location,
      purpose: profile.purpose,
    },
  };

  try {
    const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Slug': tenantSlug,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(PTF_TIMEOUT_MS),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[PTF] Předání leadu selhalo: HTTP ${res.status} ${text.slice(0, 200)}`);
      return { success: false, error: `http-${res.status}` };
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string; deduped?: boolean };
    console.log(`[PTF] Lead předán do PTF CRM: ${lead.name} (${lead.email}) → ${data.id ?? 'ok'}`);

    // Doplnění případu (typ + přepis konverzace). Selhání nesmí shodit
    // předání leadu — lead v CRM už je, doplňky jsou navíc.
    if (data.id && !data.deduped) {
      await enrichPtfCase(data.id, lead.sessionId).catch(err =>
        console.error('[PTF] Doplnění případu selhalo:', err instanceof Error ? err.message : err)
      );
    }

    return { success: true, ptfLeadId: data.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[PTF] Předání leadu selhalo: ${msg}`);
    return { success: false, error: msg };
  }
}
