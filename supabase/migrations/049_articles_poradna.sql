-- ============================================================
-- 049: Tři články do poradny (/clanky)
-- ============================================================
-- Proč: schválený model počítá na homepage se sekcí „Nejde jen o výpočet"
-- se čtyřmi kartami — tři z nich vedou na články, které v tabulce news
-- neexistovaly (tabulka byla prázdná, viz 043_disable_stale_news).
-- Bez nich by karty odkazovaly do prázdna, takže se do produkce nasadily
-- jen dvě. Tyhle tři články ty karty zaplňují reálným obsahem.
--
-- Obsah drží stejná pravidla jako zbytek webu:
--   - žádná sazba konkrétní banky, žádné vymyšlené číslo bez zdroje
--   - DSTI/DTI jako orientační hranice bank, ne platný limit ČNB
--   - každý článek končí konkrétním dalším krokem (kalkulačka / Hugo)
--
-- POZOR: nespouštět tento soubor přímo — obsahuje "public." prefixy,
-- které patří do schématu "hypoteeka". Pusť vygenerovanou podobu z
-- db/ptf-setup/02_hypoteeka_schema.sql (viz generate.py).
-- ============================================================

INSERT INTO public.news (tenant_id, title, slug, summary, content, published, published_at)
VALUES
(
  'hypoteeka',
  'Jak dlouhou fixaci zvolit v roce 2026',
  'jak-dlouhou-fixaci-zvolit-2026',
  'Sazby letos rostou. Co to znamená pro volbu fixace a jak si spočítat, jestli krátkou fixaci unesete.',
  E'## Krátká, nebo dlouhá fixace?\n\nFixace je doba, po kterou vám banka garantuje úrokovou sazbu. Čím delší fixace, tím delší jistota — ale zpravidla i vyšší sazba. Rozhodnutí není o tom, která varianta je „lepší", ale o tom, jaké riziko unesete.\n\n## Proč se poučka „zafixuj na dlouho" letos nemusí vyplatit\n\nKlasické pravidlo říká: když jsou sazby nízko, zafixuj na co nejdéle. Jenže to platí ve chvíli, kdy je trh na dně. Pokud trh naopak čeká spíš pokles, dlouhá fixace znamená, že si dražší sazbu zamknete na řadu let dopředu.\n\nOrientační průměr sazeb pro nové hypotéky publikuje ČNB (ARAD) — aktuální číslo najdete v [průvodci sazbou](/nabidky). Jde ale o průměr za celý trh, ne o nabídku konkrétní banky; vaše sazba se bude lišit podle LTV, doložitelnosti příjmu i navázaných produktů.\n\n## Test, který si udělejte sami\n\nNež se pro krátkou fixaci rozhodnete, spočítejte si stress test: **kolik by dělala splátka, kdyby sazba při refixaci vzrostla o dva procentní body?**\n\n- Pokud se taková splátka do rozpočtu vejde, krátká fixace vám nechává otevřená vrátka.\n- Pokud ne, platíte si delší fixací jistotu — a to je legitimní důvod, ne prohra.\n\nSpočítat si to můžete v [kalkulačce](/kalkulacka) — stačí zkusit dvě různé sazby a porovnat splátku.\n\n## Na co se ptát u konkrétní nabídky\n\n1. Jaká je sazba pro jednotlivé délky fixace u téhle banky?\n2. Co všechno musím mít navázané (pojištění, aktivní účet), abych na sazbu dosáhl?\n3. Kolik stojí předčasné splacení mimo výročí fixace?\n4. Kdy přesně fixace končí a jak banka oznamuje novou sazbu?\n\n## Další krok\n\nSazbu z ceníku a sazbu, kterou nakonec dostanete, oddělují právě tyhle detaily. Pokud si chcete projít vlastní čísla, [napište Hugovi](/) — spočítá splátku i stress test a předá vás specialistovi, který porovná konkrétní nabídky bank.',
  true,
  now()
),
(
  'hypoteeka',
  'Nájem, nebo hypotéka? Počítáme poctivě',
  'najem-nebo-hypoteka',
  'Srovnání, které nepočítá jen splátku proti nájmu — ale i náklady vlastnictví, růst nájmů a cenu příležitosti.',
  E'## Proč „splátka vs. nájem" nestačí\n\nNejčastější srovnání zní: splátka hypotéky je 20 tisíc, nájem 18 tisíc, takže se koupě vyplatí. Jenže tohle srovnání je neúplné v obou směrech.\n\n## Co k hypotéce ještě patří\n\nK měsíční splátce připočtěte:\n\n- **pojištění nemovitosti** a často i pojištění schopnosti splácet,\n- **fond oprav / příspěvek na správu** u bytu,\n- **daň z nemovitosti**,\n- **rezervu na opravy** — u staršího bytu je to reálná položka, ne teorie,\n- **jednorázové náklady při koupi**: odhad, poplatky katastru, případně provize.\n\n## Co naopak mluví pro koupi\n\n- **Splátka je z velké části vaše.** Část splátky umořuje jistinu — po letech je z toho majetek, kdežto nájem je čistý náklad.\n- **Nájem roste, splátka během fixace ne.** Nájemné se v čase posouvá s trhem; splátka je po dobu fixace pevná.\n- **Vlastní bydlení je jistota.** Nemusíte řešit, že majitel vypoví smlouvu.\n\n## Co mluví pro nájem\n\n- **Flexibilita.** Když nevíte, kde budete za tři roky, hypotéka na 30 let je drahá vazba.\n- **Cena příležitosti.** Vlastní zdroje zamknuté v nemovitosti nemůžete investovat jinam.\n- **Žádná starost o opravy.** Prasklý bojler je problém majitele, ne váš.\n\n## Jak si to spočítat na svých číslech\n\nHugo umí obě strany srovnat — nájem proti splátce, včetně toho, kolik vlastního kapitálu vám po letech zůstane. Stačí mu říct cenu nemovitosti, vlastní zdroje a současný nájem: [otevřít konverzaci](/).\n\nPokud chcete nejdřív jen splátku, začněte [kalkulačkou](/kalkulacka).\n\n## A co když zvažujete prodej?\n\nDruhá strana téže otázky zní: vyplatí se byt prodat, nebo pronajímat? I na to se dá odpovědět čísly — orientační tržní cenu i obvyklou dobu prodeje vám Hugo zjistí, stačí adresa.',
  true,
  now()
),
(
  'hypoteeka',
  'Hypotéka pro OSVČ: jak banka vidí váš příjem',
  'hypoteka-pro-osvc',
  'Paušál, skutečné výdaje, s.r.o. — proč se u podnikatelů liší metodiky bank nejvíc z celého trhu a co si připravit.',
  E'## Podnikatel není horší žadatel. Jen jinak čitelný\n\nZaměstnanec doloží příjem výplatní páskou. U OSVČ banka vychází z daňového přiznání — a právě tady se metodiky bank rozcházejí nejvíc z celého trhu. Stejný podnikatel může mít u dvou bank výrazně jinou spočítanou bonitu.\n\n## Dva základní přístupy bank\n\n1. **Ze základu daně.** Banka bere daňový základ (příjmy dle § 7), obvykle za jedno až dvě uzavřená období, a z něj počítá měsíční příjem.\n2. **Procentem z obratu.** Banka vezme obrat a uzná z něj určitý podíl jako příjem. Pro podnikatele, kteří daňově optimalizují, bývá tahle cesta výhodnější.\n\nDvě daňová přiznání jsou u OSVČ standardní požadavek, ne překážka.\n\n## Paušální daň: pozor na doložitelnost\n\nV režimu paušální daně nepodáváte přiznání — banka tedy nevidí základ daně. Příjem se pak odvozuje z obratu, doloženého například fakturami nebo výpisy z účtu. Hypotéka možná je, ale výběr banky hraje větší roli než u zaměstnance.\n\n## Máte s.r.o.?\n\nU jednatele nebo majitele s.r.o. banky posuzují kombinaci: oficiální mzdu či odměnu jednatele, podíly na zisku a hospodářský výsledek firmy — typicky za dvě uzavřená období. Nízká mzda při ziskové firmě nemusí být problém; záleží na metodice konkrétní banky.\n\n## Co si připravit\n\n- daňová přiznání za poslední dvě období včetně potvrzení o podání,\n- přehledy pro ČSSZ a zdravotní pojišťovnu,\n- výpisy z podnikatelského účtu,\n- u s.r.o. účetní závěrky,\n- potvrzení o bezdlužnosti (finanční úřad, ČSSZ) — některé banky ho vyžadují.\n\n## Orientační propočet a další krok\n\nV [kalkulačce](/kalkulacka) si spočítáte splátku i orientační poměr splátky k příjmu. U OSVČ ale platí dvojnásob, že rozhoduje výběr banky — a to je přesně práce specialisty. [Napište Hugovi](/), projde s vámi čísla a předá vás poradci, který zná aktuální metodiky.',
  true,
  now()
)
ON CONFLICT (slug) DO UPDATE
SET title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    content = EXCLUDED.content,
    published = EXCLUDED.published,
    updated_at = now();
