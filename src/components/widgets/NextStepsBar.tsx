'use client';

/**
 * Nabídka dalších kroků pod widgetem.
 *
 * Pravidla (9/2026) — dřív se nabídka vykreslovala po KAŽDÉM widgetu se
 * statickým CTA „Konzultace se specialistou" u 13 z 15 typů. V konverzaci
 * se čtyřmi výpočty tak klient dostal čtyři nabídky konzultace, přestože
 * prompt Hugovi ukládá nabídnout kontakt max dvakrát — UI si s promptem
 * odporovalo a staré nabídky navíc zůstávaly klikací v historii.
 *
 *   1. Vykreslí se jen u POSLEDNÍ zprávy — starší nabídky mizí.
 *   2. Nenabízí, co klient už viděl (`seenWidgets`).
 *   3. Max 3 řádky (Hickův zákon, mobil).
 *   4. Konzultace není součástí seznamu; přidá se jen když ji stav
 *      konverzace opodstatní (`showSpecialist`) — jako pasivní cesta,
 *      ne jako opakovaný push. Aktivní nabídku řeší Hugo v textu.
 */

import { ShieldCheck, Calculator, TrendingUp, Users, Home, BarChart3, RefreshCw, ArrowRight, PiggyBank, Search, Clock, FileCheck, Mail } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import type { LucideIcon } from 'lucide-react';

interface NextStep {
  icon: LucideIcon;
  label: string;
  desc: string;
  message: string;
  /** Widget, který krok obvykle vyvolá — nenabízíme, co klient už viděl. */
  leadsTo?: string;
}

/** Max řádků v jedné nabídce včetně případné konzultace. */
const MAX_STEPS = 3;

const SPECIALIST_STEP: NextStep = {
  icon: Users,
  label: 'Konzultace se specialistou',
  desc: 'Bezplatné spojení s poradcem pro osobní řešení.',
  message: 'Chci se spojit se specialistou na bezplatnou konzultaci.',
};

const EMAIL_STEP: NextStep = {
  icon: Mail,
  label: 'Odeslat na email',
  desc: 'Pošlete si výsledek na email pro pozdější použití.',
  message: 'Chci odeslat kalkulaci na email.',
};

