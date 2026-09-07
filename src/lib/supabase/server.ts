/**
 * Supabase Server Client
 * 
 * Pro Server Components a API routes (auth session).
 * Používá anon key + cookies pro auth session.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { HYPOTEEKA_DB_SCHEMA } from './schema';

export async function createSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: HYPOTEEKA_DB_SCHEMA },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component - ignore
          }
        },
      },
    }
  );
}
