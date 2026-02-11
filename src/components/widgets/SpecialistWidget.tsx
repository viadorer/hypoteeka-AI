'use client';

const SPECIALISTS = [
  { name: 'Míša', photo: '/images/specialists/misa.jpg' },
  { name: 'Filip', photo: '/images/specialists/filip.jpg' },
];

export function SpecialistWidget() {
  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden w-full min-w-0">
      <div className="w-8 h-[3px] rounded-full bg-[#E91E63] mb-4" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
        Dostupní specialisté
      </p>
      <p className="text-sm text-gray-500 mb-4">
        Rádi vám pomůžeme s výběrem té nejlepší hypotéky
      </p>
      <div className="flex items-center gap-5">
        {SPECIALISTS.map((s) => (
          <div key={s.name} className="flex flex-col items-center gap-1.5">
            <div className="w-[73px] h-[73px] rounded-full border-2 border-[#E91E63]/20 overflow-hidden bg-gray-50">
              <img src={s.photo} alt={s.name} className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-medium text-gray-700">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
