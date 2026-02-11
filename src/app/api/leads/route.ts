import { storage } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, context, sessionId, tenantId } = body;

    if (!name || !email || !phone) {
      return new Response(
        JSON.stringify({ error: 'Jmeno, email a telefon jsou povinne.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load session to get profile and score
    const session = sessionId ? await storage.getSession(sessionId) : null;

    await storage.saveLead({
      id: uuidv4(),
      tenantId: tenantId ?? session?.tenantId ?? 'hypoteeka',
      sessionId: sessionId ?? 'unknown',
      name,
      email,
      phone,
      context: context ?? '',
      profile: session?.profile ?? {},
      leadScore: session?.state.leadScore ?? 0,
      leadTemperature: session?.state.leadQualified ? 'qualified' : 'unknown',
      createdAt: new Date().toISOString(),
    });

    // Uložit kontakt i do session profilu
    if (session) {
      session.profile.name = name;
      session.profile.email = email;
      session.profile.phone = phone;
      session.state.leadCaptured = true;
      await storage.saveSession(session);
    }

    // Realvisor embed widget odesílá lead přímo na Realvisor API z klienta
    // Tento endpoint pouze ukládá lead lokálně pro naše záznamy
    console.log(`[Lead] Captured: ${name} (${email}, ${phone}), session: ${sessionId}, score: ${session?.state.leadScore ?? '?'}`);

    return new Response(
      JSON.stringify({ success: true }),
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
