-- ============================================================
-- Migration 033: User profiles + session ownership fix
-- ============================================================
-- Problem: SupabaseStorage uses author_id (browserID) but column doesn't exist.
-- Solution: Add author_id for anonymous users + properly use user_id for auth users.
-- Flow:
--   Anonymous user: sessions.author_id = browserID, user_id = NULL
--   Logged in user: sessions.user_id = auth.uid(), author_id kept for migration
--   After login: claim anonymous sessions (match author_id -> set user_id)

-- 1. Add author_id to sessions (for anonymous browser fingerprint)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS author_id text;

CREATE INDEX IF NOT EXISTS idx_sessions_author_id
  ON public.sessions(author_id);

CREATE INDEX IF NOT EXISTS idx_sessions_tenant_author
  ON public.sessions(tenant_id, author_id);

-- 2. Extend profiles table with more fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_name text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS monthly_income numeric,
  ADD COLUMN IF NOT EXISTS partner_income numeric,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS browser_ids text[] DEFAULT '{}';

-- browser_ids: array of browserIDs associated with this user
-- Used to claim anonymous sessions after login

-- 3. Update RLS policies for sessions to support both auth users AND anonymous
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.sessions;

-- Recreate with dual support (user_id for auth, author_id for anonymous)
-- NOTE: service_role key bypasses RLS, so these only matter for browser client
CREATE POLICY "Users can view own sessions"
  ON public.sessions FOR SELECT USING (
    auth.uid() = user_id
    OR (user_id IS NULL AND author_id IS NOT NULL)
  );

CREATE POLICY "Users can insert sessions"
  ON public.sessions FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR user_id IS NULL
  );

CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE USING (
    auth.uid() = user_id
    OR (user_id IS NULL AND author_id IS NOT NULL)
  );

CREATE POLICY "Users can delete own sessions"
  ON public.sessions FOR DELETE USING (
    auth.uid() = user_id
  );

-- 4. Add author_id to leads for anonymous tracking
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS author_id text;

-- 5. Function to claim anonymous sessions after login
-- Called when user logs in: matches their browserID to existing anonymous sessions
CREATE OR REPLACE FUNCTION public.claim_anonymous_sessions(
  p_user_id uuid,
  p_author_id text,
  p_tenant_id text DEFAULT NULL
)
RETURNS integer AS $$
DECLARE
  claimed_count integer;
BEGIN
  UPDATE public.sessions
  SET user_id = p_user_id
  WHERE author_id = p_author_id
    AND user_id IS NULL
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id);

  GET DIAGNOSTICS claimed_count = ROW_COUNT;

  -- Also claim leads
  UPDATE public.leads
  SET user_id = p_user_id
  WHERE author_id = p_author_id
    AND user_id IS NULL
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id);

  -- Store browserID in profile for future matching
  UPDATE public.profiles
  SET browser_ids = array_append(
    COALESCE(browser_ids, '{}'),
    p_author_id
  )
  WHERE id = p_user_id
    AND NOT (p_author_id = ANY(COALESCE(browser_ids, '{}')));

  RETURN claimed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
