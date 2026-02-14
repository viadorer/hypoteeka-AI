-- ============================================================
-- 019: Proaktivní insights po výpočtech + persona knowledge
-- ============================================================
-- Hugo po každém widgetu přidá překvapivý fakt nebo tip.
-- Knowledge base entries s kategorií 'insight' matchované na widgety.
-- ============================================================

-- Insights po show_payment
INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords) VALUES
('hypoteeka', 'faq', 'Insight: Splátka vs nájem',
'Po výpočtu splátky porovnej s průměrným nájmem v dané lokalitě. V Praze je průměrný nájem 2+kk kolem 22 000 Kč, v Brně 16 000 Kč. Pokud je splátka blízko nájmu, zdůrazni: "Vaše splátka je srovnatelná s nájmem -- s tím rozdílem, že si budujete vlastní majetek."',
'{splátka, nájem, porovnání, insight}'),

('hypoteeka', 'faq', 'Insight: Úspora s poradcem',
'Po výpočtu splátky zmíň: "V praxi se zkušený poradce dokáže dostat i pod nejnižší uvedenou sazbu. Rozdíl 0,3 % na sazbě znamená úsporu desítek tisíc za celou dobu splácení." Průměrná úspora našich klientů je 164 000 Kč.',
'{splátka, sazba, úspora, poradce, insight}'),

('hypoteeka', 'faq', 'Insight: Fixace a timing',
'Po výpočtu splátky tip o fixaci: "Délka fixace je často důležitější než samotná sazba. Kratší fixace (3 roky) má nižší sazbu, ale vyšší riziko. Delší fixace (5-7 let) dává jistotu. Poradce vám pomůže vybrat optimální délku podle vaší situace."',
'{fixace, sazba, riziko, tip, insight}');

-- Insights po show_eligibility
INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords) VALUES
('hypoteeka', 'faq', 'Insight: Výjimka pro mladé do 36 let',
'Pokud je klient mladý (do 36 let), zdůrazni výjimku: "Víte, že jako žadatel do 36 let máte nárok na výjimku? Stačí vám jen 10 % vlastních zdrojů místo standardních 20 %. To je rozdíl stovek tisíc korun."',
'{mladí, 36, ltv, výjimka, bonita, insight}'),

('hypoteeka', 'faq', 'Insight: Spolužadatel zvyšuje šance',
'Pokud klient nesplňuje DSTI nebo DTI: "Přidání spolužadatele (partner, rodič) může výrazně zvýšit vaše šance. Banky počítají s příjmem obou žadatelů, ale splátku platíte společně."',
'{spolužadatel, bonita, dsti, příjem, insight}'),

('hypoteeka', 'faq', 'Insight: Rezerva v bonitě',
'Pokud klient splňuje bonitu s rezervou: "Skvělá zpráva -- máte ještě rezervu v bonitě. To znamená, že byste si mohli dovolit i o něco dražší nemovitost, nebo kratší splatnost s vyšší splátkou a nižšími celkovými úroky."',
'{bonita, rezerva, dražší, splatnost, insight}');

-- Insights po show_stress_test
INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords) VALUES
('hypoteeka', 'faq', 'Insight: Fixace jako pojistka',
'Po stress testu: "Správná délka fixace je vaše pojistka proti růstu sazeb. Při 5leté fixaci máte garantovanou splátku po celou dobu -- i kdyby sazby vzrostly o 2 %. Po skončení fixace lze vždy refinancovat."',
'{stress test, fixace, pojistka, sazba, insight}');

-- Insights po show_refinance
INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords) VALUES
('hypoteeka', 'faq', 'Insight: Timing refinancování',
'Po výpočtu refinancování: "Ideální čas na refinancování je 3-6 měsíců před koncem fixace. Banky vám mohou nabídnout předschválení už teď, abyste měli jistotu. Náš poradce vám pomůže s celým procesem -- od srovnání nabídek po podpis."',
'{refinancování, fixace, timing, předschválení, insight}');

-- Insights po show_investment
INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords) VALUES
('hypoteeka', 'faq', 'Insight: Investiční hypotéka podmínky',
'Po investiční analýze: "U investičních hypoték banky často vyžadují vyšší vlastní zdroje (30-40 %) a sazba bývá o 0,3-0,5 % vyšší. Ale pokud máte stabilní nájemníky, banky počítají i s příjmem z pronájmu do bonity."',
'{investice, hypotéka, pronájem, bonita, insight}');

-- Persona-specific knowledge
INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords) VALUES
('hypoteeka', 'faq', 'Prvokupující: Jak funguje hypotéka',
'Pro prvokupující vysvětli jednoduše: Hypotéka = banka vám půjčí peníze na byt/dům. Vy splácíte měsíčně po dobu 20-30 let. Sazba určuje kolik zaplatíte navíc (úroky). Fixace = období kdy se sazba nemění. Po fixaci se sazba přepočítá podle aktuálního trhu.',
'{prvokupující, jak funguje, hypotéka, základy, edukace}'),

('hypoteeka', 'faq', 'Prvokupující: Co potřebujete na začátek',
'Pro prvokupující: Na začátek potřebujete minimálně 20 % z ceny nemovitosti (10 % pokud jste do 36 let). Navíc počítejte s dalšími náklady: daň z nabytí (4 %), poplatky bance (cca 0,5 %), odhad nemovitosti (3-5 tisíc), právní služby. Celkem připravte asi 25 % z ceny.',
'{prvokupující, vlastní zdroje, náklady, daň, poplatky, edukace}');
