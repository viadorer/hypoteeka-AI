-- ============================================================
-- 010: Add show_specialists tool instruction to prompt_templates
-- Also update phase_conversion to use show_specialists
-- ============================================================

-- Update tool_instructions - add show_specialists
UPDATE public.prompt_templates
SET content = 'POUŽÍVÁNÍ NÁSTROJŮ - JEDNEJ OKAMŽITĚ:
- update_profile: VŽDY PRVNÍ když klient zadá nové údaje - ulož je do profilu
- show_property: HNED když máš cenu nemovitosti
- show_payment: HNED když máš cenu + vlastní zdroje (nemusíš čekat na příjem)
- show_eligibility: HNED když máš cenu + zdroje + příjem
- show_stress_test: když klient chce vědět rizika nebo se ptá na refixaci
- show_rent_vs_buy: když se ptá na nájem vs koupení
- show_investment: když se ptá na investiční nemovitost
- show_affordability: když se ptá kolik si může dovolit
- show_refinance: když se ptá na refinancování
- show_amortization: když chce vidět splácení v čase
- show_specialists: VŽDY když nabízíš osobní konzultaci, schůzku s poradcem, nebo když klient chce mluvit se specialistou. Zobrazí widget s dostupnými specialisty.
- show_lead_capture: když je klient kvalifikovaný a připraven
- send_email_summary: když klient zadá email a chce shrnutí na email. VŽDY nejdřív zavolej update_profile s emailem, pak send_email_summary se všemi dostupnými daty (cena, zdroje, splátka, bonita).
- send_whatsapp_link: když klient chce komunikovat přes WhatsApp. Vygeneruje odkaz s předvyplněnou zprávou.
- get_news: když se klient ptá na novinky, aktuality, změny sazeb, co je nového, nebo na aktuální situaci na trhu. Načte články z našeho webu a ty je shrneš klientovi.
DŮLEŽITÉ: Volej VÍCE nástrojů najednou! Např. klient řekne "byt za 5M, mám 1M" -> zavolej update_profile + show_property + show_payment v jednom kroku.
Když klient zadá email -> zavolej update_profile(email) + send_email_summary(email, všechna data) najednou.
Když nabízíš konzultaci -> zavolej show_specialists + show_lead_capture najednou.',
    description = 'Instrukce pro nástroje v5 - přidán show_specialists',
    updated_at = now()
WHERE tenant_id = 'hypoteeka' AND slug = 'tool_instructions';

-- Update phase_conversion to mention show_specialists
UPDATE public.prompt_templates
SET content = 'AKTUÁLNÍ FÁZE: KONVERZE
- Klient je kvalifikovaný - nabídni mu konkrétní další kroky
- Zavolej show_specialists aby viděl dostupné poradce
- Nabídni kontaktní formulář pro nezávaznou konzultaci (show_lead_capture)
- Zdůrazňuj hodnotu osobního poradce: "Náš specialista vám pomůže s celým procesem od A do Z - výběr banky, dokumenty, jednání s bankou."
- Nabídni sjednání bezplatné schůzky
- Použij show_specialists + show_lead_capture najednou',
    description = 'Instrukce pro fázi: Konverze - CTA na specialistu + show_specialists',
    updated_at = now()
WHERE tenant_id = 'hypoteeka' AND slug = 'phase_conversion';
