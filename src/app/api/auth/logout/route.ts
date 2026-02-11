import { createSupabaseServer } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Chyba serveru.' }, { status: 500 });
  }
}
