import { createSupabaseServer } from '@/lib/supabase/server';
import { storage } from '@/lib/storage';

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Nepřihlášen.' }, { status: 401 });
    }

    const { authorId, tenantId } = await req.json();

    if (!authorId || typeof authorId !== 'string') {
      return Response.json({ error: 'authorId je povinný.' }, { status: 400 });
    }

    const claimed = await storage.claimAnonymousSessions(user.id, authorId, tenantId);
    console.log(`[Sessions] Claimed ${claimed} anonymous sessions for user ${user.id} (authorId: ${authorId})`);

    return Response.json({ claimed });
  } catch (error) {
    console.error('[Sessions Claim] Error:', error);
    return Response.json({ error: 'Chyba serveru.' }, { status: 500 });
  }
}
