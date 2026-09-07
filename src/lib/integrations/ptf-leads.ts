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

const PTF_TIMEOUT_MS = 10_000;

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

export async function submitLeadToPtf(lead: LeadRecord): Promise<PtfLeadResult> {
  const apiUrl = process.env.PTF_API_URL;
  const tenantSlug = process.env.PTF_TENANT_SLUG ?? 'ptf-reality';

  if (!apiUrl) {
    console.log('[PTF] PTF_API_URL není nastaveno — předání leadu přeskočeno');
    return { success: false, error: 'not-configured' };
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

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    console.log(`[PTF] Lead předán do PTF CRM: ${lead.name} (${lead.email}) → ${data.id ?? 'ok'}`);
    return { success: true, ptfLeadId: data.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[PTF] Předání leadu selhalo: ${msg}`);
    return { success: false, error: msg };
  }
}
