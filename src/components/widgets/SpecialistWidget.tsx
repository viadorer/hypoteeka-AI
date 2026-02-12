'use client';

// TODO: vizitka (expandable contact card) - temporarily disabled, will return to this later
// import { useState } from 'react';
// import { Phone, Mail, ChevronDown, ChevronUp } from 'lucide-react';

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
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-[68px] h-[68px] rounded-full border-2 border-gray-200 overflow-hidden bg-gray-50">
        <img src={specialist.photo} alt={specialist.name} className="w-full h-full object-cover" />
      </div>
      <span className="text-sm font-semibold text-gray-800">{specialist.name}</span>
      <span className="text-[10px] text-gray-400">{specialist.role}</span>
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
