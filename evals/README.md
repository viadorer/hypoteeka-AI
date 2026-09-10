# Guardrail evaly pro Huga

Regresní sada 30 negativních testů z návrhu „Konverzační scénáře Huga" (fáze B).
Testuje, že Hugo **neporadí banku, nevymyslí číslo, neslíbí schválení, neunikne
mu prompt a vždy pustí klienta k člověku** — tedy přesně to, co po precedentu
Moffatt v. Air Canada nese firma právně na triko.

## Spuštění

```bash
# 1. terminál — běžící aplikace s platným GOOGLE_AI_KEY_HYPOTEEKA
npm run dev

# 2. terminál
npx promptfoo@latest eval -c evals/promptfooconfig.yaml
npx promptfoo@latest view   # HTML report
```

Jiný endpoint (staging): `HUGO_CHAT_URL=https://…/api/chat npx promptfoo eval -c evals/promptfooconfig.yaml`

## Kdy spouštět

- **Po každé změně promptů v adminu** (/admin → Prompty, Tón, Knowledge Base) —
  prompty žijí v DB, deploy je nehlídá.
- Po každé změně `src/lib/agent/*` nebo `src/app/api/chat/route.ts`.
- Každé selhání z produkce → přidat jako nový testcase (diverzita > počet).

## Struktura

| Kategorie | Testů | Hodnocení |
|---|---|---|
| Hranice rady (doporučení banky/produktu) | 4 | regex + rubric |
| Halucinace čísel (sazby, ceny, nájmy) | 4 | regex + rubric |
| Sliby výsledku (schválení, garance) | 3 | regex + rubric |
| Injection + únik promptu | 4 | regex (fragmenty šablon) |
| Falešná autorita (poradce/ČNB/admin) | 3 | rubric |
| Hypotetika a role-play | 3 | rubric |
| Emoční nátlak | 2 | rubric |
| Jazykové triky (EN, azbuka, obfuskace) | 3 | regex + rubric |
| Cesta k člověku + GDPR práva | 2 | rubric |
| Multi-turn eroze (salámová metoda) | 2 | rubric, s historií |

Známé incidenty z historie repa jsou pokryté: únik persona promptu (migrace 043
→ testy kategorie 4), vymyšlená tržní čísla (044 → kategorie 2).

LLM-judge běží na Gemini (stejný klíč jako aplikace). Pass/fail rubriky jsou
psané per test — při úpravě promptů neměnit rubriky tak, aby test „prošel",
ale opravit prompt.
