/**
 * Realvisor API - server-side lead submission
 * 
 * Sends lead with contact info + full client profile from chat.
 * Returns leadId and contactId for future communication pairing.
 */

interface RealvisorLeadPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  data: Record<string, unknown>;
}

interface RealvisorResponse {
  success: boolean;
  leadId?: string;
  contactId?: string;
}

export async function submitLeadToRealvisor(payload: RealvisorLeadPayload): Promise<RealvisorResponse> {
  const apiKey = process.env.REALVISOR_API_KEY;
  const apiUrl = process.env.REALVISOR_API_URL;

  if (!apiKey || !apiUrl) {
    console.warn('[Realvisor] Missing REALVISOR_API_KEY or REALVISOR_API_URL');
    return { success: false };
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[Realvisor] API error ${res.status}: ${text}`);
      return { success: false };
    }

    const data = await res.json();
    console.log(`[Realvisor] Lead submitted: leadId=${data.leadId}, contactId=${data.contactId}`);
    return {
      success: true,
      leadId: data.leadId,
      contactId: data.contactId,
    };
  } catch (err) {
    console.error('[Realvisor] Network error:', err instanceof Error ? err.message : err);
    return { success: false };
  }
}

/**
 * Build Realvisor payload from lead data + client profile
 */
export function buildRealvisorPayload(
  name: string,
  email: string,
  phone: string,
  context: string,
  profile: Record<string, unknown>,
  meta: {
    sessionId?: string;
    tenantId?: string;
    leadScore?: number;
    leadTemperature?: string;
  } = {}
): RealvisorLeadPayload {
  // Split name into first/last
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] ?? '';
  const lastName = parts.slice(1).join(' ') || '';

  // Build message with context
  const messageParts: string[] = [];
  if (context) messageParts.push(context);
  if (profile.propertyPrice) messageParts.push(`Nemovitost: ${fmt(profile.propertyPrice as number)} Kc`);
  if (profile.equity) messageParts.push(`Vlastni zdroje: ${fmt(profile.equity as number)} Kc`);
  if (profile.monthlyIncome) messageParts.push(`Prijem: ${fmt(profile.monthlyIncome as number)} Kc/mes`);
  if (meta.leadScore) messageParts.push(`Lead score: ${meta.leadScore}/100 (${meta.leadTemperature ?? 'unknown'})`);

  return {
    firstName,
    lastName,
    email,
    phone,
    message: messageParts.join(' | '),
    data: {
      source: 'hypoteeka-ai',
      sessionId: meta.sessionId,
      tenantId: meta.tenantId,
      leadScore: meta.leadScore,
      leadTemperature: meta.leadTemperature,
      // Full client profile
      propertyPrice: profile.propertyPrice,
      propertyType: profile.propertyType,
      location: profile.location,
      purpose: profile.purpose,
      equity: profile.equity,
      monthlyIncome: profile.monthlyIncome,
      partnerIncome: profile.partnerIncome,
      totalMonthlyIncome: profile.totalMonthlyIncome,
      employmentType: profile.employmentType,
      age: profile.age,
      isYoung: profile.isYoung,
      currentRent: profile.currentRent,
      existingLoans: profile.existingLoans,
      existingMortgageBalance: profile.existingMortgageBalance,
      existingMortgageRate: profile.existingMortgageRate,
      existingMortgageYears: profile.existingMortgageYears,
      expectedRentalIncome: profile.expectedRentalIncome,
      preferredRate: profile.preferredRate,
      preferredYears: profile.preferredYears,
      maxMonthlyPayment: profile.maxMonthlyPayment,
    },
  };
}

function fmt(n: number): string {
  return n.toLocaleString('cs-CZ');
}
