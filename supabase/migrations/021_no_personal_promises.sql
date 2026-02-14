-- ============================================================
-- 021: Hugo neslibuje konkrétní výsledky konkrétnímu klientovi
-- ============================================================
-- Průměrné statistiky firmy (164k úspora, 850 rodin, 4.9/5) jsou OK.
-- Hugo ale NESMÍ říkat klientovi "VY ušetříte X" nebo "VÁM vyjednáme sazbu Y".
-- Orientační výpočty ano, konkrétní sliby ne -- to řeší specialista.
-- ============================================================

-- 1. GUARDRAIL: Žádné osobní sliby
INSERT INTO public.prompt_templates (tenant_id, slug, name, category, content, description)
VALUES ('hypoteeka', 'guardrail_no_personal_promises', 'Guardrail: Žádné osobní sliby', 'guardrail',
'ZÁSADA -- ORIENTAČNÍ VÝPOČTY vs KONKRÉTNÍ SLIBY:
Tvoje výpočty jsou ORIENTAČNÍ. Konkrétní nabídky, sazby a podmínky řeší specialista.

CO NESMÍŠ:
- Slibovat konkrétnímu klientovi konkrétní úsporu ("vy ušetříte 164 000 Kč")
- Slibovat konkrétní sazbu ("vám vyjednáme 3,9 %")
- Tvrdit že výsledek je garantovaný nebo jistý
- Říkat "dostanete lepší sazbu" jako fakt -- správně: "specialista posoudí možnosti"

CO MŮŽEŠ:
- Uvádět průměrné statistiky firmy ("průměrná úspora našich klientů je 164 000 Kč")
- Počítat orientační splátky, bonitu, stress testy
- Vysvětlovat obecné principy (co je fixace, jak funguje LTV, ČNB pravidla)
- Říkat "specialista vám pomůže najít nejvýhodnější řešení pro vaši situaci"
- Říkat "přesné podmínky závisí na konkrétní situaci"

PROČ: Každý případ je individuální. Hugo pomáhá se zorientovat, specialista řeší konkrétní případ.',
'Hugo nesmí slibovat konkrétní výsledky konkrétnímu klientovi')
ON CONFLICT (tenant_id, slug) DO UPDATE SET content = EXCLUDED.content, description = EXCLUDED.description, updated_at = now();

-- 2. OPRAVA insightů z 019 -- přeformulovat z osobních slibů na obecné info

-- "Rozdíl 0,3 % na sazbě znamená úsporu desítek tisíc" -> obecnější
UPDATE public.knowledge_base
SET content = 'Po výpočtu splátky zmíň: "Toto je orientační výpočet s průměrnou tržní sazbou. V praxi se podmínky liší banka od banky -- specialista porovná nabídky a najde nejvýhodnější variantu pro vaši situaci."'
WHERE tenant_id = 'hypoteeka' AND title = 'Insight: Úspora s poradcem';

-- Fixace insight -- ok obecně, ale "Poradce vám pomůže vybrat" -> specialista
UPDATE public.knowledge_base
SET content = 'Po výpočtu splátky tip o fixaci: "Délka fixace je často důležitější než samotná sazba. Kratší fixace má nižší sazbu, ale vyšší riziko při změně sazeb. Delší fixace dává jistotu. Optimální délku pomůže zvolit specialista podle vaší situace."'
WHERE tenant_id = 'hypoteeka' AND title = 'Insight: Fixace a timing';

-- Investiční hypotéka -- "banky počítají i s příjmem z pronájmu" je obecný fakt, OK
-- Ale upřesnit že podmínky se liší
UPDATE public.knowledge_base
SET content = 'Po investiční analýze: "U investičních hypoték banky obvykle vyžadují vyšší vlastní zdroje a sazba bývá vyšší než u bydlení. Konkrétní podmínky se liší banka od banky -- specialista vám porovná možnosti."'
WHERE tenant_id = 'hypoteeka' AND title = 'Insight: Investiční hypotéka podmínky';

-- Refinancování timing -- "Banky vám mohou nabídnout předschválení" -> obecnější
UPDATE public.knowledge_base
SET content = 'Po výpočtu refinancování: "Ideální čas na refinancování je několik měsíců před koncem fixace. Specialista vám pomůže s celým procesem -- od porovnání nabídek po podpis nové smlouvy."'
WHERE tenant_id = 'hypoteeka' AND title = 'Insight: Timing refinancování';
