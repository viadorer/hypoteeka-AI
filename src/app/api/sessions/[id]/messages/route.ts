import { storage } from '@/lib/storage';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const authorId = url.searchParams.get('authorId');
    const userId = url.searchParams.get('userId');
    const session = await storage.getSession(id);

    if (!session) {
      return new Response(
        JSON.stringify({ uiMessages: [], profile: {}, phase: 'greeting' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Ownership check: session must belong to the requesting user
    const isOwner =
      (userId && session.userId === userId) ||
      (authorId && session.authorId === authorId && !session.userId) ||
      (!session.userId && !session.authorId); // legacy sessions without ownership
    if (!isOwner) {
      return new Response(
        JSON.stringify({ uiMessages: [], profile: {}, phase: 'greeting' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        uiMessages: session.uiMessages ?? [],
        profile: session.profile,
        phase: session.state.phase,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { uiMessages } = await req.json();

    if (!uiMessages || !Array.isArray(uiMessages)) {
      return Response.json({ error: 'uiMessages required' }, { status: 400 });
    }

    const session = await storage.getSession(id);
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    await storage.saveSession({
      ...session,
      uiMessages,
      updatedAt: new Date().toISOString(),
    });

    return Response.json({ saved: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
