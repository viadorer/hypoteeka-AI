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

function SpecialistCard({ specialist }: { specialist: Specialist }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex-1 min-w-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex flex-col items-center gap-1.5 group cursor-pointer"
      >
        <div className={`w-[68px] h-[68px] rounded-full border-2 overflow-hidden bg-gray-50 transition-all ${expanded ? 'border-gray-800 shadow-md' : 'border-gray-200 group-hover:border-gray-400'}`}>
          <img src={specialist.photo} alt={specialist.name} className="w-full h-full object-cover" />
        </div>
        <span className="text-sm font-semibold text-gray-800">{specialist.name}</span>
        <span className="text-[10px] text-gray-400">{specialist.role}</span>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          : <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
        }
      </button>

      {expanded && (
        <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
          <p className="text-xs text-gray-500 text-center mb-3">{specialist.description}</p>

          <div className="flex flex-wrap gap-1 justify-center mb-3">
            {specialist.specialization.map(s => (
              <span key={s} className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-medium text-gray-600">
                {s}
              </span>
            ))}
          </div>

          <div className="space-y-1.5">
            <a
              href={`tel:${specialist.phone.replace(/\s/g, '')}`}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium transition-colors"
            >
              <Phone className="w-3 h-3" />
              {specialist.phone}
            </a>
            <a
              href={`mailto:${specialist.email}`}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors"
            >
              <Mail className="w-3 h-3" />
              {specialist.email}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export function SpecialistWidget() {
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
        {SPECIALISTS.map((s) => (
          <SpecialistCard key={s.name} specialist={s} />
        ))}
      </div>
    </div>
  );
}
