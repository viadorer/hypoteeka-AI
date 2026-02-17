'use client';

import { useState } from 'react';
import { WidgetCard, CtaButton } from './shared';

interface Doc {
  id: string;
  name: string;
  desc: string;
}

interface Props {
  type: 'koupe' | 'prodej' | 'refinancovani';
}

const CheckIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);

const DOCS: Record<string, Doc[]> = {
  koupe: [
    { id: 'op', name: 'Občanský průkaz', desc: 'Platný doklad totožnosti' },
    { id: 'prijem', name: 'Potvrzení o příjmu', desc: 'Od zaměstnavatele či daňové přiznání' },
    { id: 'vypis', name: 'Výpis z účtu', desc: 'Za posledních 3-6 měsíců' },
    { id: 'hypoteka', name: 'Předběžný souhlas banky', desc: 'S poskytnutím hypotéky' },
    { id: 'energie', name: 'Průkaz energ. náročnosti', desc: 'PENB od prodávajícího' },
    { id: 'lv', name: 'Ověření listu vlastnictví', desc: 'Kontrola v katastru' },
    { id: 'smlouva', name: 'Kupní smlouva', desc: 'Právně ověřená' },
    { id: 'navrh', name: 'Návrh na vklad', desc: 'Do katastru nemovitostí' },
  ],
  prodej: [
    { id: 'lv', name: 'List vlastnictví', desc: 'Aktuální z katastru' },
    { id: 'penb', name: 'PENB', desc: 'Průkaz energetické náročnosti' },
    { id: 'nabyvaci', name: 'Nabývací titul', desc: 'Kupní smlouva, dědictví apod.' },
    { id: 'plan', name: 'Půdorys', desc: 'Aktuální půdorys bytu/domu' },
    { id: 'vyuctovani', name: 'Vyúčtování energií', desc: 'Za poslední rok' },
    { id: 'fond', name: 'Stav fondu oprav', desc: 'Potvrzení od SVJ' },
    { id: 'bremena', name: 'Bez věcných břemen', desc: 'Ověření v katastru' },
  ],
  refinancovani: [
    { id: 'op', name: 'Občanský průkaz', desc: 'Platný doklad totožnosti' },
    { id: 'smlouva_old', name: 'Stávající úvěrová smlouva', desc: 'Včetně podmínek a sazby' },
    { id: 'zustatek', name: 'Potvrzení o zůstatku', desc: 'Aktuální výše dluhu' },
    { id: 'prijem', name: 'Potvrzení o příjmu', desc: 'Od zaměstnavatele či daňové přiznání' },
    { id: 'vypis', name: 'Výpis z účtu', desc: 'Za posledních 3-6 měsíců' },
    { id: 'lv', name: 'List vlastnictví', desc: 'Aktuální z katastru' },
    { id: 'odhad', name: 'Odhad nemovitosti', desc: 'Aktuální tržní ocenění' },
  ],
};

const TYPE_LABELS: Record<string, string> = {
  koupe: 'koupi',
  prodej: 'prodeji',
  refinancovani: 'refinancování',
};

export function ChecklistWidget({ type }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const docs = DOCS[type] ?? DOCS.koupe;
  const total = docs.length;
  const done = docs.filter(d => checked[d.id]).length;
  const pct = (done / total) * 100;

  const toggle = (id: string) => {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <WidgetCard label={`Dokumenty k ${TYPE_LABELS[type] ?? type}`} icon={CheckIcon}>
      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between mb-1.5">
          <span className="text-[11px] text-gray-400">Připravenost</span>
          <span className="text-xs text-gray-800 font-medium">{done}/{total}</span>
        </div>
        <div className="h-1 rounded-full bg-gray-100">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              backgroundColor: pct === 100 ? '#22c55e' : '#E91E63',
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {docs.map((doc, i) => {
          const isChecked = !!checked[doc.id];
          return (
            <button
              key={doc.id}
              onClick={() => toggle(doc.id)}
              className={`flex items-center gap-3 p-2.5 rounded-lg text-left transition-all animate-in slide-in-from-bottom-1 fade-in ${
                isChecked
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'bg-gray-50 border border-gray-100 hover:bg-gray-100'
              }`}
              style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
            >
              <div
                className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border transition-all ${
                  isChecked
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'bg-white border-gray-200'
                }`}
              >
                {isChecked && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <div className={`text-xs transition-all ${
                  isChecked ? 'text-gray-400 line-through' : 'text-gray-800'
                }`}>
                  {doc.name}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">{doc.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {done === total && (
        <CtaButton>
          Všechny dokumenty připraveny
        </CtaButton>
      )}
    </WidgetCard>
  );
}
