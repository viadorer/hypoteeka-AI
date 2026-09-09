import { createSupabaseServer } from '@/lib/supabase/server';
import { ensureProfile } from '@/lib/auth/ensure-profile';

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return Response.json(
        { error: 'E-mail a heslo jsou povinné.' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    // Profil v hypoteeka.profiles — dřív ho zakládal DB trigger na auth.users,
    // který ve sdílené databázi PTF být nesmí (viz ensure-profile.ts).
    await ensureProfile(data.user);

    return Response.json({
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      needsConfirmation: !data.session,
    });
  } catch {
    return Response.json({ error: 'Chyba serveru.' }, { status: 500 });
  }
}
