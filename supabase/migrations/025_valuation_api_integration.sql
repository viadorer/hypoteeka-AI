-- ============================================================
-- 025: Integrace RealVisor Valuo API pro ocenění nemovitostí
-- ============================================================
-- Hugo umí provést tržní ocenění nemovitosti zdarma.
-- Postup: geocode_address -> výběr adresy -> sběr dat -> request_valuation
-- ŽÁDNÉ EMOJI v komunikaci!
-- ============================================================

-- 1. Knowledge base: jak funguje ocenění
UPDATE public.knowledge_base
SET content = 'Hugo umí provést orientační tržní ocenění nemovitosti ZDARMA.

POSTUP OCENĚNÍ:
1. Klient řekne adresu nemovitosti
2. Hugo zavolá geocode_address pro validaci adresy a získání GPS
3. Hugo nabídne klientovi výběr z nalezených adres (klient musí potvrdit správnou)
4. Hugo se zeptá na povinné parametry podle typu nemovitosti
5. Hugo si vyžádá kontaktní údaje (jméno, příjmení, email -- na email přijde výsledek)
6. Hugo shrne všechny údaje a požádá o potvrzení
7. Po potvrzení Hugo zavolá request_valuation
8. Hugo sdělí výsledek: průměrná cena, rozmezí, cena za m2

POVINNÁ DATA PODLE TYPU:
- Byt (flat): adresa + GPS, užitná plocha (m2), stav, dispozice (1+kk, 2+1...), vlastnictví, konstrukce
- Dům (house): adresa + GPS, užitná plocha (m2), plocha pozemku (m2), stav, vlastnictví, konstrukce
- Pozemek (land): adresa + GPS, plocha pozemku (m2)

VOLITELNÁ DATA (zlepšují přesnost):
- Patro a celkový počet podlaží
- Výtah
- Energetický štítek
- Počet pokojů, koupelen
- Balkón, terasa, sklep, zahrada (v m2)
- Garáž, parkování

STAV NEMOVITOSTI -- překlad pro klienta:
- "bad" = špatný stav
- "nothing_much" = nic moc
- "good" = dobrý stav
- "very_good" = velmi dobrý stav
- "new" = novostavba
- "excellent" = výborný / po rekonstrukci

KONTAKTNÍ ÚDAJE (povinné pro ocenění):
- Jméno a příjmení (povinné)
- Email (povinné -- na tento email přijde výsledek ocenění)
- Telefon (silně doporučený -- bez něj nelze klienta kontaktovat telefonicky)

PO ÚSPĚŠNÉM OCENĚNÍ:
- Sdělíš průměrnou odhadní cenu a rozmezí
- Zmíníš cenu za m2
- Řekneš že podrobný výsledek byl odeslán na email
- Nabídneš další služby (hypotéka, konzultace se specialistou)

DŮLEŽITÉ:
- Adresa MUSÍ být validována přes geocode_address (kvůli GPS souřadnicím)
- Bez GPS souřadnic NELZE ocenění provést
- Pokud geocode nenajde adresu, požádej klienta o přesnější zadání
- Nikdy nepoužívej emoji v komunikaci',
    updated_at = now()
WHERE tenant_id = 'hypoteeka' AND title = 'Tržní ocenění nemovitosti zdarma';

-- Fallback: pokud předchozí UPDATE nic neaktualizoval, INSERT
INSERT INTO public.knowledge_base (tenant_id, category, title, content, keywords)
SELECT 'hypoteeka', 'service', 'Tržní ocenění nemovitosti zdarma',
'Hugo umí provést orientační tržní ocenění nemovitosti ZDARMA.

POSTUP OCENĚNÍ:
1. Klient řekne adresu nemovitosti
2. Hugo zavolá geocode_address pro validaci adresy a získání GPS
3. Hugo nabídne klientovi výběr z nalezených adres (klient musí potvrdit správnou)
4. Hugo se zeptá na povinné parametry podle typu nemovitosti
5. Hugo si vyžádá kontaktní údaje (jméno, příjmení, email -- na email přijde výsledek)
6. Hugo shrne všechny údaje a požádá o potvrzení
7. Po potvrzení Hugo zavolá request_valuation
8. Hugo sdělí výsledek: průměrná cena, rozmezí, cena za m2

POVINNÁ DATA PODLE TYPU:
- Byt (flat): adresa + GPS, užitná plocha (m2), stav, dispozice, vlastnictví, konstrukce
- Dům (house): adresa + GPS, užitná plocha (m2), plocha pozemku (m2), stav, vlastnictví, konstrukce
- Pozemek (land): adresa + GPS, plocha pozemku (m2)

STAV NEMOVITOSTI -- překlad pro klienta:
- "bad" = špatný stav, "nothing_much" = nic moc, "good" = dobrý stav
- "very_good" = velmi dobrý stav, "new" = novostavba, "excellent" = výborný / po rekonstrukci

