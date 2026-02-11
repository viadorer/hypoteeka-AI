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
  'ČNB snížila základní sazbu na 3,75 %',
  'cnb-sazba-2025-02',
  'Česká národní banka snížila repo sazbu o 0,25 procentního bodu. Co to znamená pro hypotéky?',
  '## ČNB snížila základní sazbu na 3,75 %

Česká národní banka na svém posledním zasedání rozhodla o snížení repo sazby o 0,25 procentního bodu na **3,75 %**.

### Co to znamená pro hypotéky?

- **Nižší úrokové sazby** -- banky postupně snižují nabídkové sazby hypoték
- **Průměrná sazba** nové hypotéky klesla na přibližně 4,8 %
- **Dostupnost bydlení** se mírně zlepšuje

### Doporučení

Pokud zvažujete hypotéku, je vhodné:

1. Porovnat nabídky více bank
2. Zvážit delší fixaci (5 let) pro jistotu nízké sazby
3. Nechat si spočítat bonitu -- naše AI vám s tím pomůže

> Tip: Zadejte své parametry do naší kalkulačky a zjistěte, kolik můžete ušetřit.',
  true,
  '2025-02-05 10:00:00+01'
),
(
  'hypoteeka',
  'Nové limity ČNB pro rok 2025',
  'cnb-limity-2025',
  'Od ledna 2025 platí nové limity pro ukazatele LTV, DSTI a DTI. Shrnujeme změny.',
  '## Nové limity ČNB pro rok 2025

Od **1. ledna 2025** platí aktualizované limity České národní banky pro poskytovatele hypoték.

### Aktuální limity

| Ukazatel | Limit | Poznámka |
|----------|-------|----------|
| **LTV** | max 80 % | Pro osoby do 36 let až 90 % |
| **DSTI** | max 45 % | Poměr splátky k příjmu |
| **DTI** | max 8,5x | Poměr dluhu k ročnímu příjmu |

### Co to znamená v praxi?

- Při koupi bytu za **5 000 000 Kč** potřebujete minimálně **1 000 000 Kč** vlastních zdrojů
- Mladí do 36 let mohou mít vlastní zdroje pouze **500 000 Kč**
- Měsíční splátka nesmí přesáhnout **45 %** vašeho čistého příjmu

### Jak si ověřit bonitu?

Naše AI kalkulačka automaticky kontroluje všechny tři ukazatele. Stačí zadat cenu nemovitosti, vlastní zdroje a příjem.',
  true,
  '2025-01-15 09:00:00+01'
),
(
  'hypoteeka',
  'Hypoteeka AI -- nová funkce: srovnání nájmu a hypotéky',
  'nova-funkce-najem-vs-hypo',
  'Přidali jsme novou funkci pro srovnání měsíčních nákladů na nájem a hypotéku.',
  '## Nová funkce: Nájem vs. hypotéka

Přidali jsme do naší AI kalkulačky novou funkci -- **srovnání nájmu a hypotéky**.

### Jak to funguje?

1. Zadejte cenu nemovitosti a vaši aktuální výši nájmu
2. AI spočítá měsíční splátku hypotéky
3. Porovnáte celkové náklady za 30 let
4. Zjistíte, kdy se hypotéka začne vyplácet (break-even bod)

### Příklad

- Nájem: **18 500 Kč/měsíc**
- Splátka hypotéky: **16 974 Kč/měsíc**
- Úspora: **1 526 Kč měsíčně**
- Po 30 letech vlastníte nemovitost v hodnotě **4 750 000 Kč**

### Vyzkoušet

Stačí napsat do chatu například: *"Chci porovnat nájem 18 000 Kč s hypotékou na byt za 4,5 milionu"*',
  true,
  '2025-01-28 14:00:00+01'
)
ON CONFLICT (slug) DO NOTHING;
