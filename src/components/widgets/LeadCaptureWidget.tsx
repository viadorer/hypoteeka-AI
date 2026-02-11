'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    RealvisorWidget?: {
      createContactForm: (
        el: HTMLElement,
        config: Record<string, unknown>
      ) => void;
    };
  }
}

const WIDGET_SCRIPT = 'https://realvisor-com-widget.vercel.app/widget.iife.js';
const REALVISOR_API = 'https://api-production-88cf.up.railway.app/api/v1';
const FORM_CODE = 'kontaktni-formu-65695';

interface Props {
  context?: string;
  prefilledName?: string;
  prefilledEmail?: string;
  prefilledPhone?: string;
  sessionId?: string;
}

export function LeadCaptureWidget({ context, sessionId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current || !containerRef.current) return;
    initRef.current = true;

    const initWidget = () => {
      if (!window.RealvisorWidget || !containerRef.current) return;
      window.RealvisorWidget.createContactForm(containerRef.current, {
        apiUrl: REALVISOR_API,
        formCode: FORM_CODE,
        primaryColor: '#E91E63',
        borderRadius: '16px',
        maxWidth: '100%',
        shadow: 'none',
        onSuccess: (data: Record<string, unknown>) => {
          setSubmitted(true);
          // Uložit lead i do našeho backendu
          const name = (data.name as string) ?? '';
          const email = (data.email as string) ?? '';
          const phone = (data.phone as string) ?? '';
          fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, context, sessionId }),
          }).catch(() => { /* silent - Realvisor already has the lead */ });
        },
      });
    };

    // Load script if not already loaded
    if (window.RealvisorWidget) {
      initWidget();
    } else {
      const existing = document.querySelector(`script[src="${WIDGET_SCRIPT}"]`);
      if (existing) {
        existing.addEventListener('load', initWidget);
      } else {
        const script = document.createElement('script');
        script.src = WIDGET_SCRIPT;
        script.async = true;
        script.onload = initWidget;
        document.head.appendChild(script);
      }
    }
  }, [context, sessionId]);

  if (submitted) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-4 md:p-6 shadow-lg shadow-black/[0.03] animate-in slide-in-from-bottom-4 duration-500 overflow-hidden w-full min-w-0">
        <div className="w-8 h-[3px] rounded-full bg-emerald-500 mb-4" />
        <div className="text-center py-4">
          <p className="text-lg font-semibold text-gray-900 mb-2">Děkujeme za váš zájem</p>
          <p className="text-sm text-gray-500">Náš poradce vás bude kontaktovat v nejbližším možném termínu.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-4 md:p-6 shadow-lg shadow-black/[0.03] animate-in slide-in-from-bottom-4 duration-500 overflow-hidden w-full min-w-0">
      <div className="w-8 h-[3px] rounded-full bg-[#E91E63] mb-4" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
        Nezávazná konzultace
      </p>
      <p className="text-sm text-gray-500 mb-4">
        Nechte nám na sebe kontakt a náš poradce se vám ozve.
      </p>
      <div ref={containerRef} className="w-full min-w-0 overflow-hidden" />
    </div>
  );
}
