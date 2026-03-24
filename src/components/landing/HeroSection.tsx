'use client';

import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { trackEvent } from '@/lib/analytics';

interface Props {
  onStartChat: () => void;
  primaryColor: string;
  logoUrl: string;
  title: string;
  isValuation?: boolean;
}

export function HeroSection({ onStartChat, primaryColor, logoUrl, title, isValuation }: Props) {
  const handleClick = () => {
    trackEvent('landing_cta_click', { section: 'hero' });
    onStartChat();
  };

  return (
    <section className="relative flex flex-col items-center justify-center text-center px-4 pt-24 pb-16 md:pt-32 md:pb-24">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#ffffff] shadow-[0_20px_50px_rgba(0,26,65,0.08)] flex items-center justify-center">
          <Image src={logoUrl} alt={title} width={24} height={24} className="object-contain" />
        </div>
        <span className="text-sm font-bold text-[#001a41]">{title}</span>
      </div>

      <h1 className="text-3xl md:text-5xl font-bold text-[#001a41] tracking-tight leading-tight max-w-2xl mb-4">
        {isValuation
          ? 'Zjistěte tržní cenu své nemovitosti za 2 minuty'
          : 'Zjistěte za 2 minuty, na jakou hypotéku dosáhnete'}
      </h1>

      <p className="text-lg md:text-xl text-[#001a41]/60 max-w-lg mb-8 leading-relaxed">
        {isValuation
          ? 'AI asistent vám pomůže s odhadem ceny bytu, domu i pozemku. Zdarma a nezávazně.'
          : 'AI poradce Hugo vám spočítá splátku, ověří bonitu a spojí vás s hypotečním specialistou. Zdarma.'}
      </p>

      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-8 py-4 rounded-2xl text-white text-lg font-semibold shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        style={{ backgroundColor: primaryColor }}
      >
        {isValuation ? 'Zjistit cenu nemovitosti' : 'Spočítat hypotéku'}
        <ArrowRight className="w-5 h-5" />
      </button>

      <p className="text-sm text-[#001a41]/40 mt-4">Žádná registrace, žádné závazky</p>
    </section>
  );
}
