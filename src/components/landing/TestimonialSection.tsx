'use client';

import { Star } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Martina K.',
    location: 'Praha',
    text: 'Hugo mi pomohl zorientovat se v nabídkách bank. Díky poradci jsem ušetřila přes 200 tisíc na úrocích.',
    rating: 5,
  },
  {
    name: 'Tomáš P.',
    location: 'Brno',
    text: 'Konečně někdo, kdo vysvětlí hypotéku srozumitelně. Za 5 minut jsem věděl, na co dosáhnu.',
    rating: 5,
  },
  {
    name: 'Lucie M.',
    location: 'Ostrava',
    text: 'Refinancování jsem řešila měsíce. Tady mi poradce vyřídil vše za týden. Sazba klesla o 1,5 %.',
    rating: 5,
  },
];

interface Props {
  primaryColor: string;
}

export function TestimonialSection({ primaryColor }: Props) {
  return (
    <section className="px-4 py-16 md:py-20">
      <div className="max-w-3xl mx-auto">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#001a41]/40 text-center mb-2">
          Co říkají klienti
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-[#001a41] text-center mb-12">
          Přečtěte si zkušenosti ostatních
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-[#ffffff] rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,26,65,0.08)] border border-[#e4bdc2]/10"
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" style={{ color: primaryColor }} />
                ))}
              </div>
              <p className="text-sm text-[#001a41]/70 leading-relaxed mb-4">
                &ldquo;{t.text}&rdquo;
              </p>
              <div>
                <p className="text-sm font-semibold text-[#001a41]">{t.name}</p>
                <p className="text-xs text-[#001a41]/40">{t.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
