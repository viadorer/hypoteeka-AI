'use client';

import { useEffect } from 'react';
import { CONSENT_EVENT, getConsent, type ConsentState } from './CookieConsent';

interface Props {
  gaId: string;
}

/**
 * Loads GA4 only if the user has given analytics consent.
 * If no consent decision has been made yet, GA4 is NOT loaded (GDPR default).
 */
export function ConsentAwareAnalytics({ gaId }: Props) {
  useEffect(() => {
    const load = (consent: ConsentState | null) => {
      // No consent given yet or analytics rejected — don't load
      if (!consent?.analytics) return;

      if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${gaId}"]`)) return;

      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(script);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      w.dataLayer = w.dataLayer || [];
      w.gtag = function () { w.dataLayer.push(arguments); };
      w.gtag('js', new Date());
      w.gtag('config', gaId);
    };

    load(getConsent());

    // Souhlas z lišty přijde událostí — ne z localStorage, ten se nemusel uložit.
    const onConsent = (e: Event) => load((e as CustomEvent<ConsentState>).detail);
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, [gaId]);

  return null;
}
