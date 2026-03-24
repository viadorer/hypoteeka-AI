'use client';

import { HeroSection } from './HeroSection';
import { HowItWorks } from './HowItWorks';
import { TrustSection } from './TrustSection';
import { TestimonialSection } from './TestimonialSection';
import { ArrowRight } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface Props {
  onStartChat: () => void;
  primaryColor: string;
  logoUrl: string;
  title: string;
  isValuation?: boolean;
}

export function LandingPage({ onStartChat, primaryColor, logoUrl, title, isValuation }: Props) {
  return (
    <div className="min-h-screen bg-[#f9f9ff] overflow-y-auto">
      <HeroSection
        onStartChat={onStartChat}
        primaryColor={primaryColor}
        logoUrl={logoUrl}
        title={title}
        isValuation={isValuation}
      />

      <TrustSection primaryColor={primaryColor} />

      <HowItWorks primaryColor={primaryColor} isValuation={isValuation} />

      {!isValuation && <TestimonialSection primaryColor={primaryColor} />}

      {/* Bottom CTA */}
      <section className="px-4 py-16 md:py-20 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-[#001a41] mb-4">
          {isValuation ? 'Připraveni zjistit cenu?' : 'Připraveni na vlastní bydlení?'}
        </h2>
        <p className="text-[#001a41]/60 mb-8 max-w-md mx-auto">
          {isValuation
            ? 'Začněte konverzaci s naším AI asistentem a získejte odhad ceny zdarma.'
            : 'Začněte konverzaci s Hugem a zjistěte, na co dosáhnete. Je to zdarma a nezávazné.'}
        </p>
        <button
          onClick={() => { trackEvent('landing_cta_click', { section: 'bottom' }); onStartChat(); }}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white text-lg font-semibold shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          style={{ backgroundColor: primaryColor }}
        >
          Začít zdarma
          <ArrowRight className="w-5 h-5" />
        </button>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 text-center border-t border-[#e4bdc2]/10">
        <p className="text-xs text-[#001a41]/40">
          {title} &middot; AI průvodce &middot; Data z ČNB ARAD &middot; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