const NEXT_STEPS: Record<string, { title: string; steps: NextStep[] }> = {
  show_payment: {
    title: 'Co mohu udělat dál',
    steps: [
      { icon: ShieldCheck, label: 'Zkontrolovat bonitu', desc: 'Ověřím, jestli splníte podmínky bank podle pravidel ČNB.', message: 'Chci zkontrolovat, jestli splním podmínky banky.', leadsTo: 'show_eligibility' },
      { icon: Home, label: 'Porovnat s nájmem', desc: 'Srovnání měsíčních nákladů na nájem a hypotéku.', message: 'Porovnej mi splátku hypotéky s nájmem.', leadsTo: 'show_rent_vs_buy' },
      { icon: TrendingUp, label: 'Stress test sazby', desc: 'Co se stane se splátkou, když sazba vzroste o 1--2 %.', message: 'Co se stane se splátkou, když sazba vzroste?', leadsTo: 'show_stress_test' },
      EMAIL_STEP,
    ],
  },
  show_eligibility: {
    title: 'Další kroky',
    steps: [
      { icon: PiggyBank, label: 'Kolik si mohu dovolit', desc: 'Maximální cena nemovitosti podle vašeho příjmu.', message: 'Kolik si mohu maximálně dovolit?', leadsTo: 'show_affordability' },
      { icon: Calculator, label: 'Spočítat splátku', desc: 'Přesný výpočet měsíční splátky s aktuální sazbou.', message: 'Spočítej mi měsíční splátku.', leadsTo: 'show_payment' },
      EMAIL_STEP,
    ],
  },
  show_affordability: {
    title: 'Další kroky',
    steps: [
      { icon: Calculator, label: 'Spočítat splátku', desc: 'Přesný výpočet splátky pro tuto částku.', message: 'Spočítej mi měsíční splátku pro tuto částku.', leadsTo: 'show_payment' },
      { icon: ShieldCheck, label: 'Zkontrolovat bonitu', desc: 'Ověřím podmínky bank podle pravidel ČNB.', message: 'Chci zkontrolovat, jestli splním podmínky banky.', leadsTo: 'show_eligibility' },
      EMAIL_STEP,
    ],
  },
  show_rent_vs_buy: {
    title: 'Další kroky',
    steps: [
      { icon: Calculator, label: 'Spočítat splátku', desc: 'Přesný výpočet měsíční splátky hypotéky.', message: 'Spočítej mi přesnou splátku hypotéky.', leadsTo: 'show_payment' },
      { icon: ShieldCheck, label: 'Zkontrolovat bonitu', desc: 'Splním podmínky banky pro tuto hypotéku?', message: 'Splním podmínky banky pro tuto hypotéku?', leadsTo: 'show_eligibility' },
    ],
  },
  show_investment: {
    title: 'Další kroky',
    steps: [
      { icon: ShieldCheck, label: 'Zkontrolovat bonitu', desc: 'Podmínky bank pro investiční hypotéku.', message: 'Splním podmínky banky pro investiční hypotéku?', leadsTo: 'show_eligibility' },
      { icon: TrendingUp, label: 'Stress test sazby', desc: 'Co se stane s cash flow při růstu sazby.', message: 'Co se stane s cash flow, když sazba vzroste?', leadsTo: 'show_stress_test' },
    ],
  },
  show_refinance: {
    title: 'Další kroky',
    steps: [
      { icon: TrendingUp, label: 'Stress test refixace', desc: 'Simulace splátky při různých sazbách po refixaci.', message: 'Co se stane se splátkou při různých sazbách po refixaci?', leadsTo: 'show_stress_test' },
      { icon: BarChart3, label: 'Průběh splácení', desc: 'Vizualizace jistiny a úroků v čase.', message: 'Ukaž mi průběh splácení po refinancování.', leadsTo: 'show_amortization' },
    ],
  },
  show_amortization: {
    title: 'Další kroky',
    steps: [
      { icon: TrendingUp, label: 'Stress test sazby', desc: 'Co se stane se splátkou při růstu sazby.', message: 'Co se stane se splátkou, když sazba vzroste?', leadsTo: 'show_stress_test' },
    ],
  },
  show_stress_test: {
    title: 'Další kroky',
    steps: [
      { icon: Calculator, label: 'Spočítat splátku', desc: 'Aktuální splátka s dnešní sazbou.', message: 'Spočítej mi aktuální splátku.', leadsTo: 'show_payment' },
    ],
  },
  show_property: {
    title: 'Co mohu udělat dál',
    steps: [
      { icon: Calculator, label: 'Spočítat splátku', desc: 'Měsíční splátka pro tuto nemovitost.', message: 'Spočítej mi splátku pro tuto nemovitost.', leadsTo: 'show_payment' },
      { icon: PiggyBank, label: 'Kolik potřebuji naspořit', desc: 'Minimální vlastní zdroje podle pravidel ČNB.', message: 'Kolik vlastních zdrojů budu potřebovat?' },
      { icon: Search, label: 'Ocenění nemovitosti', desc: 'Zjistěte tržní hodnotu nemovitosti.', message: 'Chci zjistit hodnotu nemovitosti.', leadsTo: 'request_valuation' },
    ],
  },
  show_valuation: {
    title: 'Další kroky',
    steps: [
      { icon: Calculator, label: 'Spočítat splátku', desc: 'Měsíční splátka hypotéky s aktuální sazbou.', message: 'Spočítej mi měsíční splátku hypotéky.', leadsTo: 'show_payment' },
      { icon: ShieldCheck, label: 'Zkontrolovat bonitu', desc: 'Ověřím podmínky bank podle pravidel ČNB.', message: 'Chci zkontrolovat, jestli splním podmínky banky.', leadsTo: 'show_eligibility' },
    ],
  },
  show_rate_comparison: {
    title: 'Další kroky',
    steps: [
      { icon: Calculator, label: 'Spočítat splátku', desc: 'Přesný výpočet splátky s konkrétní sazbou.', message: 'Spočítej mi přesnou splátku hypotéky.', leadsTo: 'show_payment' },
      { icon: ShieldCheck, label: 'Zkontrolovat bonitu', desc: 'Ověřím, jestli splníte podmínky bank.', message: 'Chci zkontrolovat, jestli splním podmínky banky.', leadsTo: 'show_eligibility' },
      { icon: Clock, label: 'Jak probíhá koupě', desc: 'Časová osa celého procesu koupě nemovitosti.', message: 'Jak probíhá proces koupě nemovitosti?', leadsTo: 'show_timeline' },
    ],
  },
  show_timeline: {
    title: 'Další kroky',
    steps: [
      { icon: FileCheck, label: 'Potřebné dokumenty', desc: 'Seznam dokumentů, které budete potřebovat.', message: 'Jaké dokumenty budu potřebovat?', leadsTo: 'show_checklist' },
      { icon: Calculator, label: 'Spočítat splátku', desc: 'Měsíční splátka hypotéky s aktuální sazbou.', message: 'Spočítej mi měsíční splátku hypotéky.', leadsTo: 'show_payment' },
    ],
  },
  show_checklist: {
    title: 'Další kroky',
    steps: [
      { icon: Clock, label: 'Jak probíhá proces', desc: 'Časová osa celého procesu krok za krokem.', message: 'Jak probíhá celý proces koupě nemovitosti?', leadsTo: 'show_timeline' },
      { icon: Calculator, label: 'Spočítat splátku', desc: 'Měsíční splátka hypotéky s aktuální sazbou.', message: 'Spočítej mi měsíční splátku hypotéky.', leadsTo: 'show_payment' },
    ],
  },
  show_appointment: {
    title: 'Další kroky',
    steps: [
      { icon: Calculator, label: 'Spočítat splátku', desc: 'Měsíční splátka hypotéky s aktuální sazbou.', message: 'Spočítej mi měsíční splátku hypotéky.', leadsTo: 'show_payment' },
      { icon: FileCheck, label: 'Potřebné dokumenty', desc: 'Co si připravit na schůzku.', message: 'Jaké dokumenty si mám připravit na schůzku?', leadsTo: 'show_checklist' },
    ],
  },
  // Po reálném ocenění (RealVisor) — bez nabídky by prodejní scénář končil
  // slepou uličkou, proto tu zůstává i pro vracejícího se klienta.
  request_valuation: {
    title: 'Co mohu udělat dál',
    steps: [
      { icon: RefreshCw, label: 'Prodej s hypotékou', desc: 'Jak probíhá prodej, když na nemovitosti ještě vázne hypotéka.', message: 'Na nemovitosti mám ještě hypotéku — jak probíhá prodej s hypotékou?' },
      { icon: Clock, label: 'Jak prodej probíhá', desc: 'Časová osa prodeje od ocenění po předání.', message: 'Jak probíhá proces prodeje nemovitosti?', leadsTo: 'show_timeline' },
      { icon: FileCheck, label: 'Dokumenty k prodeji', desc: 'Co si připravit — list vlastnictví, PENB a další.', message: 'Jaké dokumenty potřebuji k prodeji nemovitosti?', leadsTo: 'show_checklist' },
      { icon: Calculator, label: 'Hypotéka na další bydlení', desc: 'Splátka nové hypotéky s využitím peněz z prodeje.', message: 'Chci spočítat hypotéku na další bydlení s penězi z prodeje.', leadsTo: 'show_payment' },
    ],
  },
};

