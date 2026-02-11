/**
 * Realvisor API integrace
 * 
 * Odesílá leady z Hypoteeka AI do Realvisor CRM.
 * 
 * KONFIGURACE:
 * Nastavte v .env.local:
 *   REALVISOR_API_URL=https://api.realvisor.cz/v1/leads  (nebo skutečný endpoint)
 *   REALVISOR_API_KEY=váš_api_klíč
 * 
 * Pokud env proměnné nejsou nastaveny, lead se pouze zaloguje (dev mode).
 */

interface RealvisorLead {
  name: string;
  email: string;
  phone: string;
  source: string;
  note: string;
  tags: string[];
  customFields?: Record<string, unknown>;
}

interface RealvisorResponse {
  success: boolean;
  id?: string;
  error?: string;
}

const API_URL = process.env.REALVISOR_API_URL ?? 'https://api-production-88cf.up.railway.app/api/v1';
const API_KEY = process.env.REALVISOR_API_KEY;
const FORM_CODE = process.env.REALVISOR_FORM_CODE ?? 'kontaktni-formu-65695';

/**
 * Odešle lead do Realvisor CRM
 */
export async function sendLeadToRealvisor(data: {
  name: string;
  email: string;
  phone: string;
  propertyPrice?: number;
  equity?: number;
  monthlyIncome?: number;
  age?: number;
  leadScore: number;
  leadTemperature: string;
  sessionId: string;
  context?: string;
}): Promise<RealvisorResponse> {
  const lead: RealvisorLead = {
    name: data.name,
    email: data.email,
    phone: data.phone,
    source: 'hypoteeka-ai',
    note: buildNote(data),
    tags: buildTags(data),
    customFields: {
      propertyPrice: data.propertyPrice,
      equity: data.equity,
      monthlyIncome: data.monthlyIncome,
      age: data.age,
      leadScore: data.leadScore,
      leadTemperature: data.leadTemperature,
      sessionId: data.sessionId,
    },
  };

  // Odeslání do Realvisor API
  try {
    const endpoint = `${API_URL}/forms/${FORM_CODE}/submissions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Source': 'hypoteeka-ai',
    };
    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    console.log(`[Realvisor] Sending lead to ${endpoint}`);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      console.error(`[Realvisor] API error ${res.status}: ${errorText}`);
      return { success: false, error: `HTTP ${res.status}: ${errorText}` };
    }

    const result = await res.json();
    console.log(`[Realvisor] Lead sent: ${data.name} (${data.email}), ID: ${result.id ?? 'ok'}`);
    return { success: true, id: result.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Realvisor] Send failed: ${message}`);
    return { success: false, error: message };
  }
}

function buildNote(data: {
  propertyPrice?: number;
  equity?: number;
  monthlyIncome?: number;
  leadScore: number;
  leadTemperature: string;
  context?: string;
}): string {
  const parts: string[] = ['Lead z Hypoteeka AI'];
  if (data.propertyPrice) parts.push(`Cena nemovitosti: ${fmt(data.propertyPrice)} Kč`);
  if (data.equity) parts.push(`Vlastní zdroje: ${fmt(data.equity)} Kč`);
  if (data.monthlyIncome) parts.push(`Měsíční příjem: ${fmt(data.monthlyIncome)} Kč`);
  parts.push(`Lead score: ${data.leadScore}/100 (${data.leadTemperature})`);
  if (data.context) parts.push(`Kontext: ${data.context}`);
  return parts.join('\n');
}

function buildTags(data: { leadTemperature: string; propertyPrice?: number }): string[] {
  const tags = ['hypoteeka-ai'];
  tags.push(data.leadTemperature);
  if (data.propertyPrice) {
    if (data.propertyPrice >= 10_000_000) tags.push('premium');
    else if (data.propertyPrice >= 5_000_000) tags.push('standard');
    else tags.push('starter');
  }
  return tags;
}

function fmt(n: number): string {
  return n.toLocaleString('cs-CZ');
}
