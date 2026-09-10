# Hypoteeka AI — kontext projektu pro vývoj

Předání z analytické session (31. 8. 2026). Zdroj: revize běžícího webu hypoteeka.cz
+ strategické rozhodnutí majitele. Určeno pro coding agenta i člověka.

---

## 1. Stav a rozhodnutí, která platí

| | |
|---|---|
| **Stav projektu** | Dev mód, systém se teprve připravuje. Není spuštěný. |
| **Backend** | Supabase zapauzovaný. Aplikace běží na JSON fallbacku. |
| **Provozovatel** | QUADRUM s.r.o. (Plzeň, Praha). Poradci = vázaní zástupci SAB servis s.r.o., IČO 24704008. |
| **Cíl majitele na 12 měsíců** | Zakázky na prodej nemovitostí (realitní provize). Ne prodejné softwarové aktivum, ne příjem z kurzů. |
| **Kapacita** | Sólo. Bez týmu. |
| **Role hypoteeky v této strategii** | Vedlejší. Hypoteční klient je kupující, cíl jsou prodávající. Projekt se nerozvíjí do šířky — dokončuje se jen to, co je uvedené níže, a vytahují se z něj znovupoužitelné části. |

> **Praktický důsledek pro vývoj:** nepřidávat funkce. Práce na tomto repu má tři
> legitimní důvody — (a) odstranit veřejné riziko, (b) zachránit data,
> (c) vytáhnout komponenty k použití jinde. Cokoli jiného je odbočka od cíle.

---

## 2. Urgentní — udělat jako první

### 2.1 Dev mód není privátní

Web běží na veřejné doméně a je plně indexovatelný:

```
robots.txt      Allow: /        (Disallow jen /api/ a /auth/)
sitemap.xml     5 URL, připravená k odeslání
<title>         produkční titulky a popisky na všech stránkách
```

Veřejně dostupná je i stránka `/nabidky` s vymyšlenými sazbami jmenovaných bank (viz 3.1).
Rozestavěný projekt, ke kterému se dostane Google, je publikované tvrzení.

- Zapnout Password Protection (Vercel) na celý deployment, nebo minimálně:
- `robots.txt` → `Disallow: /`, meta `noindex, nofollow` globálně
- Odstranit / odpojit routu `/nabidky`
- `sitemap.xml` negenerovat, dokud projekt neběží ostře

### 2.2 Záchrana dat ze Supabase

Zapauzovaný projekt na free tieru není trvalé úložiště.

- Obnovit projekt, `pg_dump` (nebo export z dashboardu), uložit mimo Supabase
- Exportovat i `auth.users`, pokud se Auth používal
- Zdokumentovat schéma do repa (`docs/schema.sql`), aby přežilo i smazání projektu

### 2.3 JSON fallback — pravděpodobná ztráta leadů

Konzole na produkci hlásí:

```
[warn] [Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY
       — falling back to JSON storage
```

Na serverless hostingu zápisy do FS nepřežijí konec požadavku → leady z doby pauzy
s vysokou pravděpodobností neexistují.

- Ověřit, kam fallback zapisuje a jestli tam něco je
- Fallback nahradit tvrdým selháním s viditelnou chybou, ne tichým zápisem do souboru
- Warning nesmí prosakovat do klientské konzole (prozrazuje stack i stav konfigurace)

---

## 3. Věcné chyby v obsahu — kód je generuje, musí se opravit u zdroje

### 3.1 `/nabidky` — sazby bank jsou dopočítané, ne zjištěné

Zobrazované hodnoty tvoří přesnou aritmetickou řadu kolem průměru ČNB ARAD (4,73 %):

```
Fio banka          4,33 %   (-0,40)   "TOP SAZBA" + "Hugo doporučuje"
Hypoteční banka    4,53 %   (-0,20)   "RYCHLÉ SCHVÁLENÍ"
Komerční banka     4,73 %   ( 0,00)   "NÍZKÉ POPLATKY"
mBank              4,93 %   (+0,20)   "ŠIROKÁ NABÍDKA"
Moneta Money Bank  5,13 %   (+0,40)   "RYCHLÉ SCHVÁLENÍ"
```

Žádná z nich nepochází od banky. Odznaky o poplatcích a rychlosti schválení se neopírají
o nic. Riziko: klamavá obchodní praktika (§ 4–5 z. 634/1992 Sb.), § 92 z. 257/2016 Sb.
(reklama s číselným údajem vyžaduje reprezentativní příklad), plus riziko pro SAB servis
pod dohledem ČNB a pro jmenované banky.

> **Pravidlo do budoucna:** název konkrétní banky se smí objevit jen vedle čísla, které
> z té banky prokazatelně pochází, s datem a zdrojem. Jinak se banky nejmenují a mluví
> se o „orientačním pásmu trhu podle ČNB ARAD".

**Ověření v kódu (doplněno 31. 8. 2026, potvrzuje a rozšiřuje výše uvedené):**

