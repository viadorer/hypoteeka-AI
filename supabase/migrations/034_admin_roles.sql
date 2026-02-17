-- ============================================================
-- Migration 034: Admin roles on profiles
-- ============================================================
-- Adds role column to profiles for admin access control.
-- Superadmin can manage all tenants. Admin can manage assigned tenants.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin', 'superadmin')),
  ADD COLUMN IF NOT EXISTS managed_tenants text[] DEFAULT '{}';

-- Index for quick admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Welcome screen config per tenant (stored in tenants table as JSONB)
-- { agentName, welcomeTitle, welcomeSubtitle, welcomeMessage, quickActions: [{label, prompt}] }
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS welcome_config jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS agent_name text;

-- Seed welcome configs for existing tenants
UPDATE public.tenants SET
  agent_name = 'Hugo',
  welcome_config = '{
    "welcomeTitle": "Jsem Hugo, váš hypoteční poradce",
    "welcomeSubtitle": "Pomohu vám s hypotékou, spočítám splátku a ověřím bonitu. Vše nezávazně a zdarma.",
    "quickActions": [
      {"label": "Spočítat splátku", "prompt": "Chci si spočítat splátku hypotéky."},
      {"label": "Ověřit bonitu", "prompt": "Chci si ověřit, jestli dosáhnu na hypotéku."},
      {"label": "Kolik si mohu půjčit?", "prompt": "Kolik si mohu maximálně půjčit na hypotéku?"},
      {"label": "Refinancování", "prompt": "Chci refinancovat hypotéku."}
    ]
  }'::jsonb
WHERE id = 'hypoteeka';

UPDATE public.tenants SET
  agent_name = 'Hugo',
  welcome_config = '{
    "welcomeTitle": "Zjistěte cenu vaší nemovitosti",
    "welcomeSubtitle": "Orientační odhad ceny bytu, domu nebo pozemku. Zdarma a nezávazně.",
    "quickActions": [
      {"label": "Odhad bytu", "prompt": "Chci odhadnout cenu bytu."},
      {"label": "Odhad domu", "prompt": "Chci odhadnout cenu domu."},
      {"label": "Odhad pozemku", "prompt": "Chci odhadnout cenu pozemku."}
    ]
  }'::jsonb
WHERE id = 'odhad';

-- Function to promote a user to superadmin by email
CREATE OR REPLACE FUNCTION public.promote_to_superadmin(target_email text)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET role = 'superadmin', managed_tenants = '{}'
  WHERE id IN (
    SELECT id FROM auth.users WHERE email = target_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-promote known superadmin emails on profile insert/update
CREATE OR REPLACE FUNCTION public.auto_promote_superadmin()
RETURNS trigger AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;
  IF user_email = 'david@ptf.cz' THEN
    NEW.role := 'superadmin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_promote_superadmin ON public.profiles;
CREATE TRIGGER trg_auto_promote_superadmin
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_promote_superadmin();

-- Promote existing user if already registered
SELECT public.promote_to_superadmin('david@ptf.cz');
