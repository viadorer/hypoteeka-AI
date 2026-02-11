-- ============================================================
-- 003: Market data tables
-- All market data in DB, nothing hardcoded
-- Tables: cnb_limits, market_rates, bank_spreads
-- ============================================================

-- ============================================================
-- 1) ČNB regulatory limits
-- ============================================================
CREATE TABLE IF NOT EXISTS cnb_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'hypoteeka' REFERENCES tenants(id),
  ltv_limit NUMERIC(5,4) NOT NULL DEFAULT 0.80,
  ltv_limit_young NUMERIC(5,4) NOT NULL DEFAULT 0.90,
  young_age_limit INTEGER NOT NULL DEFAULT 36,
  dsti_limit NUMERIC(5,4) NOT NULL DEFAULT 0.45,
  dti_limit NUMERIC(5,2) NOT NULL DEFAULT 9.50,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE,
  source TEXT DEFAULT 'CNB doporuceni',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cnb_limits_active 
  ON cnb_limits(tenant_id, valid_from DESC) 
  WHERE valid_to IS NULL;

INSERT INTO cnb_limits (tenant_id, ltv_limit, ltv_limit_young, young_age_limit, dsti_limit, dti_limit, valid_from, source, notes)
VALUES 
  ('hypoteeka', 0.80, 0.90, 36, 0.45, 9.50, '2024-01-01', 'CNB doporuceni 2024', 'LTV 80% (90% do 36 let), DSTI 45%, DTI 9.5x'),
  ('odhad', 0.80, 0.90, 36, 0.45, 9.50, '2024-01-01', 'CNB doporuceni 2024', 'LTV 80% (90% do 36 let), DSTI 45%, DTI 9.5x')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2) Market rates (ČNB repo, PRIBOR, IRS)
-- Fetched from ARAD 1x daily, stored here
-- ============================================================
CREATE TABLE IF NOT EXISTS market_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_date DATE NOT NULL,
  cnb_repo NUMERIC(6,3) NOT NULL,
  cnb_discount NUMERIC(6,3),
  cnb_lombard NUMERIC(6,3),
  pribor_1w NUMERIC(6,3),
  pribor_1m NUMERIC(6,3),
  pribor_3m NUMERIC(6,3),
  pribor_6m NUMERIC(6,3),
  pribor_1y NUMERIC(6,3),
  irs_5y NUMERIC(6,3),
  irs_10y NUMERIC(6,3),
  source TEXT NOT NULL DEFAULT 'arad',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(rate_date, source)
);

CREATE INDEX IF NOT EXISTS idx_market_rates_latest 
  ON market_rates(rate_date DESC);

-- Seed: initial rates (will be overwritten by first ARAD fetch)
INSERT INTO market_rates (rate_date, cnb_repo, cnb_discount, cnb_lombard, pribor_1w, pribor_1m, pribor_3m, pribor_6m, pribor_1y, irs_5y, irs_10y, source)
VALUES ('2026-02-11', 3.75, 2.75, 4.75, 3.82, 3.85, 3.88, 3.90, 3.95, 3.45, 3.60, 'seed')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3) Bank spreads (margin over repo for each fixation)
-- Updated manually or via admin, no code deploy needed
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_spreads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'hypoteeka' REFERENCES tenants(id),
  bank_name TEXT NOT NULL,
  spread_3y NUMERIC(5,3) NOT NULL,
  spread_5y NUMERIC(5,3) NOT NULL,
  spread_10y NUMERIC(5,3) NOT NULL,
  is_our_rate BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, bank_name)
);

CREATE INDEX IF NOT EXISTS idx_bank_spreads_active 
  ON bank_spreads(tenant_id, active, sort_order);

-- Seed: bank spreads
INSERT INTO bank_spreads (tenant_id, bank_name, spread_3y, spread_5y, spread_10y, is_our_rate, sort_order) VALUES
  ('hypoteeka', 'Hypoteční banka',  0.79, 0.99, 1.39, FALSE, 1),
  ('hypoteeka', 'Česká spořitelna', 0.89, 1.09, 1.49, FALSE, 2),
  ('hypoteeka', 'Komerční banka',   0.99, 1.19, 1.59, FALSE, 3),
  ('hypoteeka', 'ČSOB',             0.89, 1.09, 1.49, FALSE, 4),
  ('hypoteeka', 'Raiffeisenbank',   0.79, 0.99, 1.39, FALSE, 5),
  ('hypoteeka', 'mBank',            0.59, 0.89, 1.29, FALSE, 6),
  ('hypoteeka', 'UniCredit Bank',   0.89, 1.09, 1.49, FALSE, 7),
  ('hypoteeka', 'Moneta',           1.09, 1.29, 1.69, FALSE, 8),
  ('hypoteeka', 'Hypoteeka (naše)', 0.29, 0.49, 0.89, TRUE,  0)
ON CONFLICT DO NOTHING;
