import { storage } from '@/lib/storage';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await storage.getProject(id);

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    return Response.json(project);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await storage.getProject(id);

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await req.json();

    if (body.name !== undefined) project.name = body.name.trim();
    if (body.description !== undefined) project.description = body.description?.trim() || undefined;
    if (body.addSessionId && !project.sessionIds.includes(body.addSessionId)) {
      project.sessionIds.push(body.addSessionId);
    }
    if (body.profile) {
      project.profile = { ...project.profile, ...body.profile };
    }

    await storage.saveProject(project);
    return Response.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await storage.deleteProject(id);
    return Response.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