interface Props {
  toolName: string;
  onSend: (text: string) => void;
  /** Nabídka patří jen k poslední zprávě — starší se nevykreslují. */
  isLatest?: boolean;
  /** Widgety, které klient v konverzaci už viděl. */
  seenWidgets?: string[];
  /** Přidat konzultaci jako pasivní cestu (řídí stav konverzace v ChatArea). */
  showSpecialist?: boolean;
}

export function NextStepsBar({ toolName, onSend, isLatest = true, seenWidgets = [], showSpecialist = false }: Props) {
  const config = NEXT_STEPS[toolName];
  if (!config || !isLatest) return null;

  const fresh = config.steps.filter(step => !step.leadsTo || !seenWidgets.includes(step.leadsTo));
  const steps = fresh.slice(0, showSpecialist ? MAX_STEPS - 1 : MAX_STEPS);
  if (showSpecialist) steps.push(SPECIALIST_STEP);
  if (steps.length === 0) return null;

  return (
    <div className="mt-3 bg-[#ffffff] rounded-2xl border border-outline-variant/15 shadow-[0_20px_50px_rgba(0,26,65,0.08)] overflow-hidden">
      <div className="px-4 pt-3 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface/40">
          {config.title}
        </p>
      </div>
      <div className="divide-y divide-outline-variant/20">
        {steps.map((step) => {
          const Icon = step.icon;
          const isSpecialist = step === SPECIALIST_STEP;
          return (
            <button
              key={step.label}
              onClick={() => { trackEvent('next_step_click', { widget: toolName, step: step.label }); onSend(step.message); }}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer group ${
                isSpecialist ? 'bg-primary/[0.03] hover:bg-primary/[0.06]' : 'hover:bg-surface-container-low/80'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                isSpecialist ? 'bg-primary/10' : 'bg-surface-container-low group-hover:bg-white'
              }`}>
                <Icon className={`w-4 h-4 transition-colors ${isSpecialist ? 'text-primary' : 'text-on-surface/40 group-hover:text-primary'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-on-surface">
                  {step.label}
                </p>
                <p className="text-xs text-on-surface/40 mt-0.5 leading-relaxed">
                  {step.desc}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-on-surface/30 group-hover:text-primary flex-shrink-0 mt-1.5 transition-colors" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
