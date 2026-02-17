import { createSupabaseServer } from '@/lib/supabase/server';
import { storage } from '@/lib/storage';

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ profile: null }, { status: 200 });
    }

    const profile = await storage.getUserProfile(user.id);
    return Response.json({ profile });
  } catch (error) {
    console.error('[Profile API] GET error:', error);
    return Response.json({ error: 'Chyba serveru.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Nepřihlášen.' }, { status: 401 });
    }

    const body = await req.json();

    // Whitelist allowed fields
    const allowed = [
      'displayName', 'preferredName', 'email', 'phone',
      'city', 'age', 'monthlyIncome', 'partnerIncome', 'purpose', 'notes',
    ];
    const update: Record<string, unknown> = { id: user.id };
    for (const key of allowed) {
      if (body[key] !== undefined) {
        update[key] = body[key];
      }
    }

    await storage.saveUserProfile(update as { id: string });
    const profile = await storage.getUserProfile(user.id);
    return Response.json({ profile });
  } catch (error) {
    console.error('[Profile API] PUT error:', error);
    return Response.json({ error: 'Chyba serveru.' }, { status: 500 });
  }
}
