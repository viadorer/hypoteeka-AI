-- ============================================================
-- 043: Deaktivovat zastaralé seedové články
-- ============================================================
-- Why: Migrace 008_news.sql seedovala 3 ukázkové články z ledna/února 2025,
-- které od té doby nikdo neaktualizoval. Dnes (květen 2026+) jsou:
--   - „ČNB snížila sazbu na 3,75 %" — sazba se od té doby vícekrát změnila
--   - „Nové limity ČNB pro rok 2025" — výchozí rok skončil
--   - „Nová funkce: srovnání nájmu a hypotéky" — PR z roku starého
--
-- Riziko: klient se může spolehnout na zastaralá regulační čísla;
-- prázdná sekce vypadá líp než mrtvý blog.
--
-- Co děláme: set published = false. Obsah zůstává v DB pro historii.
-- Admin může články znovu publikovat nebo přepsat přes /admin → Články.
--
-- Idempotentní.
-- ============================================================

UPDATE public.news
SET published = false,
    updated_at = now()
WHERE tenant_id = 'hypoteeka'
  AND slug IN ('cnb-sazba-2025-02', 'cnb-limity-2025', 'nova-funkce-najem-vs-hypo');
