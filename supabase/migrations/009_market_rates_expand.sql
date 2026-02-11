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

-- Update seed row with realistic initial values
UPDATE public.market_rates
SET mortgage_avg_rate = 4.89,
    mortgage_rate_fix1y = 5.20,
    mortgage_rate_fix5y = 4.85,
    mortgage_rate_fix10y = 5.10,
    mortgage_rate_fix10yplus = 5.30,
    mortgage_rpsn = 5.12,
    mortgage_volume_total = 28500,
    mortgage_volume_fix5y = 18200
WHERE source = 'seed';
