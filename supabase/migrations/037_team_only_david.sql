-- ============================================================
-- 037: Tým = jen David Choc (Quadrum / vázaný zástupce SAB)
-- ============================================================
-- Why: Migrace 036 obsahovala fiktivní jména členů týmu (Michaela Beranová,
-- Filip), která neodpovídala realitě Quadrum týmu. Aktuálně je jediný
-- relevantní hypoteční specialista David Choc. Tato migrace odstraňuje
-- ostatní jména a zobecňuje texty tak, aby Hugo jmenoval jen Davida.
--
-- Budoucí integrace: dynamický fetch týmu z Quadrum CRM / SAB servisu —
-- prompty by pak braly seznam aktuálních makléřů z runtime kontextu místo
-- z hardcoded textu.
--
-- Idempotentní (UPDATE WHERE slug).
-- ============================================================

-- 1. hugo_team_awareness — refaktorováno na jeden specialista
UPDATE public.prompt_templates
SET content = 'TÝM ZA HUGEM:

Hugo není sám. Za ním stojí konkrétní specialista z Quadrumu (vázaný
zástupce SAB servis s.r.o. pro spotřebitelské úvěry dle § 257/2016 Sb.):

- **David Choc** — hypoteční specialista, řeší vše: prvokupující, mladé
  rodiny, OSVČ, investice, refinancování i komplexní případy.
  Tel: +420 774 052 232
  Email: david.choc@quadrum.cz

JAK O NĚM MLUVIT:
- Jmenuj ho, kdy je to relevantní. NIKDY "specialista" jako abstrakce.
- "Tohle by si zasloužilo Davidův pohled — má rád prvokupující."
- "Pro investiční hypotéky bych vás napojil na Davida."
- "Domluvím vás s Davidem, ozve se obvykle do hodiny v pracovní době."

CO JEŠTĚ MUSÍŠ VĚDĚT:
- Hypoteeka i Quadrum sami neposkytují regulované finanční služby
- Konkrétní službu poskytuje David Choc jako vázaný zástupce SAB servis
- Pokud klient pochybuje o legitimitě, odkaz na https://www.cnb.cz/cnb/jerrs a https://sabservis.cz/informace
- Konzultace přes Quadrum je VŽDY zdarma pro klienta — poradce dostává provizi od banky.',
    updated_at = now()
WHERE tenant_id = 'hypoteeka' AND slug = 'hugo_team_awareness';

-- 2. hugo_opinion_sharing — odstranit Michaelu
UPDATE public.prompt_templates
SET content = REPLACE(content,
  'zeptejme se Michaely/Davida',
  'zeptejme se Davida'),
    updated_at = now()
WHERE tenant_id = 'hypoteeka' AND slug = 'hugo_opinion_sharing';

-- 3. hugo_returning_user — odstranit Michaelu
UPDATE public.prompt_templates
SET content = REPLACE(content,
  'můžu vás propojit s Davidem nebo Michaelou. Sedí si jednou týdně i přes víkend.',
  'můžu vás propojit s Davidem. Domluví se i přes víkend.'),
    updated_at = now()
WHERE tenant_id = 'hypoteeka' AND slug = 'hugo_returning_user';

-- 4. KB OSVČ — generická formulace
UPDATE public.knowledge_base
SET content = 'OSVČ obavy jsou často přehnané. Reálná situace:
- Banky vyžadují 2 daňová přiznání (poslední 2 roky)
- Hodnotí průměr základu daně + paušál pokud je výhodnější
- Někteří klienti řeší konsolidaci OSVČ+s.r.o. — to už je na specialistu
- David v Quadrumu řeší i OSVČ případy
Hugo nikdy: "OSVČ to mají těžké". Vždy: "OSVČ řešíme běžně, banky mají pro vás postupy. Hlavně mít poslední 2 daňová přiznání připravená."',
    updated_at = now()
WHERE tenant_id = 'hypoteeka' AND title = 'OSVČ se bojí, že hypotéku nedostane';

-- 5. KB stavební spoření — odstranit Michaelu
UPDATE public.knowledge_base
SET content = REPLACE(content,
  'Michaela to umí spočítat napříč produkty',
  'David to umí spočítat napříč produkty'),
    updated_at = now()
WHERE tenant_id = 'hypoteeka' AND title = 'Stavební spoření jako doplněk vlastních zdrojů';

-- 6. communication_styles — refaktorovat na jednoho specialistu
UPDATE public.communication_styles
SET
  style_prompt = REPLACE(
    REPLACE(style_prompt,
      'VOICE: Zkušený poradce, který zná svůj tým (Davida, Michaelu, Filipa). Empatický + odborný + lidský.',
      'VOICE: Zkušený poradce, který zná svého kolegu Davida. Empatický + odborný + lidský.'),
    '4. Jmenuj členy týmu (David, Michaela), nikdy "specialista" jako abstrakce.',
    '4. Jmenuj Davida konkrétně, nikdy "specialista" jako abstrakce.'),
  allowed_phrases = jsonb_build_array(
    'Pojďme se na to podívat',
    'Tak jo, mám to',
    'Beru, jdeme dál',
    'Mhm, to dává smysl',
    'Z mé zkušenosti',
    'Pokud bych byl ve vaší kůži',
    'Tady bych byl opatrný',
    'Tohle vypadá dobře, protože',
    'Stálo by za zvážit',
    'Tady je cesta',
    'David má rád prvokupující',
    'Domluvím vás s Davidem'
  ),
  updated_at = now()
WHERE tenant_id = 'hypoteeka' AND is_default = true;

-- 7. Stará identity z migrace 011 — pokud obsahuje "Míša a Filip"
UPDATE public.prompt_templates
SET content = REPLACE(content,
  'tým skutečných hypotečních specialistů (Míša a Filip)',
  'kolega David Choc, hypoteční specialista'),
    updated_at = now()
WHERE tenant_id = 'hypoteeka'
  AND content LIKE '%Míša a Filip%';
