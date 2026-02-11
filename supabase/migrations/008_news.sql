-- Migration 008: News / Aktuality
-- Articles displayed in the Novinky tab, content in Markdown

CREATE TABLE IF NOT EXISTS public.news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) DEFAULT 'hypoteeka',
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    summary TEXT,
    content TEXT NOT NULL,
    published BOOLEAN DEFAULT true,
    published_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_tenant ON public.news(tenant_id);
CREATE INDEX IF NOT EXISTS idx_news_published ON public.news(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_slug ON public.news(slug);

-- Seed: sample news articles
INSERT INTO public.news (tenant_id, title, slug, summary, content, published, published_at) VALUES
(
  'hypoteeka',
  'CNB snizila zakladni sazbu na 3,75 %',
  'cnb-sazba-2025-02',
  'Ceska narodni banka snizila repo sazbu o 0,25 procentniho bodu. Co to znamena pro hypoteky?',
  '## CNB snizila zakladni sazbu na 3,75 %

Ceska narodni banka na svem poslednim zasedani rozhodla o snizeni repo sazby o 0,25 procentniho bodu na **3,75 %**.

### Co to znamena pro hypoteky?

- **Nizsi urokove sazby** -- banky postupne snizuji nabidkove sazby hypotek
- **Prumerna sazba** nove hypoteky klesla na priblizne 4,8 %
- **Dostupnost bydleni** se mirne zlepsuje

### Doporuceni

Pokud zvazujete hypoteku, je vhodne:

1. Porovnat nabidky vice bank
2. Zvazit delsi fixaci (5 let) pro jistotu nizke sazby
3. Nechat si spocitat bonitu -- nase AI vam s tim pomuze

> Tip: Zadejte sve parametry do nasi kalkulacky a zjistete, kolik muzete usetrit.',
  true,
  '2025-02-05 10:00:00+01'
),
(
  'hypoteeka',
  'Nove limity CNB pro rok 2025',
  'cnb-limity-2025',
  'Od ledna 2025 plati nove limity pro ukazatele LTV, DSTI a DTI. Shrnujeme zmeny.',
  '## Nove limity CNB pro rok 2025

Od **1. ledna 2025** plati aktualizovane limity Ceske narodni banky pro poskytovatele hypotek.

### Aktualni limity

| Ukazatel | Limit | Poznamka |
|----------|-------|----------|
| **LTV** | max 80 % | Pro osoby do 36 let az 90 % |
| **DSTI** | max 45 % | Pomer splatky k prijmu |
| **DTI** | max 8,5x | Pomer dluhu k rocnimu prijmu |

### Co to znamena v praxi?

- Pri koupi bytu za **5 000 000 Kc** potrebujete minimalne **1 000 000 Kc** vlastnich zdroju
- Mladi do 36 let mohou mit vlastni zdroje pouze **500 000 Kc**
- Mesicni splatka nesmi presahnout **45 %** vaseho cisteho prijmu

### Jak si overit bonitu?

Nase AI kalkulacka automaticky kontroluje vsechny tri ukazatele. Staci zadat cenu nemovitosti, vlastni zdroje a prijem.',
  true,
  '2025-01-15 09:00:00+01'
),
(
  'hypoteeka',
  'Hypoteeka AI -- nova funkce: srovnani najmu a hypoteky',
  'nova-funkce-najem-vs-hypo',
  'Pridali jsme novou funkci pro srovnani mesicnich nakladu na najem a hypoteku.',
  '## Nova funkce: Najem vs. hypoteka

Pridali jsme do nasi AI kalkulacky novou funkci -- **srovnani najmu a hypoteky**.

### Jak to funguje?

1. Zadejte cenu nemovitosti a vasi aktualni vysi najmu
2. AI spocita mesicni splatku hypoteky
3. Porovnate celkove naklady za 30 let
4. Zjistite, kdy se hypoteka zacne vyplacet (break-even bod)

### Priklad

- Najem: **18 500 Kc/mesic**
- Splatka hypoteky: **16 974 Kc/mesic**
- Uspora: **1 526 Kc mesicne**
- Po 30 letech vlastnite nemovitost v hodnote **4 750 000 Kc**

### Vyzkouset

Staci napsat do chatu napriklad: *"Chci porovnat najem 18 000 Kc s hypotekou na byt za 4,5 milionu"*',
  true,
  '2025-01-28 14:00:00+01'
)
ON CONFLICT (slug) DO NOTHING;
