'use client';

import { ShieldCheck, Calculator, TrendingUp, Users, Home, BarChart3, RefreshCw, ArrowRight, PiggyBank, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NextStep {
  icon: LucideIcon;
  label: string;
  desc: string;
  message: string;
}

const NEXT_STEPS: Record<string, { title: string; steps: NextStep[] }> = {
  show_payment: {
    title: 'Co mohu udělat dál',
    steps: [
      { icon: ShieldCheck, label: 'Zkontrolovat bonitu', desc: 'Ověřím, jestli splníte podmínky bank podle pravidel ČNB.', message: 'Chci zkontrolovat, jestli splním podmínky banky.' },
      { icon: Home, label: 'Porovnat s nájmem', desc: 'Srovnání měsíčních nákladů na nájem a hypotéku.', message: 'Porovnej mi splátku hypotéky s nájmem.' },
      { icon: TrendingUp, label: 'Stress test sazby', desc: 'Co se stane se splátkou, když sazba vzroste o 1--2 %.', message: 'Co se stane se splátkou, když sazba vzroste?' },
      { icon: Users, label: 'Konzultace se specialistou', desc: 'Bezplatné spojení s poradcem pro osobní řešení.', message: 'Chci se spojit se specialistou na bezplatnou konzultaci.' },
    ],
  },
  show_eligibility: {
    title: 'Další kroky',
    steps: [
      { icon: PiggyBank, label: 'Kolik si mohu dovolit', desc: 'Maximální cena nemovitosti podle vašeho příjmu.', message: 'Kolik si mohu maximálně dovolit?' },
      { icon: Calculator, label: 'Spočítat splátku', desc: 'Přesný výpočet měsíční splátky s aktuální sazbou.', message: 'Spočítej mi měsíční splátku.' },
      { icon: Users, label: 'Konzultace se specialistou', desc: 'Bezplatné spojení s poradcem pro osobní řešení.', message: 'Chci se spojit se specialistou na bezplatnou konzultaci.' },
    ],
  },
  show_affordability: {
    title: 'Další kroky',
    steps: [
      { icon: Calculator, label: 'Spočítat splátku', desc: 'Přesný výpočet splátky pro tuto částku.', message: 'Spočítej mi měsíční splátku pro tuto částku.' },
      { icon: ShieldCheck, label: 'Zkontrolovat bonitu', desc: 'Ověřím podmínky bank podle pravidel ČNB.', message: 'Chci zkontrolovat, jestli splním podmínky banky.' },
      { icon: Users, label: 'Konzultace se specialistou', desc: 'Bezplatné spojení s poradcem pro osobní řešení.', message: 'Chci se spojit se specialistou na bezplatnou konzultaci.' },
    ],
  },
  show_rent_vs_buy: {
    title: 'Další kroky',
    steps: [
      { icon: Calculator, label: 'Spočítat splátku', desc: 'Přesný výpočet měsíční splátky hypotéky.', message: 'Spočítej mi přesnou splátku hypotéky.' },
      { icon: ShieldCheck, label: 'Zkontrolovat bonitu', desc: 'Splním podmínky banky pro tuto hypotéku?', message: 'Splním podmínky banky pro tuto hypotéku?' },
      { icon: Users, label: 'Konzultace se specialistou', desc: 'Bezplatné spojení s poradcem pro osobní řešení.', message: 'Chci se spojit se specialistou na bezplatnou konzultaci.' },
    ],
  },
  show_investment: {
    title: 'Další kroky',
    steps: [
      { icon: ShieldCheck, label: 'Zkontrolovat bonitu', desc: 'Podmínky bank pro investiční hypotéku.', message: 'Splním podmínky banky pro investiční hypotéku?' },
      { icon: TrendingUp, label: 'Stress test sazby', desc: 'Co se stane s cash flow při růstu sazby.', message: 'Co se stane s cash flow, když sazba vzroste?' },
      { icon: Users, label: 'Konzultace se specialistou', desc: 'Bezplatné spojení s poradcem pro osobní řešení.', message: 'Chci se spojit se specialistou na bezplatnou konzultaci.' },
    ],
  },
  show_refinance: {
    title: 'Další kroky',
    steps: [
      { icon: TrendingUp, label: 'Stress test refixace', desc: 'Simulace splátky při různých sazbách po refixaci.', message: 'Co se stane se splátkou při různých sazbách po refixaci?' },
      { icon: BarChart3, label: 'Průběh splácení', desc: 'Vizualizace jistiny a úroků v čase.', message: 'Ukaž mi průběh splácení po refinancování.' },
      { icon: Users, label: 'Konzultace se specialistou', desc: 'Bezplatné spojení s poradcem ohledně refinancování.', message: 'Chci se spojit se specialistou ohledně refinancování.' },
    ],
  },
  show_amortization: {
    title: 'Další kroky',
    steps: [
      { icon: TrendingUp, label: 'Stress test sazby', desc: 'Co se stane se splátkou při růstu sazby.', message: 'Co se stane se splátkou, když sazba vzroste?' },
      { icon: Users, label: 'Konzultace se specialistou', desc: 'Bezplatné spojení s poradcem pro osobní řešení.', message: 'Chci se spojit se specialistou na bezplatnou konzultaci.' },
    ],
  },
  show_stress_test: {
    title: 'Další kroky',
    steps: [
      { icon: Calculator, label: 'Spočítat splátku', desc: 'Aktuální splátka s dnešní sazbou.', message: 'Spočítej mi aktuální splátku.' },
      { icon: Users, label: 'Konzultace se specialistou', desc: 'Poraďte se o rizicích s odborníkem.', message: 'Chci se poradit se specialistou o rizicích.' },
    ],
  },
  show_property: {
    title: 'Co mohu udělat dál',
    steps: [
      { icon: Calculator, label: 'Spočítat splátku', desc: 'Měsíční splátka pro tuto nemovitost.', message: 'Spočítej mi splátku pro tuto nemovitost.' },
      { icon: PiggyBank, label: 'Kolik potřebuji naspořit', desc: 'Minimální vlastní zdroje podle pravidel ČNB.', message: 'Kolik vlastních zdrojů budu potřebovat?' },
      { icon: Search, label: 'Ocenění nemovitosti', desc: 'Zjistěte tržní hodnotu nemovitosti.', message: 'Chci zjistit hodnotu nemovitosti.' },
    ],
  },
  show_valuation: {
    title: 'Další kroky',
    steps: [
      { icon: Calculator, label: 'Spočítat splátku', desc: 'Měsíční splátka hypotéky s aktuální sazbou.', message: 'Spočítej mi měsíční splátku hypotéky.' },
      { icon: ShieldCheck, label: 'Zkontrolovat bonitu', desc: 'Ověřím podmínky bank podle pravidel ČNB.', message: 'Chci zkontrolovat, jestli splním podmínky banky.' },
      { icon: Users, label: 'Konzultace se specialistou', desc: 'Bezplatné spojení s poradcem pro osobní řešení.', message: 'Chci se spojit se specialistou na bezplatnou konzultaci.' },
    ],
  },
};

interface Props {
  toolName: string;
  onSend: (text: string) => void;
}

export function NextStepsBar({ toolName, onSend }: Props) {
  const config = NEXT_STEPS[toolName];
  if (!config) return null;

  return (
    <div className="mt-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 pt-3 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {config.title}
        </p>
      </div>
      <div className="divide-y divide-gray-50">
        {config.steps.map((step) => {
          const Icon = step.icon;
          return (
            <button
              key={step.label}
              onClick={() => onSend(step.message)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50/80 transition-colors cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-white flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
                <Icon className="w-4 h-4 text-gray-400 group-hover:text-[#E91E63] transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 group-hover:text-gray-900">
                  {step.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  {step.desc}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#E91E63] flex-shrink-0 mt-1.5 transition-colors" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
