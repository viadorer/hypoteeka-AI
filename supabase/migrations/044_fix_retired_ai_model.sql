-- ============================================================
-- 044: Oprava vyřazeného AI modelu (gemini-2.0-flash → gemini-3.6-flash)
-- ============================================================
-- Why: Google vyřadil gemini-2.0-flash z Generative Language API.
-- Každé volání /api/chat končilo:
--   404 "This model models/gemini-2.0-flash is no longer available.
--        Please update your code to use models/gemini-3.6-flash"
-- Tzn. Hugo neodpovídal vůbec — celý chat byl mimo provoz.
--
-- Runtime čte model z tenants.ai_config.model (DB přebíjí hardcoded
-- fallback v src/lib/tenant/config.ts), takže oprava kódu sama nestačí —
-- musí se přepsat i DB.
--
-- Proč gemini-3.6-flash a ne gemini-flash-latest:
-- Hugova osobnost je vyladěná ~40 migracemi promptů. Plovoucí alias
-- (`-latest`) by měnil chování modelu pod rukama a tiše rozbíjel
-- odladěný tón. Pinned verze = předvídatelné chování; upgrade je
-- vědomé rozhodnutí, ne vedlejší efekt.
--
-- Ověřeno před nasazením: gemini-3.6-flash prošel přes @ai-sdk/google
-- v3.0.23 včetně tool callingu (Hugo má 23 nástrojů).
--
-- Idempotentní — přepíše jen řádky, které ještě mají starý model.
-- ============================================================

UPDATE public.tenants
SET ai_config = jsonb_set(ai_config, '{model}', '"gemini-3.6-flash"'),
    updated_at = now()
WHERE ai_config->>'model' = 'gemini-2.0-flash';

-- Kontrola: vypíše aktuální modely všech tenantů (viditelné v supabase db push logu)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, ai_config->>'model' AS model FROM public.tenants LOOP
    RAISE NOTICE 'Tenant % → model %', r.id, r.model;
  END LOOP;
END $$;
