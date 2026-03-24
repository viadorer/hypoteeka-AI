'use client';

import { MessageSquare, Calculator, UserCheck } from 'lucide-react';

interface Props {
  primaryColor: string;
  isValuation?: boolean;
}

const STEPS_MORTGAGE = [
  {
    icon: MessageSquare,
    title: 'Řekněte nám o nemovitosti',
    desc: 'Hugo se vás zeptá na cenu, vlastní zdroje a příjem. Konverzace, ne formulář.',
  },
  {
    icon: Calculator,
    title: 'Spočítáme všechno',
    desc: 'Splátka, bonita ČNB, porovnání sazeb bank. Vše na jednom místě.',
  },
  {
    icon: UserCheck,
    title: 'Spojíme vás s poradcem',
    desc: 'Certifikovaný specialista porovná nabídky 8+ bank a vyjedná nejlepší podmínky.',
  },
];

const STEPS_VALUATION = [
  {
    icon: MessageSquare,
    title: 'Popište nemovitost',
    desc: 'Zadejte adresu, typ a stav nemovitosti. AI vás provede krok za krokem.',
  },
  {
    icon: Calculator,
    title: 'Získáte odhad ceny',
    desc: 'Na základě reálných dat z trhu vám ukážeme orientační tržní cenu.',
  },
  {
    icon: UserCheck,
    title: 'Konzultace s odborníkem',
    desc: 'Pro přesný odhad vás spojíme s certifikovaným odhadcem.',
  },
];

export function HowItWorks({ primaryColor, isValuation }: Props) {
  const steps = isValuation ? STEPS_VALUATION : STEPS_MORTGAGE;

  return (
    <section className="px-4 py-16 md:py-20">
      <div className="max-w-3xl mx-auto">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#001a41]/40 text-center mb-2">
          Jak to funguje
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-[#001a41] text-center mb-12">
          3 jednoduché kroky
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${primaryColor}10` }}
                >
                  <Icon className="w-6 h-6" style={{ color: primaryColor }} />
                </div>
                <div className="text-xs font-bold text-[#001a41]/30 mb-2">
                  {i + 1}.
                </div>
                <h3 className="text-base font-semibold text-[#001a41] mb-2">{step.title}</h3>
                <p className="text-sm text-[#001a41]/60 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
