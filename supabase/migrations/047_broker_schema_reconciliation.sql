-- ============================================================
-- 047: Reconciliace schématu brokerů — 042 nikdy reálně neproběhla
-- ============================================================
-- ZJIŠTĚNÍ (9/2026): tabulka public.brokers v produkci existovala už
-- ze starší, komplexnější verze v supabase/seed_full.sql (samostatné
-- tabulky broker_specializations / broker_capacity, working_hours,
-- 8 vertikál). Migrace 042_broker_pool_schema.sql zavedla zjednodušené
-- schéma (vertical_tags, specializations, photo_url…), ale použila
-- `CREATE TABLE IF NOT EXISTS` — na už existující tabulku to nemělo
-- ŽÁDNÝ efekt. Sloupce z 042 se do produkce nikdy nedostaly.
--
-- Důsledek v kódu (broker-pool.ts počítá s 042 schématem):
--   - matchBroker(): `.select('*')` vracelo řádky bez vertical_tags/
--     specializations/photo_url → přístup k `.vertical_tags.includes()`
--     by shodil select, ale try/catch v route.ts to tiše zachytával
--     jako "no_broker_available" a padalo na hardcoded fallback (David).
--   - assignLeadToBroker(): INSERT se `status: 'open'` narážel na starší
--     CHECK constraint (assigned/acknowledged/contacted/in_progress/
--     converted/declined/lost/reassigned — 'open' tam není) → handoff
--     do broker_assignments tiše selhával, e-mail notifikace poradci
--     se tak nikdy neodeslal.
--   - Admin UI (BrokersEditor.tsx) čte/píše stejné nové sloupce → CRUD
--     nových brokerů přes /admin pravděpodobně selhával stejně.
--
-- Tato migrace NEPOUŽÍVÁ CREATE TABLE — rovnou ALTERuje existující
-- tabulky, idempotentně (ADD COLUMN IF NOT EXISTS). Staré tabulky
-- broker_specializations / broker_capacity se nemažou (nejsou nikde
-- v src/ referencované, ale mazání cizí historie dat mimo scope téhle
-- opravy) — jen přestávají být zdrojem pravdy pro routing.
-- ============================================================

-- ---------- 1. public.brokers — chybějící sloupce ----------
ALTER TABLE public.brokers
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS role_label text NOT NULL DEFAULT 'Hypoteční specialista',
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS specializations text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vertical_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS external_id text;

-- source CHECK — idempotentně (constraint bez IF NOT EXISTS v Postgresu)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brokers_source_check'
  ) THEN
    ALTER TABLE public.brokers
      ADD CONSTRAINT brokers_source_check CHECK (source IN ('internal', 'ptf', 'external'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_brokers_vertical_tags ON public.brokers USING gin (vertical_tags);
CREATE UNIQUE INDEX IF NOT EXISTS idx_brokers_source_external ON public.brokers (source, external_id)
  WHERE external_id IS NOT NULL;

-- Backfill: existující broker(y) bez vertical_tags dostanou plný rozsah
-- (dnes jediný broker David reálně řeší vše — bydlení/investice/refi/prodej).
-- Nové brokery zadané přes /admin po této migraci už tagy nastaví editor.
UPDATE public.brokers
SET vertical_tags = ARRAY['bydleni', 'investice', 'refi', 'prodej'],
    specializations = CASE WHEN specializations = '{}' THEN
      ARRAY['Hypotéky', 'Refinancování', 'Investice', 'OSVČ', 'Mladí do 36']
      ELSE specializations END,
    updated_at = now()
WHERE vertical_tags = '{}' OR vertical_tags IS NULL;

-- ---------- 2. public.broker_assignments — chybějící sloupce ----------
ALTER TABLE public.broker_assignments
  ADD COLUMN IF NOT EXISTS vertical text,
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

-- Status CHECK ve starším schématu neobsahuje 'open'/'won', které kód
-- zapisuje. Nahradit sjednocením obou slovníků (nic stávajícího nerozbije,
-- INSERT z kódu přestane padat na constraint violation).
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.broker_assignments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.broker_assignments DROP CONSTRAINT %I', c.conname);
  END LOOP;

  ALTER TABLE public.broker_assignments
    ADD CONSTRAINT broker_assignments_status_check CHECK (status IN (
      'assigned', 'acknowledged', 'contacted', 'in_progress', 'converted',
      'declined', 'lost', 'reassigned', 'open', 'won'
    ));
END $$;

CREATE INDEX IF NOT EXISTS idx_broker_assignments_status_open ON public.broker_assignments (status, created_at DESC)
  WHERE status = 'open';
