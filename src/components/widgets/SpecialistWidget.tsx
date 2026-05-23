'use client';

import { useState } from 'react';
import { Phone, Mail, ChevronDown, ChevronUp, User } from 'lucide-react';

interface Specialist {
  name: string;
  photo?: string;
  role: string;
  phone: string;
  email: string;
  description: string;
  specialization: string[];
}

// TODO: Až bude Quadrum CRM napojené, načítat dynamicky podle dostupnosti.
// Zatím aktuální jediný specialista — David Choc.
const SPECIALISTS: Specialist[] = [
  {
    name: 'David Choc',
    // photo: '/images/specialists/david.jpg', // doplnit fotku do public/images/specialists/
    role: 'Hypoteční specialista · Quadrum',
    phone: '+420 774 052 232',
    email: 'david.choc@quadrum.cz',
    description:
      'Vázaný zástupce SAB servis pro spotřebitelské úvěry. Porovnám nabídky 8+ bank a vyjednám podmínky, které běžně nedostanete. Konzultace zdarma.',
    specialization: ['Hypotéky', 'Refinancování', 'Investice', 'OSVČ', 'Mladí do 36'],
  },
];

function initial(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function SpecialistCard({ specialist, isExpanded, onToggle }: { specialist: Specialist; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="flex-1 min-w-0">
      <button
        onClick={onToggle}
        className="w-full flex flex-col items-center gap-1.5 cursor-pointer group"
      >
        <div className="w-[68px] h-[68px] rounded-full border-2 border-[#e9edff] group-hover:border-[#b80049]/40 overflow-hidden bg-gradient-to-br from-[#f1f3ff] to-[#e4bdc2]/20 flex items-center justify-center transition-colors">
          {specialist.photo ? (
            <img src={specialist.photo} alt={specialist.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-semibold text-[#b80049]">{initial(specialist.name)}</span>
          )}
        </div>
        <span className="text-sm font-semibold text-[#001a41]">{specialist.name}</span>
        <span className="text-[10px] text-[#001a41]/40 text-center">{specialist.role}</span>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-[#001a41]/30" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-[#001a41]/30" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 duration-300">
          <p className="text-xs text-[#001a41]/60 text-center leading-relaxed">
            {specialist.description}
          </p>

          <div className="flex flex-wrap justify-center gap-1.5">
            {specialist.specialization.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[10px] font-medium text-[#b80049] bg-[#b80049]/5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <a
              href={`tel:${specialist.phone.replace(/\s/g, '')}`}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#b80049] hover:bg-[#9a003d] text-white text-sm font-medium transition-colors"
            >
              <Phone className="w-4 h-4" />
              {specialist.phone}
            </a>
            <a
              href={`mailto:${specialist.email}`}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-[#e9edff] hover:border-[#b80049]/40 text-[#001a41]/80 hover:text-[#b80049] text-sm font-medium transition-colors"
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
  // U jednoho specialisty rozbalit detail rovnou (žádné klikání).
  const initialExpanded = SPECIALISTS.length === 1 ? 0 : null;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(initialExpanded);

  return (
    <div className="bg-[#ffffff] rounded-2xl p-4 md:p-6 shadow-[0_20px_50px_rgba(0,26,65,0.08)] border border-[#e4bdc2]/10 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden w-full min-w-0">
      <div className="w-8 h-[3px] rounded-full bg-[#b80049] mb-3" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#001a41]/40 mb-0.5">
        <User className="w-3 h-3 inline-block mr-1 -mt-0.5" />
        Váš specialista
      </p>
      <p className="text-xs text-[#001a41]/40 mb-4">
        Vázaný zástupce SAB servis · Konzultace zdarma
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
