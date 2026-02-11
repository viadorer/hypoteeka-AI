import { storage } from '@/lib/storage';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId') ?? undefined;
    const sessions = await storage.listSessions(tenantId);
    const summaries = sessions.map(s => ({
      id: s.id,
      tenantId: s.tenantId ?? 'hypoteeka',
      profile: {
        propertyPrice: s.profile.propertyPrice,
        propertyType: s.profile.propertyType,
        location: s.profile.location,
        purpose: s.profile.purpose,
        equity: s.profile.equity,
        monthlyIncome: s.profile.monthlyIncome,
        partnerIncome: s.profile.partnerIncome,
        age: s.profile.age,
        currentRent: s.profile.currentRent,
        name: s.profile.name,
        email: s.profile.email,
        phone: s.profile.phone,
      },
      state: {
        phase: s.state.phase,
        leadScore: s.state.leadScore,
        leadQualified: s.state.leadQualified,
        leadCaptured: s.state.leadCaptured,
        turnCount: s.state.turnCount,
        widgetsShown: s.state.widgetsShown,
        dataCollected: s.state.dataCollected,
      },
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
    return new Response(JSON.stringify(summaries), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Neznámá chyba';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
