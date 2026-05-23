-- ============================================================
-- 042: Broker pool schema (zjednodušená verze)
-- ============================================================
-- Why: První verze byla over-engineered pro stav 1-10 brokerů
-- (separátní broker_specializations, broker_capacity tabulky,
-- 8 vertikál, working_hours, RPC). Tato verze drží jen to, co
-- pool reálně potřebuje:
--   - kontakty + foto + popis (pro vizitku)
--   - tagy specializací (tag-based matching)
--   - is_active / accepts_leads
--   - audit přiřazení leadů (3 statusy: open / won / lost)
--
-- Co bylo úmyslně vynecháno (přidáme až bude potřeba):
--   - capacity counters → až > 5 brokerů a reálné přetížení
--   - working_hours → Hugo říká textem
--   - expertise score per vertikála → bez conversion dat skóre nelze
--     objektivně určit; tagy stačí
--   - geo routing → až bude regionální pool
--
-- Idempotentní (CREATE IF NOT EXISTS + ON CONFLICT).
-- ============================================================

-- ============================================================
-- 1. brokers — registr aktivních specialistů
-- ============================================================

CREATE TABLE IF NOT EXISTS public.brokers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'hypoteeka',

  -- Identifikace
  first_name text NOT NULL,
  last_name text NOT NULL,
  display_name text NOT NULL,   -- jak Hugo o něm mluví ("David")
  slug text NOT NULL UNIQUE,     -- pro URL

  -- Kontakt
  email text NOT NULL,
  phone text NOT NULL,
  whatsapp_phone text,
  photo_url text,                -- URL fotky pro vizitku

  -- Vizitka
  role_label text NOT NULL DEFAULT 'Hypoteční specialista',
  short_description text,        -- 2-3 věty pro vizitku
  specializations text[] NOT NULL DEFAULT '{}',
  -- Tagy zobrazené na vizitce: 'Hypotéky', 'Investice', 'Refinanc', 'OSVČ', 'Mladí do 36'
  vertical_tags text[] NOT NULL DEFAULT '{}',
  -- Tagy pro matching (interní): 'bydleni', 'investice', 'refi'

  -- Regulační rámec
  company text NOT NULL,             -- "Quadrum"
  vazany_zastupce_of text,           -- "SAB servis s.r.o."
  cnb_license_id text,               -- ID v ČNB JERRS
  legal_disclosure text,             -- text pro disclosure dle § 257/2016

  -- Status
  is_active boolean NOT NULL DEFAULT true,
  accepts_leads boolean NOT NULL DEFAULT true,

  -- Source (pro budoucí PTF / external sync)
  source text NOT NULL DEFAULT 'internal' CHECK (source IN ('internal', 'ptf', 'external')),
  external_id text,                  -- ID v externí DB (PTF team_members.id)

  -- Metadata
  bio text,                          -- delší životopis (pro detail stránku)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brokers_tenant_active ON public.brokers (tenant_id, is_active, accepts_leads);
CREATE INDEX IF NOT EXISTS idx_brokers_vertical_tags ON public.brokers USING gin (vertical_tags);
CREATE UNIQUE INDEX IF NOT EXISTS idx_brokers_source_external ON public.brokers (source, external_id)
  WHERE external_id IS NOT NULL;

-- ============================================================
-- 2. broker_assignments — audit přiřazení leadu brokerovi
-- ============================================================

CREATE TABLE IF NOT EXISTS public.broker_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL REFERENCES public.brokers(id),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  session_id text,
  tenant_id text NOT NULL DEFAULT 'hypoteeka',

  vertical text,                     -- 'bydleni' / 'investice' / 'refi' (pro analýzu poolu)

  -- Status — záměrně jen 3 (open → won/lost). Granularitu (acknowledged,
  -- contacted, in_progress) přidáme až s broker dashboardem.
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),

  notified_at timestamptz,           -- kdy jsme brokerovi poslali email
  closed_at timestamptz,
  outcome_note text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broker_assignments_broker ON public.broker_assignments (broker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broker_assignments_session ON public.broker_assignments (session_id);
CREATE INDEX IF NOT EXISTS idx_broker_assignments_status ON public.broker_assignments (status, created_at DESC);

-- ============================================================
-- 3. SEED — David Choc (zatím jediný aktivní broker)
-- ============================================================

INSERT INTO public.brokers (
  tenant_id, first_name, last_name, display_name, slug,
  email, phone, whatsapp_phone, photo_url,
  role_label, short_description, specializations, vertical_tags,
  company, vazany_zastupce_of, cnb_license_id, legal_disclosure,
  is_active, accepts_leads, source, bio
) VALUES (
  'hypoteeka',
  'David', 'Choc', 'David', 'david-choc',
  'david.choc@quadrum.cz', '+420774052232', '+420774052232', NULL,
  'Hypoteční specialista · Quadrum',
  'Vázaný zástupce SAB servis pro spotřebitelské úvěry. Porovnám nabídky 8+ bank a vyjednám podmínky, které běžně nedostanete. Konzultace zdarma.',
  ARRAY['Hypotéky', 'Refinancování', 'Investice', 'OSVČ', 'Mladí do 36'],
  ARRAY['bydleni', 'investice', 'refi'],
  'Quadrum', 'SAB servis s.r.o.', NULL,
  'Vázaný zástupce SAB servis s.r.o. pro spotřebitelské úvěry dle § 257/2016 Sb. Konzultace přes Hypoteeku je vždy zdarma — odměnu hradí banka.',
  true, true, 'internal',
  'Hypoteční specialista, řeší prvokupující, mladé rodiny, OSVČ, investice i refinancování.'
)
ON CONFLICT (slug) DO UPDATE
SET email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    whatsapp_phone = EXCLUDED.whatsapp_phone,
    role_label = EXCLUDED.role_label,
    short_description = EXCLUDED.short_description,
    specializations = EXCLUDED.specializations,
    vertical_tags = EXCLUDED.vertical_tags,
    is_active = EXCLUDED.is_active,
    accepts_leads = EXCLUDED.accepts_leads,
    updated_at = now();

-- ============================================================
-- 4. RLS — broker tabulky jsou interní (přístup jen service role)
-- ============================================================

ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_assignments ENABLE ROW LEVEL SECURITY;

-- Žádné anon/authenticated policies — broker data jen přes service role
-- (server-side broker-pool.ts používá supabase admin client).
-- Admin UI v Hypoteece autentizuje superadmin přes JWT.
