'use client';

import { useState, useEffect, useRef } from 'react';
import { Mail, X } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface Props {
  /** Only show after at least one widget was displayed */
  hasSeenWidget: boolean;
  /** Don't show if user already converted */
  hasConverted: boolean;
  /** Send message to chat (for email capture via AI) */
  onSend: (text: string) => void;
}

export function ExitIntentOverlay({ hasSeenWidget, hasConverted, onSend }: Props) {
  const [visible, setVisible] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current || !hasSeenWidget || hasConverted) return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger when mouse leaves through the top of the viewport
      if (e.clientY > 10) return;
      if (shownRef.current) return;
      shownRef.current = true;
      setVisible(true);
      trackEvent('exit_intent_shown');
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [hasSeenWidget, hasConverted]);

  if (!visible) return null;

  const handleEmailCapture = () => {
    onSend('Chci odeslat kalkulaci na email.');
    setVisible(false);
    trackEvent('exit_intent_email_click');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-full bg-[#E91E63]/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-[#E91E63]" />
          </div>
          <button
            onClick={() => { setVisible(false); trackEvent('exit_intent_dismissed'); }}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Nechcete si uložit kalkulaci?
        </h3>
        <p className="text-sm text-gray-500 mb-5">
          Pošleme vám výsledky na email, abyste je měli po ruce.
        </p>

        <button
          onClick={handleEmailCapture}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#E91E63] hover:bg-[#C2185B] text-white text-sm font-medium transition-colors"
        >
          <Mail className="w-4 h-4" />
          Odeslat na email
        </button>

        <button
          onClick={() => setVisible(false)}
          className="w-full mt-2 px-4 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Ne, děkuji
        </button>
      </div>
    </div>
  );
}
