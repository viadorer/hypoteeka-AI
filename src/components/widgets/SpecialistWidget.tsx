'use client';

import { useState } from 'react';
import { X, Phone, Mail, Award } from 'lucide-react';

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
    description: 'Pomůžu vám najít nejlepší hypotéku na trhu. Porovnám nabídky 8+ bank a vyjednám podmínky, které běžně nedostanete.',
    specialization: ['Koupě první nemovitosti', 'Mladí do 36 let', 'Investiční nemovitosti'],
  },
  {
    name: 'Filip',
    photo: '/images/specialists/filip.jpg',
    role: 'Hypoteční specialista',
    phone: '+420 777 987 654',
    email: 'filip@hypoteeka.cz',
    description: 'Specializuji se na složitější případy a refinancování. Najdu řešení i tam, kde jiní končí.',
    specialization: ['Refinancování', 'OSVČ a podnikatelé', 'Vyšší úvěry'],
  },
];

function VizitkaModa({ specialist, onClose }: { specialist: Specialist; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[#E91E63] to-[#C2185B] px-6 pt-6 pb-10 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="text-xs font-medium uppercase tracking-wider opacity-80 mb-1">Hypoteeka.cz</p>
          <h3 className="text-xl font-bold">{specialist.name}</h3>
          <p className="text-sm opacity-90">{specialist.role}</p>
        </div>

        {/* Photo overlap */}
        <div className="flex justify-center -mt-8">
          <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden shadow-lg bg-gray-50">
            <img src={specialist.photo} alt={specialist.name} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pt-3 pb-6">
          <p className="text-sm text-gray-600 text-center mb-4">{specialist.description}</p>

          {/* Specializations */}
          <div className="flex flex-wrap gap-1.5 justify-center mb-5">
            {specialist.specialization.map(s => (
              <span key={s} className="px-2.5 py-1 rounded-full bg-pink-50 text-[11px] font-medium text-[#E91E63]">
                {s}
              </span>
            ))}
          </div>

          {/* Contact actions */}
          <div className="space-y-2">
            <a
              href={`tel:${specialist.phone.replace(/\s/g, '')}`}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-[#E91E63] hover:bg-[#C2185B] text-white text-sm font-medium transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>Zavolat: {specialist.phone}</span>
            </a>
            <a
              href={`mailto:${specialist.email}`}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>{specialist.email}</span>
            </a>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
            <Award className="w-4 h-4 text-[#E91E63]" />
            <p className="text-xs text-gray-400">Konzultace je zcela zdarma a nezávazná</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SpecialistWidget() {
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);

  return (
    <>
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden w-full min-w-0">
        <div className="w-8 h-[3px] rounded-full bg-[#E91E63] mb-4" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
          Dostupní specialisté
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Rádi vám pomůžeme s výběrem té nejlepší hypotéky. Konzultace je zdarma.
        </p>
        <div className="flex items-center gap-5">
          {SPECIALISTS.map((s) => (
            <button
              key={s.name}
              onClick={() => setSelectedSpecialist(s)}
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
            >
              <div className="w-[73px] h-[73px] rounded-full border-2 border-[#E91E63]/20 group-hover:border-[#E91E63]/60 overflow-hidden bg-gray-50 transition-all group-hover:shadow-lg group-hover:shadow-[#E91E63]/10">
                <img src={s.photo} alt={s.name} className="w-full h-full object-cover" />
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-[#E91E63] transition-colors">{s.name}</span>
              <span className="text-[10px] text-gray-400">{s.role}</span>
            </button>
          ))}
        </div>
      </div>

      {selectedSpecialist && (
        <VizitkaModa specialist={selectedSpecialist} onClose={() => setSelectedSpecialist(null)} />
      )}
    </>
  );
}
