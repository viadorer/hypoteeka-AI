-- ============================================================
-- 009: Expand market_rates with mortgage avg rates from ARAD
-- New columns: avg mortgage rates by fixation, RPSN, volumes
-- Source: ČNB ARAD monthly mortgage statistics
-- ============================================================

ALTER TABLE public.market_rates
  ADD COLUMN IF NOT EXISTS mortgage_avg_rate NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS mortgage_rate_fix1y NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS mortgage_rate_fix5y NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS mortgage_rate_fix10y NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS mortgage_rate_fix10yplus NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS mortgage_rpsn NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS mortgage_volume_total NUMERIC(14,0),
  ADD COLUMN IF NOT EXISTS mortgage_volume_fix5y NUMERIC(14,0);

-- No seed values - real data comes from ARAD fetch (/api/cron/rates)
-- After running this migration, call /api/cron/rates to populate with real ČNB data