Sazby vznikají jako `repo sazba ČNB + spread`, kde spready jsou ručně zadaná čísla
v tabulce `bank_spreads` — pravidelná řada s krokem 0,10, viz `supabase/seed_full.sql`.
Navíc je tam řádek:

```sql
('hypoteeka', 'Hypoteeka (naše)', 0.29, 0.49, 0.89, TRUE, 0)
```

Tj. systém tvrdí, že „naše" sazba je systematicky nejnižší na trhu (spread 0,49 proti
nejlepší bance 0,89). To je vymyšlené konkurenční tvrzení o vlastní službě —
riziko podle § 4–5 z. 634/1992 Sb. je tím vyšší, ne nižší.

### 3.2 Limity ČNB jsou neaktuální

| Ukazatel | Kód tvrdí | Skutečnost k 8/2026 |
|---|---|---|
| LTV | limit 80 % / 90 % | Platí, závazný |
| DSTI | limit 45 % | **Deaktivován** (od 1. 7. 2023) |
| DTI | 9,5× (kalkulačka) / 8,5× (článek) | **Deaktivován** (od 1. 1. 2024) |

Navíc chybí platná novinka: od 1. 4. 2026 doporučuje ČNB pro hypotéky na třetí a další
obytnou nemovitost a na nemovitosti k pronájmu **LTV 70 % a DTI 7**.

- Limity vytáhnout do jednoho konfiguračního zdroje (`lib/cnb-limits.ts`), ne duplikovat
  mezi kalkulačkou a články
- Každý limit označit příznakem `active: boolean` a datem účinnosti
- DSTI/DTI zobrazovat jako „orientační hranice bank — regulatorní limit ČNB neaktivní"
- Rozlišit vlastní bydlení vs. investiční nemovitost
- Text Huga „Splňujete všechny limity ČNB" přeformulovat — je to tvrzení o regulaci,
  které neplatí

### 3.3 RPSN nesedí

```
Vstup      4 000 000 Kč · 4,73 % p.a. · 30 let
Kód vrací  splátka 20 818 Kč · úroky 3 494 372 Kč   ✓ přepočítáno, přesné
Kód vrací  RPSN 5,074 %
Kontrola   RPSN ze samotné sazby bez poplatků = 4,834 %
           rozdíl implikuje ~104 000 Kč nezveřejněných poplatků
```

RPSN je definovaný pojem podle z. 257/2016 Sb.

- **Doporučení: RPSN z kalkulačky odstranit.** Patří na skutečnou nabídku, ne na odhad.
- Pokud zůstane, musí vedle něj být rozpad vstupujících položek

### 3.4 ARAD sazba je označená dnešním datem

