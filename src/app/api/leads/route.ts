import { storage } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';
import { submitLeadToRealvisor, buildRealvisorPayload } from '@/lib/realvisor';
import { getDefaultTenantId } from '@/lib/tenant/config';
import { sendBrevoEmail, buildLeadConfirmationEmailHtml } from '@/lib/brevo';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, context, sessionId, tenantId } = body;

    if (!name || (!email && !phone)) {
      return new Response(
        JSON.stringify({ error: 'Jmeno a alespon email nebo telefon jsou povinne.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load session to get profile and score
    const session = sessionId ? await storage.getSession(sessionId) : null;
    const tid = tenantId ?? session?.tenantId ?? getDefaultTenantId();
    const profile = session?.profile ?? {};
    const score = session?.state.leadScore ?? 0;
    const temperature = session?.state.leadQualified ? 'qualified' : (score >= 40 ? 'hot' : (score >= 20 ? 'warm' : 'cold'));

    // Submit to Realvisor API with full profile data
    const rvPayload = buildRealvisorPayload(name, email, phone, context ?? '', profile as Record<string, unknown>, {
      sessionId,
      tenantId: tid,
      leadScore: score,
      leadTemperature: temperature,
    });
    const rvResult = await submitLeadToRealvisor(rvPayload);

    // Save lead locally with Realvisor IDs
    const leadId = uuidv4();
    await storage.saveLead({
      id: leadId,
      tenantId: tid,
      sessionId: sessionId ?? '',
      name,
      email,
      phone,
      context: context ?? '',
      profile,
      leadScore: score,
      leadTemperature: temperature,
      realvisorLeadId: rvResult.leadId,
      realvisorContactId: rvResult.contactId,
      createdAt: new Date().toISOString(),
    });

    // Update session profile with contact info
    if (session) {
      session.profile.name = name;
      session.profile.email = email;
      session.profile.phone = phone;
      session.state.leadCaptured = true;
      await storage.saveSession(session);
    }

    console.log(`[Lead] Captured: ${name} (${email}, ${phone}), session: ${sessionId}, score: ${score}, realvisor: ${rvResult.success ? rvResult.leadId : 'failed'}`);

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
