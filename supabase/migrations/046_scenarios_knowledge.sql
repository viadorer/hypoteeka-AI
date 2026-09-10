-- ============================================================
-- 046: Knowledge base pro scénáře fáze B (prodej, OSVČ, refi, investice)
-- ============================================================
-- Audit fáze B: prodej měl v KB 0 záznamů, OSVČ 1, refi bez nákladů/break-even.
-- Vše formulováno jako RÁMCE (anti-halucinační pravidlo: žádná přesná čísla
-- kromě zákonných sazeb/lhůt). Idempotentní přes WHERE NOT EXISTS.
--
-- Navíc: David dostává vertical_tag 'prodej' (routing prodávajících napřímo).
-- ============================================================

-- David: tag 'prodej' pro přímý routing prodávajících
UPDATE public.brokers
SET vertical_tags = array_append(vertical_tags, 'prodej'), updated_at = now()
WHERE slug = 'david-choc' AND NOT ('prodej' = ANY(vertical_tags));

-- ---------- PRODEJ NEMOVITOSTI ----------
INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords, is_active, sort_order)
SELECT 'hypoteeka', 'faq', 'Daň z příjmu při prodeji nemovitosti (časový test)',
  'Příjem z prodeje nemovitosti je osvobozen od daně z příjmu, pokud je splněn časový test: u nemovitostí nabytých od 1. 1. 2021 je to 10 let vlastnictví, u dříve nabytých 5 let. Alternativně platí osvobození při 2 letech bydliště v nemovitosti před prodejem, nebo při použití prostředků na obstarání vlastní bytové potřeby (nutno oznámit finančnímu úřadu). Toto je obecný rámec — konkrétní situaci klienta musí posoudit specialista nebo daňový poradce, Hugo nikdy nepočítá konkrétní daň.',
  ARRAY['daň','prodej','časový test','osvobození','příjem','10 let','5 let'], true, 300
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_base WHERE tenant_id='hypoteeka' AND title='Daň z příjmu při prodeji nemovitosti (časový test)');

INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords, is_active, sort_order)
SELECT 'hypoteeka', 'faq', 'Prodej nemovitosti s váznoucí hypotékou',
  'Nemovitost s hypotékou prodat lze — je to běžná situace. Varianty: (1) kupující doplatí hypotéku z kupní ceny (nejčastější, řeší se přes úschovu), (2) kupující převezme hypotéku, (3) prodávající hypotéku předčasně splatí. U předčasného splacení platí od 9/2024 zákonné náhrady dle z. č. 257/2016 Sb. — banka smí účtovat max. 0,25 % z předčasně splacené částky za každý započatý rok do konce fixace, celkem max. 1 %; při prodeji nemovitosti po 2 letech od nabytí lze splatit za sníženou náhradu. Po splacení banka vystaví souhlas s výmazem zástavního práva (kvitanci) pro katastr. Konkrétní postup a náklady potvrdí specialista.',
  ARRAY['prodej','hypotéka','zástava','vyvázání','předčasné splacení','kvitance','výmaz'], true, 301
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_base WHERE tenant_id='hypoteeka' AND title='Prodej nemovitosti s váznoucí hypotékou');

INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords, is_active, sort_order)
SELECT 'hypoteeka', 'bank_process', 'Úschova kupní ceny a rezervační smlouva',
  'Standardní bezpečný průběh prodeje: rezervační smlouva (kupující skládá rezervační zálohu) → kupní smlouva → kupní cena do úschovy (advokátní, notářská nebo bankovní) → vklad vlastnického práva do katastru (řízení trvá řádově týdny) → uvolnění peněz prodávajícímu z úschovy až po přepisu. Přímá platba na účet prodávajícího bez úschovy je pro obě strany riziková. Detaily a vzory smluv řeší specialista.',
  ARRAY['úschova','rezervační smlouva','kupní smlouva','katastr','vklad','advokát'], true, 302
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_base WHERE tenant_id='hypoteeka' AND title='Úschova kupní ceny a rezervační smlouva');

INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords, is_active, sort_order)
SELECT 'hypoteeka', 'faq', 'Dokumenty a PENB k prodeji nemovitosti',
  'K prodeji je typicky potřeba: list vlastnictví, nabývací titul (kupní/darovací smlouva…), průkaz energetické náročnosti budovy (PENB — povinný už při inzerci, jinak hrozí pokuta), u bytu prohlášení vlastníka a informace o fondu oprav/SVJ, půdorys, vyúčtování energií. U družstevního podílu se prodává podíl, ne nemovitost — jiný proces. Kompletní checklist zobrazí show_checklist (typ=prodej).',
  ARRAY['dokumenty','PENB','list vlastnictví','prodej','SVJ','prohlášení vlastníka'], true, 303
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_base WHERE tenant_id='hypoteeka' AND title='Dokumenty a PENB k prodeji nemovitosti');

INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords, is_active, sort_order)
SELECT 'hypoteeka', 'objection_handling', 'Prodávající: proč nezačít rovnou s inzercí',
  'Klientovi, který chce rovnou inzerovat: správně nastavená cena rozhoduje o době prodeje — přeceněná nemovitost "vysedí" na trhu a pak se prodává hůř i pod cenou. Ocenění z reálných tržních dat (request_valuation) je proto první krok, ne formalita. Konkrétní doba prodeje pochází VÝHRADNĚ z výsledku ocenění (avgDuration) — nikdy ji neodhaduj z hlavy.',
  ARRAY['prodej','inzerce','cena','doba prodeje','přeceněná'], true, 304
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_base WHERE tenant_id='hypoteeka' AND title='Prodávající: proč nezačít rovnou s inzercí');

-- ---------- OSVČ ----------
INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords, is_active, sort_order)
SELECT 'hypoteeka', 'faq', 'Jak banky počítají příjem OSVČ',
  'Banky počítají příjem OSVČ z daňového přiznání (příjmy dle § 7), standardně za 1–2 uzavřená zdaňovací období. Metodiky se mezi bankami liší nejvíc z celého trhu: některé vycházejí ze základu daně, jiné počítají procentem z obratu — stejný podnikatel tak může mít v různých bankách výrazně jinou bonitu. Právě proto u OSVČ dává největší smysl specialista, který zná aktuální metodiky. Dvě daňová přiznání jsou standardní požadavek, ne překážka.',
  ARRAY['OSVČ','podnikatel','příjem','daňové přiznání','§ 7','obrat','základ daně','bonita'], true, 310
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_base WHERE tenant_id='hypoteeka' AND title='Jak banky počítají příjem OSVČ');

INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords, is_active, sort_order)
SELECT 'hypoteeka', 'faq', 'Paušální daň a hypotéka',
  'OSVČ v režimu paušální daně nepodává daňové přiznání — banka tedy nevidí základ daně a příjem typicky odvozuje procentem z obratu (doloženého např. fakturami či výpisy). Doložitelnost je horší než u klasického přiznání, ale hypotéka možná je — klíčový je výběr banky s vstřícnou metodikou. To je přesně situace pro specialistu; Hugo nikdy neslibuje, že konkrétní banka příjem uzná.',
  ARRAY['paušální daň','paušál','OSVČ','obrat','doložení příjmu'], true, 311
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_base WHERE tenant_id='hypoteeka' AND title='Paušální daň a hypotéka');

INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords, is_active, sort_order)
SELECT 'hypoteeka', 'faq', 'Jednatel a majitel s.r.o. — jak se posuzuje příjem',
  'U majitele/jednatele s.r.o. banky posuzují kombinaci: oficiální mzda/odměna jednatele + podíly na zisku + hospodářský výsledek firmy, typicky za 2 uzavřená účetní období. Nízká oficiální mzda při ziskové firmě není nutně problém — záleží na metodice banky. Komplexnější případ = větší přínos specialisty.',
  ARRAY['s.r.o.','jednatel','majitel','hospodářský výsledek','podíl na zisku','příjem'], true, 312
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_base WHERE tenant_id='hypoteeka' AND title='Jednatel a majitel s.r.o. — jak se posuzuje příjem');

-- ---------- REFINANCOVÁNÍ ----------
INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords, is_active, sort_order)
SELECT 'hypoteeka', 'faq', 'Refixace vs. refinancování — v čem je rozdíl',
  'Refixace = nová sazba u STÁVAJÍCÍ banky na konci fixace (bez nového odhadu, bez katastru, minimum papírování). Refinancování = přenos hypotéky k JINÉ bance (nový odhad, vklad nové zástavy, více administrativy, ale často lepší podmínky). Praktická strategie: nejdřív získat nabídku konkurence, tou pak vyjednávat refixaci u stávající banky. Konkrétní srovnání připraví specialista.',
  ARRAY['refixace','refinancování','fixace','konec fixace','nabídka','vyjednávání'], true, 320
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_base WHERE tenant_id='hypoteeka' AND title='Refixace vs. refinancování — v čem je rozdíl');

INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords, is_active, sort_order)
SELECT 'hypoteeka', 'faq', 'Náklady refinancování a bod zvratu (break-even)',
  'Refinancování má jednorázové náklady: nový odhad nemovitosti, správní poplatky katastru, případně poplatek za čerpání či vedení. Bod zvratu = jednorázové náklady děleno měsíční úsporou — od tolika měsíců se přechod vyplácí. Dává smysl hlavně, když do konce splatnosti zbývá výrazně déle než bod zvratu. Konkrétní částky nákladů se liší podle banky — nikdy je neodhaduj, vyčíslí je specialista v nabídce.',
  ARRAY['refinancování','náklady','poplatky','break-even','bod zvratu','odhad','úspora'], true, 321
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_base WHERE tenant_id='hypoteeka' AND title='Náklady refinancování a bod zvratu (break-even)');

-- ---------- INVESTICE ----------
INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords, is_active, sort_order)
SELECT 'hypoteeka', 'faq', 'Danění příjmu z pronájmu',
  'Příjem z pronájmu fyzické osoby se daní podle § 9 zákona o daních z příjmů. Výdaje lze uplatnit paušálem 30 % z příjmů (max. limit dle zákona), nebo skutečné výdaje včetně odpisů a úroků z hypotéky — u investiční nemovitosti bývají skutečné výdaje často výhodnější. Do cash flow analýzy klientovi připomeň, že nájem je hrubý příjem před daní. Konkrétní optimalizaci řeší daňový poradce.',
  ARRAY['daň','pronájem','nájem','§ 9','paušál 30','odpisy','investice'], true, 330
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_base WHERE tenant_id='hypoteeka' AND title='Danění příjmu z pronájmu');

INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords, is_active, sort_order)
SELECT 'hypoteeka', 'cnb_rules', 'Doporučení ČNB pro investiční nemovitosti od 1. 4. 2026',
  'Od 1. 4. 2026 ČNB doporučuje pro hypotéky na třetí a další obytnou nemovitost a na nemovitosti pořizované na pronájem přísnější parametry: LTV do 70 % a DTI do 7násobku ročního čistého příjmu. Jde o doporučení (ne závazný limit), ale banky se jím řídí. Pro klienta s více nemovitostmi to znamená vyšší nárok na vlastní zdroje — zmiň to u portfolio investorů.',
  ARRAY['ČNB','doporučení','investice','pronájem','LTV 70','DTI 7','třetí nemovitost','portfolio'], true, 331
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_base WHERE tenant_id='hypoteeka' AND title='Doporučení ČNB pro investiční nemovitosti od 1. 4. 2026');
