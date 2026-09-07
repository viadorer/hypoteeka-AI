import { createSupabaseServer } from '@/lib/supabase/server';
import { supabase as serviceClient } from '@/lib/supabase/client';

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

    // Založení řádku v hypoteeka.profiles. Dřív to dělal DB trigger na
    // auth.users — ten ve sdílené PTF DB být nesmí (poustěl by se pro
    // signupy všech tenantů), viz db/ptf-setup/02_hypoteeka_schema.sql.
    if (data.user && serviceClient) {
      const { error: profileError } = await serviceClient
        .from('profiles')
        .upsert(
          { id: data.user.id, display_name: name ?? null, email: data.user.email },
          { onConflict: 'id', ignoreDuplicates: true }
        );
      if (profileError) {
        console.error('[Signup] Profile create error:', profileError.message);
      }
    }

    return Response.json({
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      needsConfirmation: !data.session,
    });
  } catch {
    return Response.json({ error: 'Chyba serveru.' }, { status: 500 });
  }
}
