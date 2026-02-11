-- ============================================================
-- 013: Knowledge Base - rozšíření znalostní báze
-- Přidává 15 nových záznamů k existujícím 7
-- Kategorie: faq, cnb_rules, bank_process, objection_handling, product
-- ============================================================

-- FAQ: základní pojmy a otázky
INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords, is_active, sort_order)
VALUES
('hypoteeka', 'faq', 'Co je fixace?',
 'Fixace je období, po které je garantovaná úroková sazba hypotéky. Běžné délky fixace: 1, 3, 5, 7, 10 let. Po skončení fixace banka nabídne novou sazbu. Klient může bez poplatku refinancovat u jiné banky.',
 ARRAY['fixace','období','sazba','délka','garantovaná'], true, 10),

('hypoteeka', 'faq', 'Co je refinancování?',
 'Refinancování je převod hypotéky k jiné bance za lepších podmínek. Po skončení fixace je refinancování bez poplatku. Při předčasném splacení během fixace se platí poplatek (max zákonný limit). Proces trvá 2-4 týdny.',
 ARRAY['refinancování','převod','banka','poplatek','předčasné'], true, 11),

('hypoteeka', 'faq', 'Co je předhypoteční úvěr?',
 'Předhypoteční úvěr je krátkodobý úvěr na překlenutí doby, než banka vyplatí hypotéku. Typicky na 1-2 roky s vyšší sazbou. Používá se při koupi z dražby, od developera nebo když nemovitost ještě není zkolaudovaná.',
 ARRAY['předhypoteční','úvěr','developer','dražba','krátkodobý'], true, 12),

('hypoteeka', 'faq', 'Jaké dokumenty potřebuji k hypotéce?',
 'K žádosti o hypotéku potřebujete: občanský průkaz, potvrzení o příjmu (3 výplatní pásky nebo 2 daňová přiznání pro OSVČ), kupní smlouvu nebo smlouvu o smlouvě budoucí, odhad nemovitosti (zajistí banka nebo odhadce).',
 ARRAY['dokumenty','doklady','příjem','výplatní','páska','osvč'], true, 13),

('hypoteeka', 'faq', 'Kolik vlastních zdrojů potřebuji?',
 'Minimálně 20 % ceny nemovitosti (LTV max 80 %). Pro žadatele do 36 let stačí 10 % (LTV max 90 %). Vlastní zdroje mohou být: úspory, dar od rodiny (darovací smlouva), prostředky ze stavebního spoření, prodej jiného majetku.',
 ARRAY['vlastní','zdroje','úspory','kolik','procent','dar'], true, 14);

-- ČNB pravidla: regulatorní limity
INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords, is_active, sort_order)
VALUES
('hypoteeka', 'cnb_rules', 'DSTI limit ČNB',
 'ČNB doporučuje, aby celkové měsíční splátky všech úvěrů nepřesáhly 45 % čistého měsíčního příjmu (DSTI). Banky mohou poskytnout maximálně 5 % objemu nových hypoték nad tento limit. Limit chrání dlužníky před předlužením.',
 ARRAY['dsti','limit','čnb','splátka','příjem','45'], true, 20),

('hypoteeka', 'cnb_rules', 'DTI limit ČNB',
 'Celkový dluh by neměl přesáhnout 9,5násobek ročního čistého příjmu (DTI). Banky mohou poskytnout maximálně 5 % objemu nových hypoték nad tento limit. Při ročním příjmu 600 000 Kč je maximální dluh 5 700 000 Kč.',
 ARRAY['dti','limit','čnb','dluh','roční','9,5'], true, 21),

('hypoteeka', 'cnb_rules', 'LTV limit ČNB',
 'Výše hypotéky nesmí přesáhnout 80 % hodnoty zastavené nemovitosti (LTV). Pro žadatele do 36 let na vlastní bydlení je limit 90 %. Banky mohou poskytnout maximálně 5 % objemu nových hypoték nad limit. Hodnota se určuje odhadem.',
 ARRAY['ltv','limit','čnb','hodnota','nemovitost','80','90'], true, 22);

