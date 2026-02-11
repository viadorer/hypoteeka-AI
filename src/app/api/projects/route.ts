import { storage } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId') ?? undefined;
    const projects = await storage.listProjects(tenantId);

    return Response.json(
      projects.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        sessionCount: p.sessionIds.length,
        profile: p.profile,
        updatedAt: p.updatedAt,
        createdAt: p.createdAt,
      }))
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, tenantId, sessionId } = body;

    if (!name?.trim()) {
      return Response.json({ error: 'Název projektu je povinný' }, { status: 400 });
    }

    const projectId = uuidv4();
    const now = new Date().toISOString();

    // If sessionId provided, load profile from that session
    let profile = {};
    const sessionIds: string[] = [];
    if (sessionId) {
      const session = await storage.getSession(sessionId);
      if (session) {
        profile = session.profile;
        sessionIds.push(sessionId);
      }
    }

    await storage.saveProject({
      id: projectId,
      tenantId: tenantId ?? 'hypoteeka',
      name: name.trim(),
      description: description?.trim() || undefined,
      profile,
      sessionIds,
      createdAt: now,
      updatedAt: now,
    });

    return Response.json({ id: projectId, name: name.trim() }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
