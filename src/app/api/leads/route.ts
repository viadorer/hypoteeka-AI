import { storage } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { submitLeadToRealvisor, buildRealvisorPayload } from '@/lib/realvisor';
import { submitLeadToPtf } from '@/lib/integrations/ptf-leads';
import { getDefaultTenantId } from '@/lib/tenant/config';
import { sendBrevoEmail, buildLeadConfirmationEmailHtml } from '@/lib/brevo';
import type { ConsentScope } from '@/lib/storage/types';

const DEFAULT_CONSENT_VERSION = 'handoff-2026-05-v1';
const DEFAULT_CONSENT_SCOPE: ConsentScope = 'handoff_partner';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      context,
      sessionId,
      tenantId,
      consent,
    }: {
      name?: string; email?: string; phone?: string; context?: string;
      sessionId?: string; tenantId?: string;
      consent?: { text: string; version?: string; scope?: ConsentScope; partnerId?: string };
    } = body;

    if (!name || (!email && !phone)) {
      return new Response(
        JSON.stringify({ error: 'Jmeno a alespon email nebo telefon jsou povinne.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!consent?.text) {
      return new Response(
        JSON.stringify({ error: 'Chybi GDPR souhlas se zpracovanim a predanim udaju.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load session to get profile and score
    const session = sessionId ? await storage.getSession(sessionId) : null;
    const tid = tenantId ?? session?.tenantId ?? getDefaultTenantId();
    const profile = session?.profile ?? {};
    const score = session?.state.leadScore ?? 0;
    const temperature = session?.state.leadQualified ? 'qualified' : (score >= 40 ? 'hot' : (score >= 20 ? 'warm' : 'cold'));

    // Capture GDPR consent FIRST (audit trail) — append-only log
    const consentText = consent.text;
    const consentTextHash = createHash('sha256').update(consentText, 'utf-8').digest('hex');
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      undefined;
    const userAgent = req.headers.get('user-agent') ?? undefined;

    const consentId = await storage.saveConsent({
      tenantId: tid,
      sessionId: sessionId ?? undefined,
      scope: consent.scope ?? DEFAULT_CONSENT_SCOPE,
      consentText,
      consentTextVersion: consent.version ?? DEFAULT_CONSENT_VERSION,
      consentTextHash,
      partnerId: consent.partnerId,
      ipAddress,
      userAgent,
      consentedAt: new Date().toISOString(),
    });

    if (consentId) {
      (profile as Record<string, unknown>).consentHandoffId = consentId;
    }

    // Submit to Realvisor API with full profile data
    const rvPayload = buildRealvisorPayload(name, email ?? '', phone ?? '', context ?? '', profile as Record<string, unknown>, {
      sessionId,
      tenantId: tid,
      leadScore: score,
      leadTemperature: temperature,
    });
    const rvResult = await submitLeadToRealvisor(rvPayload);

    // Save lead locally with Realvisor IDs
    const leadId = uuidv4();
    const leadRecord = {
      id: leadId,
      tenantId: tid,
      sessionId: sessionId ?? '',
      name,
      email: email ?? '',
      phone: phone ?? '',
      context: context ?? '',
      profile,
      leadScore: score,
      leadTemperature: temperature,
      realvisorLeadId: rvResult.leadId,
      realvisorContactId: rvResult.contactId,
      createdAt: new Date().toISOString(),
    };
    await storage.saveLead(leadRecord);

    // Předání do PTF reality CRM. Čeká se na dokončení: na serverless se
    // funkce po odeslání odpovědi ukončí a nedokončený zápis by lead
    // v CRM tiše ztratil. Chyba předání ale nesmí shodit odpověď klientovi —
    // lead je v tu chvíli už bezpečně uložený v hypoteeka.leads.
    const ptfResult = await submitLeadToPtf(leadRecord).catch(err => {
      console.error('[PTF] submit error:', err);
      return { success: false as const, error: 'exception' };
    });

    // Update session profile with contact info
    if (session) {
      session.profile.name = name;
      session.profile.email = email;
      session.profile.phone = phone;
      session.state.leadCaptured = true;
      await storage.saveSession(session);
    }

    console.log(`[Lead] Captured: ${name} (${email}, ${phone}), session: ${sessionId}, score: ${score}, realvisor: ${rvResult.success ? rvResult.leadId : 'failed'}, ptf: ${ptfResult.success ? 'ok' : ptfResult.error}`);

    // Send confirmation email (non-blocking, don't fail the lead if email fails)
    if (email) {
      const sessionUrl = sessionId ? `https://hypoteeka.cz/?session=${sessionId}` : undefined;
      sendBrevoEmail({
        to: email,
        toName: name,
        subject: 'Vaše žádost o konzultaci byla přijata',
        htmlContent: buildLeadConfirmationEmailHtml({
          name,
          propertyPrice: (profile as Record<string, unknown>).propertyPrice as number | undefined,
          equity: (profile as Record<string, unknown>).equity as number | undefined,
          monthlyIncome: (profile as Record<string, unknown>).monthlyIncome as number | undefined,
          sessionUrl,
        }),
      }).catch(err => console.error('[Lead] Confirmation email failed:', err));
    }

    return new Response(
      JSON.stringify({
        success: true,
        realvisorLeadId: rvResult.leadId,
        realvisorContactId: rvResult.contactId,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Neznama chyba';
    console.error('[Lead] Error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId') ?? undefined;
    const leads = await storage.getLeads(tenantId);
    return new Response(
      JSON.stringify(leads),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Neznama chyba';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
