/**
 * Supabase Browser Client
 * 
 * Pro klientské komponenty (auth, real-time).
 * Používá anon key - respektuje RLS.
 */

import { createBrowserClient } from '@supabase/ssr';
import { HYPOTEEKA_DB_SCHEMA } from './schema';

export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: HYPOTEEKA_DB_SCHEMA } }
  );
}
