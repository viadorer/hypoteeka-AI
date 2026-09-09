/**
 * Založení řádku v hypoteeka.profiles pro přihlášeného uživatele.
 *
 * PROČ TO MUSÍ BÝT V KÓDU: dřív to dělal DB trigger na auth.users. Ten ale
 * ve sdílené databázi PTF být nesmí — spouštěl by se i pro registrace
 * ostatních tenantů (viz db/ptf-setup/README.md).
 *
 * PROČ NA VŠECH VSTUPECH, NE JEN PŘI REGISTRACI: auth vrstva je sdílená
 * s PTF, takže se do hypoteeky přihlašují i lidé, kteří se tu nikdy
 * neregistrovali — mají účet z PTF. Bez profilu jim nefunguje nic, co na
 * něj váže: role (a tím celý admin), dashboard, a hlavně sessions.user_id
 * má na profiles cizí klíč, takže by se jejich konverzace neuložila.
 *
 * Nikdy nevyhazuje výjimku — přihlášení nesmí spadnout kvůli profilu.
 */

import { supabase as serviceClient } from '@/lib/supabase/client';

interface AuthUserLike {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

/** Jméno z metadat: e-mail/heslo posílá `name`, Google `full_name`. */
function pickDisplayName(meta: Record<string, unknown> | null | undefined): string | null {
  if (!meta) return null;
  for (const key of ['name', 'full_name']) {
    const value = meta[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

export async function ensureProfile(user: AuthUserLike | null | undefined): Promise<void> {
  if (!user?.id || !serviceClient) return;

  const meta = user.user_metadata ?? null;
  const avatar = meta && typeof meta.avatar_url === 'string' ? meta.avatar_url : null;

  // ignoreDuplicates: existující profil se nepřepisuje — uživatel si mohl
  // jméno nebo telefon změnit a přihlášení mu to nesmí vrátit zpátky.
  const { error } = await serviceClient
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email ?? null,
        display_name: pickDisplayName(meta),
        avatar_url: avatar,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

  if (error) {
    console.error('[Auth] Profil se nepodařilo založit:', error.message);
  }
}
