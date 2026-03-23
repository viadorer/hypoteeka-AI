'use client';

import { useState } from 'react';
import { Phone, Mail, ChevronDown, ChevronUp } from 'lucide-react';

interface Specialist {
  name: string;
  photo: string;
  role: string;
  phone: string;
  email: string;
  description: string;
  specialization: string[];
}

const SPECIALISTS: Specialist[] = [
  {
    name: 'Míša',
    photo: '/images/specialists/misa.jpg',
    role: 'Hypoteční specialistka',
    phone: '+420 777 123 456',
    email: 'misa@hypoteeka.cz',
    description: 'Porovnám nabídky 8+ bank a vyjednám podmínky, které běžně nedostanete.',
    specialization: ['První nemovitost', 'Mladí do 36 let', 'Investice'],
  },
  {
    name: 'Filip',
    photo: '/images/specialists/filip.jpg',
    role: 'Hypoteční specialista',
    phone: '+420 777 987 654',
    email: 'filip@hypoteeka.cz',
    description: 'Specializuji se na složitější případy. Najdu řešení i tam, kde jiní končí.',
    specialization: ['Refinancování', 'OSVČ', 'Vyšší úvěry'],
  },
];

function SpecialistCard({ specialist, isExpanded, onToggle }: { specialist: Specialist; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="flex-1 min-w-0">
      <button
        onClick={onToggle}
        className="w-full flex flex-col items-center gap-1.5 cursor-pointer group"
      >
        <div className="w-[68px] h-[68px] rounded-full border-2 border-gray-200 group-hover:border-[#E91E63]/40 overflow-hidden bg-gray-50 transition-colors">
          <img src={specialist.photo} alt={specialist.name} className="w-full h-full object-cover" />
        </div>
        <span className="text-sm font-semibold text-gray-800">{specialist.name}</span>
        <span className="text-[10px] text-gray-400">{specialist.role}</span>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-gray-300" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 duration-300">
          <p className="text-xs text-gray-500 text-center leading-relaxed">
            {specialist.description}
          </p>

          <div className="flex flex-wrap justify-center gap-1.5">
            {specialist.specialization.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[10px] font-medium text-[#E91E63] bg-[#E91E63]/5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <a
              href={`tel:${specialist.phone.replace(/\s/g, '')}`}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#E91E63] hover:bg-[#C2185B] text-white text-sm font-medium transition-colors"
            >
              <Phone className="w-4 h-4" />
              Zavolat
            </a>
            <a
              href={`mailto:${specialist.email}`}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 hover:border-[#E91E63]/40 text-gray-700 hover:text-[#E91E63] text-sm font-medium transition-colors"
            >
              <Mail className="w-4 h-4" />
              Napsat email
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export function SpecialistWidget() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden w-full min-w-0">
      <div className="w-8 h-[3px] rounded-full bg-[#E91E63] mb-3" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
        Dostupní specialisté
      </p>
      <p className="text-xs text-gray-400 mb-4">
        Konzultace zdarma. Klikněte pro kontakt.
      </p>
      <div className="flex gap-6">
        {SPECIALISTS.map((s, i) => (
          <SpecialistCard
            key={s.name}
            specialist={s}
            isExpanded={expandedIndex === i}
            onToggle={() => setExpandedIndex(expandedIndex === i ? null : i)}
          />
        ))}
      </div>
    </div>
  );
}
