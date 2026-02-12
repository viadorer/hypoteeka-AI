'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    RealVisor?: {
      createContactForm: (
        container: HTMLElement,
        config: Record<string, unknown>
      ) => void;
      createValuoForm: (
        container: HTMLElement,
        config: Record<string, unknown>
      ) => Promise<void>;
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
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;

    const initWidget = async () => {
      if (cancelled || !containerRef.current) return;
      if (!window.RealVisor) return;
      try {
        await window.RealVisor.createValuoForm(containerRef.current, {
          apiUrl: API_URL,
          formCode: FORM_CODE,
          primaryColor: PRIMARY_COLOR,
          borderRadius: '16px',
          maxWidth: '100%',
          shadow: 'none',
        });
        if (!cancelled) setLoaded(true);
      } catch (err) {
        console.error('[ValuationWidget] init error:', err);
        if (!cancelled) setError(true);
      }
    };

    const pollForWidget = (attempts = 0) => {
      if (cancelled) return;
      if (window.RealVisor) {
        initWidget();
        return;
      }
      if (attempts > 50) {
        setError(true);
        return;
      }
      pollTimer = setTimeout(() => pollForWidget(attempts + 1), 200);
    };

    // Check if already available
    if (window.RealVisor) {
      initWidget();
    } else {
      // Load script if not present
      const existing = document.querySelector(`script[src="${WIDGET_SCRIPT_URL}"]`);
      if (!existing) {
        const script = document.createElement('script');
        script.src = WIDGET_SCRIPT_URL;
        script.async = true;
        script.onload = () => pollForWidget(0);
        script.onerror = () => { if (!cancelled) setError(true); };
        document.body.appendChild(script);
      } else {
        pollForWidget(0);
      }
    }

    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
    };
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
