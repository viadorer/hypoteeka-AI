'use client';

import { ArrowRight } from 'lucide-react';

interface NextStep {
  label: string;
  message: string;
}

const NEXT_STEPS: Record<string, NextStep[]> = {
  show_payment: [
    { label: 'Zkontrolovat bonitu', message: 'Chci zkontrolovat, jestli splním podmínky banky.' },
    { label: 'Porovnat s nájmem', message: 'Porovnej mi splátku hypotéky s nájmem.' },
    { label: 'Stress test sazby', message: 'Co se stane se splátkou, když sazba vzroste?' },
    { label: 'Konzultace se specialistou', message: 'Chci se spojit se specialistou na bezplatnou konzultaci.' },
  ],
  show_eligibility: [
    { label: 'Kolik si mohu dovolit', message: 'Kolik si mohu maximálně dovolit?' },
    { label: 'Spočítat splátku', message: 'Spočítej mi měsíční splátku.' },
    { label: 'Konzultace se specialistou', message: 'Chci se spojit se specialistou na bezplatnou konzultaci.' },
  ],
  show_affordability: [
    { label: 'Spočítat splátku', message: 'Spočítej mi měsíční splátku pro tuto částku.' },
    { label: 'Zkontrolovat bonitu', message: 'Chci zkontrolovat, jestli splním podmínky banky.' },
    { label: 'Konzultace se specialistou', message: 'Chci se spojit se specialistou na bezplatnou konzultaci.' },
  ],
  show_rent_vs_buy: [
    { label: 'Spočítat splátku', message: 'Spočítej mi přesnou splátku hypotéky.' },
    { label: 'Zkontrolovat bonitu', message: 'Splním podmínky banky pro tuto hypotéku?' },
    { label: 'Konzultace se specialistou', message: 'Chci se spojit se specialistou na bezplatnou konzultaci.' },
  ],
  show_investment: [
    { label: 'Zkontrolovat bonitu', message: 'Splním podmínky banky pro investiční hypotéku?' },
    { label: 'Stress test sazby', message: 'Co se stane s cash flow, když sazba vzroste?' },
    { label: 'Konzultace se specialistou', message: 'Chci se spojit se specialistou na bezplatnou konzultaci.' },
  ],
  show_refinance: [
    { label: 'Stress test refixace', message: 'Co se stane se splátkou při různých sazbách po refixaci?' },
    { label: 'Průběh splácení', message: 'Ukaž mi průběh splácení po refinancování.' },
    { label: 'Konzultace se specialistou', message: 'Chci se spojit se specialistou ohledně refinancování.' },
  ],
  show_amortization: [
    { label: 'Stress test sazby', message: 'Co se stane se splátkou, když sazba vzroste?' },
    { label: 'Konzultace se specialistou', message: 'Chci se spojit se specialistou na bezplatnou konzultaci.' },
  ],
  show_stress_test: [
    { label: 'Spočítat splátku', message: 'Spočítej mi aktuální splátku.' },
    { label: 'Konzultace se specialistou', message: 'Chci se poradit se specialistou o rizicích.' },
  ],
  show_property: [
    { label: 'Spočítat splátku', message: 'Spočítej mi splátku pro tuto nemovitost.' },
    { label: 'Kolik potřebuji naspořit', message: 'Kolik vlastních zdrojů budu potřebovat?' },
  ],
};

interface Props {
  toolName: string;
  onSend: (text: string) => void;
}

export function NextStepsBar({ toolName, onSend }: Props) {
  const steps = NEXT_STEPS[toolName];
  if (!steps || steps.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {steps.map((step) => (
        <button
          key={step.label}
          onClick={() => onSend(step.message)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium
            bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900
            border border-gray-150 hover:border-gray-200
            transition-all duration-150 cursor-pointer"
        >
          {step.label}
          <ArrowRight className="w-3 h-3 opacity-40" />
        </button>
      ))}
    </div>
  );
}
