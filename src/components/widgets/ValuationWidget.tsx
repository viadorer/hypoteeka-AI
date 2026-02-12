'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    RealvisorWidget?: {
      createContactForm: (
        container: HTMLElement,
        config: Record<string, unknown>
      ) => void;
    };
  }
}

const WIDGET_SCRIPT_URL = 'https://realvisor-com-widget.vercel.app/widget.iife.js';
const API_URL = 'https://api-production-88cf.up.railway.app/api/v1';
const FORM_CODE = 'valuo-main';
const PRIMARY_COLOR = '#E91E63';

interface Props {
  context?: string;
}

export function ValuationWidget({ context }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const initWidget = () => {
      if (!window.RealvisorWidget || !containerRef.current) {
        setError(true);
        return;
      }
      try {
        window.RealvisorWidget.createContactForm(containerRef.current, {
          apiUrl: API_URL,
          formCode: FORM_CODE,
          primaryColor: PRIMARY_COLOR,
          borderRadius: '16px',
          maxWidth: '100%',
          shadow: 'none',
        });
        setLoaded(true);
      } catch {
        setError(true);
      }
    };

    // Check if script already loaded
    if (window.RealvisorWidget) {
      initWidget();
      return;
    }

    // Load script
    const existing = document.querySelector(`script[src="${WIDGET_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', initWidget);
      return;
    }

    const script = document.createElement('script');
    script.src = WIDGET_SCRIPT_URL;
    script.async = true;
    script.onload = initWidget;
    script.onerror = () => setError(true);
    document.head.appendChild(script);
  }, []);

  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden w-full min-w-0">
      <div className="w-8 h-[3px] rounded-full bg-[#E91E63] mb-4" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
        Ocenění nemovitosti
      </p>
      {context && (
        <p className="text-sm text-gray-500 mb-3">{context}</p>
      )}

      {error ? (
        <p className="text-sm text-gray-500 py-4">
          Formulář se nepodařilo načíst. Zkuste to prosím později.
        </p>
      ) : (
        <>
          {!loaded && (
            <div className="flex items-center gap-2 py-4">
              <div className="w-4 h-4 border-2 border-[#E91E63] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">Načítám formulář...</span>
            </div>
          )}
          <div ref={containerRef} className="w-full" />
        </>
      )}
    </div>
  );
}
