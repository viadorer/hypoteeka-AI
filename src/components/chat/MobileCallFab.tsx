'use client';

import { useState, useEffect } from 'react';
import { Phone, X } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface Props {
  hasSeenWidget: boolean;
  hasConverted: boolean;
}

/**
 * Floating "Zavolat" button visible only on mobile after a widget has been shown.
 * Appears in the bottom-right corner above the input bar.
 */
export function MobileCallFab({ hasSeenWidget, hasConverted }: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!isMobile || !hasSeenWidget || hasConverted || dismissed) return null;

  return (
    <div className="fixed bottom-28 right-4 z-40 flex items-center gap-1 animate-in slide-in-from-right-4 duration-500">
      <button
        onClick={() => setDismissed(true)}
        className="w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center"
      >
        <X className="w-3 h-3 text-[#001a41]/40" />
      </button>
      <a
        href="tel:+420777123456"
        onClick={() => trackEvent('mobile_call_fab_click')}
        className="flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-[#b80049] to-[#e2165f] text-white shadow-[0_4px_20px_rgba(184,0,73,0.3)] transition-colors"
      >
        <Phone className="w-4 h-4" />
        <span className="text-sm font-medium">Zavolat</span>
      </a>
    </div>
  );
}