-- Proces: kroky k hypotéce
INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords, is_active, sort_order)
VALUES
('hypoteeka', 'bank_process', 'Kroky k získání hypotéky',
 '1) Konzultace a prescoring (ověření bonity). 2) Výběr nemovitosti. 3) Podání žádosti s dokumenty. 4) Odhad nemovitosti. 5) Schválení bankou (2-4 týdny). 6) Podpis úvěrové smlouvy. 7) Čerpání úvěru. Celý proces trvá typicky 4-8 týdnů.',
 ARRAY['kroky','postup','proces','jak','začít','průběh'], true, 30),

('hypoteeka', 'bank_process', 'Co je prescoring?',
 'Prescoring je nezávazné předschválení hypotéky na základě příjmu a závazků. Banka potvrdí, na jakou částku klient dosáhne. Platí obvykle 3 měsíce. Je zdarma a bez závazku. Pomáhá při hledání nemovitosti - klient ví svůj rozpočet.',
 ARRAY['prescoring','předschválení','nezávazné','zdarma','rozpočet'], true, 31),

('hypoteeka', 'bank_process', 'Odhad nemovitosti',
 'Banka vyžaduje odhad od certifikovaného odhadce. Cena odhadu je 3 000-6 000 Kč. Některé banky odhad hradí nebo nabízejí online odhad zdarma. Odhad určuje maximální výši hypotéky - LTV se počítá z odhadní ceny, ne z kupní ceny.',
 ARRAY['odhad','odhadce','cena','hodnota','certifikovaný'], true, 32);

-- Objection handling: námitky klientů
INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords, is_active, sort_order)
VALUES
('hypoteeka', 'objection_handling', 'Klient chce počkat na nižší sazby',
 'Nikdo nedokáže spolehlivě předpovědět vývoj sazeb. Čekáním klient platí nájem a nebuduje vlastní majetek. Ceny nemovitostí mohou mezitím růst rychleji než případný pokles sazeb. Při budoucím poklesu sazeb lze hypotéku refinancovat za lepších podmínek.',
 ARRAY['čekat','sazby','pokles','kdy','budou','nižší','počkat'], true, 40),

('hypoteeka', 'objection_handling', 'Klient nemá dost vlastních zdrojů',
 'Možnosti jak získat vlastní zdroje: dar od rodiny (stačí darovací smlouva), prostředky ze stavebního spoření, prodej jiného majetku. Pro mladé do 36 let stačí 10 % (místo 20 %). Některé banky akceptují i zástavu jiné nemovitosti místo vlastních zdrojů.',
 ARRAY['málo','peněz','vlastní','zdroje','nemám','dar','spoření'], true, 41),

('hypoteeka', 'objection_handling', 'Klient se bojí ztráty zaměstnání',
 'Možnosti ochrany: pojištění schopnosti splácet (měsíční poplatek). Doporučená finanční rezerva 3-6 měsíčních splátek. Banka může nabídnout odklad splátek (až 3 měsíce). V krajním případě lze nemovitost prodat a splatit hypotéku.',
 ARRAY['ztráta','zaměstnání','práce','pojištění','splácet','bojím','strach'], true, 42);

-- Produkty: typy hypoték
INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords, is_active, sort_order)
VALUES
('hypoteeka', 'product', 'Typy hypoték',
 'Účelová hypotéka: na konkrétní nemovitost, nejnižší sazba. Neúčelová (americká) hypotéka: na cokoliv se zástavou nemovitosti, vyšší sazba o 1-2 %. Předhypoteční úvěr: na překlenutí doby před čerpáním. Kombinace se stavebním spořením: nižší celkové náklady.',
 ARRAY['typ','druh','účelová','americká','neúčelová','předhypoteční'], true, 50),

('hypoteeka', 'product', 'Stavební spoření a hypotéka',
 'Kombinace stavebního spoření s hypotékou snižuje celkové náklady. Úvěr ze stavebního spoření má typicky nižší sazbu (3-4 %). Naspořené prostředky lze použít jako vlastní zdroje. Státní podpora 2 000 Kč ročně (při spoření min. 20 000 Kč/rok). Vhodné pro dlouhodobé plánování.',
 ARRAY['stavební','spoření','kombinace','státní','podpora','úvěr'], true, 51);