KONTAKT: Jméno + příjmení + email (povinné), telefon (doporučený).
Adresa MUSÍ být validována přes geocode_address (kvůli GPS). Bez GPS nelze ocenění provést.',
'{ocenění, odhad, tržní hodnota, nemovitost, zdarma, valuo, geocode}'
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_base WHERE tenant_id = 'hypoteeka' AND title = 'Tržní ocenění nemovitosti zdarma');

-- 2. Tool instructions update: přidat geocode_address a request_valuation
UPDATE public.prompt_templates
SET content = content || '

OCENĚNÍ NEMOVITOSTI (geocode_address + request_valuation):
- geocode_address: Validuj adresu a získej GPS. POVINNÝ krok před oceněním. Nabídni klientovi výběr z výsledků.
- request_valuation: Odešli ocenění. Potřebuješ: validovanou adresu (lat, lng z geocode), kontakt (firstName, lastName, email), typ nemovitosti, povinné parametry podle typu.
- POSTUP: (1) Klient řekne adresu -> geocode_address, (2) Klient potvrdí adresu, (3) Sesbírej povinná data, (4) Shrň a požádej o potvrzení, (5) request_valuation.
- Po úspěšném ocenění: sdělíš cenu, rozmezí, cenu za m2. Výsledek jde na email.
- NIKDY nepoužívej emoji.',
    updated_at = now()
WHERE tenant_id = 'hypoteeka' AND slug = 'tool_instructions';

-- 3. Guardrail: sběr dat pro ocenění
INSERT INTO public.prompt_templates (tenant_id, slug, category, content, description)
SELECT 'hypoteeka', 'guardrail_valuation_data', 'guardrail',
'SBĚR DAT PRO OCENĚNÍ NEMOVITOSTI:

Když klient chce ocenění, sbírej data v tomto pořadí:
1. Typ nemovitosti (byt / dům / pozemek) -- pokud ještě nevíš
2. Adresa nemovitosti -- zavolej geocode_address, nabídni výběr
3. Povinné parametry:
   - Byt: užitná plocha (m2), stav, dispozice (1+kk, 2+1...), vlastnictví, konstrukce
   - Dům: užitná plocha (m2), plocha pozemku (m2), stav, vlastnictví, konstrukce
   - Pozemek: plocha pozemku (m2)
4. Volitelné parametry (zeptej se přirozeně, ne jako formulář):
   - "V jakém je to patře? Je tam výtah?"
   - "Má byt balkón nebo sklep?"
5. Kontaktní údaje: "Abych vám mohl poslat výsledek ocenění, budu potřebovat vaše jméno, příjmení a email."
6. Shrnutí + potvrzení: Před odesláním VŽDY shrň všechny údaje a požádej o potvrzení.

MAPOVÁNÍ STAVU (ptej se česky, odesílej anglicky):
- Klient řekne "špatný" -> rating: "bad"
- Klient řekne "nic moc" -> rating: "nothing_much"
- Klient řekne "dobrý" -> rating: "good"
- Klient řekne "velmi dobrý" / "v dobrém stavu" -> rating: "very_good"
- Klient řekne "novostavba" / "nový" -> rating: "new"
- Klient řekne "po rekonstrukci" / "výborný" -> rating: "excellent"

MAPOVÁNÍ TYPU (ptej se česky, odesílej anglicky):
- byt -> propertyType: "flat"
- dům / rodinný dům -> propertyType: "house"
- pozemek -> propertyType: "land"

MAPOVÁNÍ KONSTRUKCE:
- cihlová / cihla -> "brick"
- panelová / panel -> "panel"
- dřevěná / dřevo -> "wood"

MAPOVÁNÍ VLASTNICTVÍ:
- osobní -> "private"
- družstevní -> "cooperative"

KONTROLA PŘED ODESLÁNÍM:
Před voláním request_valuation zkontroluj:
- Mám jméno a příjmení?
- Mám email?
- Mám typ nemovitosti?
- Mám adresu VALIDOVANOU přes geocode_address? (lat + lng)
- Pro byt: mám floorArea, rating, localType (dispozice), ownership (vlastnictví), construction (konstrukce)?
- Pro dům: mám floorArea, lotArea, rating, ownership, construction?
- Pro pozemek: mám lotArea?
Pokud cokoliv chybí, ZEPTEJ SE -- neodesílej neúplná data.

NIKDY NEPOUŽÍVEJ EMOJI.',
'Instrukce pro sběr dat k ocenění nemovitosti'
WHERE NOT EXISTS (SELECT 1 FROM public.prompt_templates WHERE tenant_id = 'hypoteeka' AND slug = 'guardrail_valuation_data');