`Aktuální sazba 4.73% (5-letá fixace, ČNB ARAD · 2026-08-31)` — ARAD publikuje s odstupem.
Uvádět referenční období („průměr za červenec 2026"), ne den stažení.

---

## 4. Pravidla pro veškerý výstup do UI

### 4.1 České formátování čísel — teď je nekonzistentní

Na jedné obrazovce se míchá tečka a čárka:

```
špatně   4.73%      5.074%     5.6×      2026-08-31
správně  4,73 %     5,074 %    5,6×      31. 8. 2026
```

- Desetinná čárka vždy
- Před `%` nezlomitelná mezera
- Tisíce dělit nezlomitelnou mezerou (`4 000 000 Kč`)
- Datum česky, ISO jen v API a v `datetime` atributech
- Zavést jeden formátovací helper (`lib/format.ts`: `fmtPct`, `fmtCzk`, `fmtDate`)
  a zakázat ruční skládání čísel do stringů

### 4.2 Právní formulace

```
špatně   dle § 257/2016 Sb.
správně  dle zákona č. 257/2016 Sb.
```

Vyskytuje se 2× (kalkulačka, srovnání bank), pokaždé v právní větě.

### 4.3 Překlep

`Vyše úvěru` → `Výše úvěru` — kalkulačka, hlavní blok výsledku.

### 4.4 Falešná přesnost

`Celkem na úrocích 3 494 372 Kč` u výpočtu označeného jako orientační.
Zaokrouhlovat na desetitisíce.

---

## 5. UX a frontend

- **Číselná pole ke všem posuvníkům.** Cena, vlastní zdroje i příjem jdou dnes zadat jen
  tažením. Kliknutí do lišty hodnotu skokem přepíše (test: 60 000 → 161 000 Kč jediným
  kliknutím). Slider + number input, obousměrně svázané.
- **Ikonový font.** Než dojede Material Symbols, vykreslují se doslova názvy ligatur:
  `smart_toy`, `arrow_forward`, `bolt`, `account_balance`, `grade`. V logu se opakovaně
  objevil jen červený čtverec bez ikony. Nahradit používané ikony inline SVG, nebo font
  preloadovat a do načtení skrýt.
- **Cookie lišta** překrývá hlavní CTA na desktopu i mobilu (a v kalkulačce výsledkovou
  kartu). Přepnout na spodní pruh, který nic nepřekrývá.
- **Hero obrázek** se při opakovaném načtení někdy nevykreslil. Prověřit lazy-loading
  a rozměry.
- **CTA „Mám zájem"** u karty banky slibuje kontakt s tou bankou. Pokud vede do obecného
  formuláře, přejmenovat („Chci nabídku na míru").

---

## 6. Souhlas s cookies — nevyhovující

Analytické cookies (GA4) jsou předzaškrtnuté → není to souhlas
(GDPR + § 89 z. 127/2005 Sb.). Chybí rovnocenné „Odmítnout vše"; `×` zavře banner bez volby.

- Nic kromě nutných není zaškrtnuté
- Tři vizuálně rovnocenná tlačítka: Přijmout vše / Odmítnout vše / Nastavení
- `×` se chová jako odmítnutí
- Žádný analytický skript se nesmí načíst před souhlasem

---

## 7. Podmínky a GDPR — doplnit

- IČO správce (QUADRUM s.r.o.) a spisová značka
- Kontaktní bod pro uplatnění práv subjektu
- Retence: „zpravidla 10 let od posledního kontaktu" je dlouhá a nezdůvodněná
- Google Analytics jako příjemce údajů + režim předání mimo EU
- Odstavec o chatbotu: co se děje s přepisem konverzace, jak dlouho se drží, jestli do něj
  vstupují osobní údaje
- Sjednotit adresy — pražská adresa v podmínkách (Pod turnovskou tratí 182/18) neodpovídá
  patičce

---

## 8. Ověřitelnost tvrzení na webu

Bez zdroje jsou dnes uvedeny: `1 000+ spokojených klientů`, `4,9 hodnocení klientů`,
`100 % certifikovaní poradci`, `8+ partnerských bank` (srovnání ukazuje 5), a tři recenze
s iniciálami, městy a konkrétními částkami („ušetřila přes 200 tisíc", „sazba klesla
o 1,5 %").

- Doložit (napojení na Google recenze s odkazem na profil), nebo nahradit tvrzeními,
  která obstojí: roky praxe, počet zprostředkovaných úvěrů, registrace v seznamu ČNB
- Sjednotit „8+ bank" se skutečným počtem

---

## 9. Persona „Hugo" — změna zadání

Sekce „Seznamte se s Hugem" je dnes ilustrovaná portrétem usmívajícího se muže (zjevně
generovaným). Vedle běží „Hugo je online".

> **Nové pravidlo:** Hugo zůstává jednoznačně strojem — ikona nebo ilustrace, nic
> antropomorfního. Fotografie člověka na webu patří výhradně skutečnému poradci
> (David Choc), se jménem a odkazem do seznamu ČNB (JERRS).

Důvod není jen etický: strategie osobní značky majitele stojí na tom, že vidět má být
on osobně a nikdo jiný.

---

## 10. Co z projektu vytáhnout jako znovupoužitelné

Toto je hlavní důvod, proč se do repa ještě sahá. Cíl: vytáhnout jako samostatné,
odtestované moduly použitelné v dalších projektech (Výcvik, odhad.online).

| Komponenta | Kam patří dál | Poznámka |
|---|---|---|
| Anuitní kalkulačka + LTV/DSTI/DTI | Výcvik (interaktivní nástroje), odhad.online | Matematika je ověřeně správná — splátka i úroky sedí do koruny. Nejcennější díl. |
| Srovnání nájem vs. hypotéka | Obsah na sítě, odhad.online | Otočit na prodávajícího: „Vyplatí se byt prodat, nebo pronajmout?" |
| Ingest ČNB ARAD | Sdílená datová vrstva napříč projekty | Označovat referenčním obdobím, ne dnem stažení. |
| UX chatu (pill quick replies, typing indicator, dark minimal) | odhad.online — konverzační sběr místo formuláře | Bez antropomorfní persony. |
| Právní blok SAB servis | Jakákoli finanční stránka | Text je napsaný správně, jen opravit „§" → „zákona č.". |

**Neodnáší se:** značka Hypoteeka, persona Huga, stránka se srovnáním bank.

---

## 11. Co ověřeně funguje — nerozbít při opravách

- Anuitní matematika je přesná (4 000 000 Kč / 4,73 % / 30 let → 20 817,70 Kč,
  úroky 3 494 372 Kč)
- LTV, DSTI i DTI se počítají správně — chybné jsou jen limity, se kterými se porovnávají
- Právní patička o vázaném zástupci a odkaz na JERRS jsou přítomné a správně formulované
- Průchod bez registrace: kalkulačka → výsledek → poradce
- Mobilní layout na 375 px drží, nic nepřetéká, stránky naskakují rychle

---

## 12. Definition of done pro tento repo

Projekt je „hotový do zmrazení", když:

1. Web není veřejně dostupný ani indexovatelný
2. Data ze Supabase jsou vyexportovaná mimo Supabase a schéma je v repu
3. Žádná stránka netvrdí nic o konkrétních bankách ani o limitech, co neplatí
4. Pět komponent z bodu 10 je vytažených jako samostatné moduly s testy

**Cokoli nad rámec těchto čtyř bodů se nedělá, dokud se nezmění strategické zadání
z bodu 1.**
