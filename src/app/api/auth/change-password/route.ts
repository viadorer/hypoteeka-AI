import { createSupabaseServer } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    if (!password || password.length < 6) {
      return Response.json(
        { error: 'Heslo musí mít alespoň 6 znaků.' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Chyba serveru.' }, { status: 500 });
  }
}
