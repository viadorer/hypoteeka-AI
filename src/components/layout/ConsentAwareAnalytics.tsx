'use client';

import { useEffect } from 'react';
import { getConsent } from './CookieConsent';

interface Props {
  gaId: string;
}

/**
 * Loads GA4 only if the user has given analytics consent.
 * If no consent decision has been made yet, GA4 is NOT loaded (GDPR default).
 */
export function ConsentAwareAnalytics({ gaId }: Props) {
  useEffect(() => {
    const consent = getConsent();

    // No consent given yet or analytics rejected — don't load
    if (!consent || !consent.analytics) return;

    // Already loaded (e.g., after consent given and page reloaded)
    if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${gaId}"]`)) return;

    // Load GA4
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
  }, [gaId]);

  return null;
}
