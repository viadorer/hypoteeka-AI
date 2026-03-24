'use client';

import { Users, Building2, ShieldCheck, Star } from 'lucide-react';

interface Props {
  primaryColor: string;
}

const STATS = [
  { icon: Users, value: '1 000+', label: 'spokojených klientů' },
  { icon: Building2, value: '8+', label: 'partnerských bank' },
  { icon: ShieldCheck, value: '100%', label: 'certifikovaní poradci' },
  { icon: Star, value: '4.9', label: 'hodnocení klientů' },
];

export function TrustSection({ primaryColor }: Props) {
  return (
    <section className="px-4 py-12 md:py-16 bg-white/50">
      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="text-center">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: `${primaryColor}10` }}
                >
                  <Icon className="w-5 h-5" style={{ color: primaryColor }} />
                </div>
                <p className="text-2xl font-bold text-[#001a41]">{stat.value}</p>
                <p className="text-xs text-[#001a41]/40 mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
