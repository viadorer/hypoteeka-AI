-- ============================================================
-- ŠABLONA: přidání dalších hypotečních poradců do poolu
-- ============================================================
-- Tabulka public.brokers existuje od migrace 042_broker_pool_schema.sql
-- (tam je i seed Davida Choce). Další poradce lze přidat dvěma způsoby:
--
--   A) Admin UI (doporučeno): /admin → záložka „Brokeři" → Přidat.
--      Stejná pole jako níže, bez SQL.
--
--   B) Tímto seedem: vyplnit hodnoty, spustit v Supabase SQL editoru.
--      ON CONFLICT (slug) dělá skript idempotentní — opakované spuštění
--      poradce aktualizuje, nevytvoří duplikát.
--
-- DŮLEŽITÉ: pool čte výhradně Supabase. Dokud je projekt zapauzovaný,
-- matchBroker() vrací fallback (hardcoded David v broker-pool.ts) a další
-- poradci se nikdy nepoužijí. Před naplněním poolu obnovit Supabase.
--
-- vertical_tags řídí routing leadů (round-robin v rámci shody):
--   'bydleni' | 'investice' | 'refi'
-- specializations jsou jen text na vizitce, na routing nemají vliv.
-- ============================================================

INSERT INTO public.brokers (
  tenant_id, first_name, last_name, display_name, slug,
  email, phone, whatsapp_phone, photo_url,
  role_label, short_description, specializations, vertical_tags,
  company, vazany_zastupce_of, cnb_license_id, legal_disclosure,
  is_active, accepts_leads, source, bio
) VALUES
(
  'hypoteeka',
  '[Jméno]', '[Příjmení]',
  '[Jméno]',                        -- jak o něm mluví Hugo („Petr")
  '[jmeno-prijmeni]',               -- URL slug, malými písmeny, unikátní
  '[email@quadrum.cz]',
  '[+420…]',
  '[+420… nebo NULL]',              -- WhatsApp
  NULL,                             -- photo_url — skutečná fotografie, ne stock
  'Hypoteční specialista · Quadrum',
  '[2–3 věty na vizitku: pro koho, co umí, konzultace zdarma]',
  ARRAY['Hypotéky', 'Refinancování'],          -- tagy na vizitce
  ARRAY['bydleni', 'refi'],                    -- routing: bydleni/investice/refi
  'Quadrum',
  'SAB servis s.r.o.',
  '[reg. číslo v JERRS — doplnit, kvůli ověřitelnosti]',
  'Vázaný zástupce SAB servis s.r.o. pro spotřebitelské úvěry dle zákona č. 257/2016 Sb. Konzultace je vždy zdarma — odměnu hradí banka.',
  true, true, 'internal',
  '[delší bio pro detailní stránku — volitelné]'
)
-- , ( … další poradce … )
ON CONFLICT (slug) DO UPDATE
SET email             = EXCLUDED.email,
    phone             = EXCLUDED.phone,
    whatsapp_phone    = EXCLUDED.whatsapp_phone,
    photo_url         = EXCLUDED.photo_url,
    role_label        = EXCLUDED.role_label,
    short_description = EXCLUDED.short_description,
    specializations   = EXCLUDED.specializations,
    vertical_tags     = EXCLUDED.vertical_tags,
    cnb_license_id    = EXCLUDED.cnb_license_id,
    legal_disclosure  = EXCLUDED.legal_disclosure,
    is_active         = EXCLUDED.is_active,
    accepts_leads     = EXCLUDED.accepts_leads,
    updated_at        = now();
