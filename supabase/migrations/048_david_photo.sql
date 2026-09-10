-- ============================================================
-- 048: Fotografie Davida Choce v poolu poradců
-- ============================================================
-- photo_url zůstával od 042/047 prázdný (NULL) — nová stránka /poradce
-- i vizitka ve widgetu (SpecialistWidget) ho teď zobrazují. Soubor je
-- checked-in v repu (public/images/team/david-choc.png), stažený a
-- vizuálně ověřený z davidchoc.cz — na výslovnou žádost ponechán beze
-- změny (žluté pozadí kruhu je záměrně zachováno).
-- ============================================================

UPDATE public.brokers
SET photo_url = '/images/team/david-choc.png', updated_at = now()
WHERE slug = 'david-choc' AND photo_url IS NULL;
