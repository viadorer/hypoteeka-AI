'use client';

import { WidgetCard } from './shared';

interface Step {
  title: string;
  desc: string;
  duration: string;
  status: 'done' | 'active' | 'pending';
}

interface Props {
  type: 'koupe' | 'prodej' | 'refinancovani';
  currentStep?: number;
}

const ClockIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

const STEPS: Record<string, Step[]> = {
  koupe: [
    { title: 'Výběr nemovitosti', desc: 'Prohlížení, prohlídky, výběr', duration: '2-8 týd', status: 'done' },
    { title: 'Financování', desc: 'Žádost o hypotéku, schválení', duration: '2-4 týd', status: 'done' },
    { title: 'Rezervační smlouva', desc: 'Složení rezervačního poplatku', duration: '1 týd', status: 'active' },
    { title: 'Kupní smlouva', desc: 'Právní kontrola, podpis', duration: '1-2 týd', status: 'pending' },
    { title: 'Převod vlastnictví', desc: 'Katastr nemovitostí', duration: '4-8 týd', status: 'pending' },
    { title: 'Předání', desc: 'Předávací protokol, klíče', duration: '1 den', status: 'pending' },
  ],
  prodej: [
    { title: 'Ocenění', desc: 'Odhad tržní ceny', duration: '1-3 dny', status: 'done' },
    { title: 'Příprava', desc: 'Foto, popis, dokumenty', duration: '1-2 týd', status: 'done' },
    { title: 'Inzerce', desc: 'Aktivní nabídka na trhu', duration: '2-12 týd', status: 'active' },
    { title: 'Prohlídky', desc: 'Organizace prohlídek', duration: 'průběžně', status: 'pending' },
    { title: 'Kupní smlouva', desc: 'Vyjednávání, podpis', duration: '1-2 týd', status: 'pending' },
    { title: 'Předání', desc: 'Předání nemovitosti', duration: '1 den', status: 'pending' },
  ],
  refinancovani: [
    { title: 'Analýza stávající hypotéky', desc: 'Kontrola podmínek a sazby', duration: '1 den', status: 'done' },
    { title: 'Porovnání nabídek', desc: 'Srovnání bank a sazeb', duration: '1-2 týd', status: 'active' },
    { title: 'Žádost o refinancování', desc: 'Podání žádosti u nové banky', duration: '1-2 týd', status: 'pending' },
    { title: 'Schválení', desc: 'Posouzení bonity, ocenění', duration: '2-4 týd', status: 'pending' },
    { title: 'Podpis smlouvy', desc: 'Nová úvěrová smlouva', duration: '1 týd', status: 'pending' },
    { title: 'Splacení původní hypotéky', desc: 'Převod a ukončení', duration: '1-2 týd', status: 'pending' },
  ],
};

const TYPE_LABELS: Record<string, string> = {
  koupe: 'koupě',
  prodej: 'prodeje',
  refinancovani: 'refinancování',
};

export function TimelineWidget({ type, currentStep }: Props) {
  const steps = STEPS[type] ?? STEPS.koupe;

  // Apply currentStep override if provided
  const resolvedSteps = currentStep !== undefined
    ? steps.map((s, i) => ({
        ...s,
        status: (i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending') as Step['status'],
      }))
    : steps;

  const activeIdx = resolvedSteps.findIndex(s => s.status === 'active');
  const progressPct = activeIdx >= 0 ? ((activeIdx + 0.5) / resolvedSteps.length) * 100 : 0;

  return (
    <WidgetCard label={`Proces ${TYPE_LABELS[type] ?? type}`} icon={ClockIcon}>
      <div className="relative pl-6 mt-2">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-gray-100">
          <div
            className="w-full bg-[#E91E63] rounded-sm transition-all duration-400"
            style={{ height: `${progressPct}%` }}
          />
        </div>

        {resolvedSteps.map((step, i) => (
          <div
            key={i}
            className="relative mb-4 last:mb-0 animate-in slide-in-from-bottom-1 fade-in"
            style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
          >
            {/* Dot */}
            <div
              className={`absolute -left-[13px] top-1 w-3 h-3 rounded-full border flex items-center justify-center ${
                step.status === 'done'
                  ? 'bg-emerald-500 border-emerald-500'
                  : step.status === 'active'
                  ? 'bg-white border-[#E91E63] shadow-[0_0_8px_rgba(233,30,99,0.3)]'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              {step.status === 'done' && (
                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>

            <div className="pl-1">
              <div className="flex justify-between items-center">
                <span className={`text-[13px] ${
                  step.status === 'done' || step.status === 'active'
                    ? 'text-gray-800'
                    : 'text-gray-400'
                } ${step.status === 'active' ? 'font-medium' : ''}`}>
                  {step.title}
                </span>
                <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                  {step.duration}
                </span>
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}
