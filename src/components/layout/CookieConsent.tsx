'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface ConsentState {
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const CONSENT_KEY = 'cookie_consent';

/** Událost s volbou klienta — skripty podle ní naběhnou bez reloadu stránky. */
export const CONSENT_EVENT = 'cookie-consent-change';

const BUTTON_CLASS =
  'flex-1 min-w-[120px] px-4 py-2.5 rounded-xl border border-[#b80049]/30 hover:bg-[#f1f3ff] text-[#001a41] text-sm font-medium transition-colors';

export function getConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  // Předzaškrtnutý souhlas není souhlas (GDPR, § 89 z. 127/2005 Sb.)
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = getConsent();
    if (!existing) {
      setVisible(true);
    }
  }, []);

  const save = (consent: ConsentState) => {
    // Dřív tu byl reload: když se zápis neuložil (plný disk, zablokované
    // úložiště), nová stránka souhlas nenašla a lišta se vracela dokola.
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    } catch {
      // Volba platí aspoň pro tuto návštěvu.
    }
    setVisible(false);
    window.dispatchEvent(new CustomEvent<ConsentState>(CONSENT_EVENT, { detail: consent }));
  };

  const acceptAll = () => {
    save({ analytics: true, marketing: true, timestamp: new Date().toISOString() });
  };

  const acceptSelected = () => {
    save({ analytics, marketing, timestamp: new Date().toISOString() });
  };

  const rejectAll = () => {
    save({ analytics: false, marketing: false, timestamp: new Date().toISOString() });
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-2xl border border-[#e4bdc2]/10 p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#001a41]">Soukromí a cookies</h3>
          <button onClick={rejectAll} className="p-1 rounded-lg hover:bg-[#e9edff] transition-colors">
            <X className="w-4 h-4 text-[#001a41]/40" />
          </button>
        </div>

        <p className="text-xs text-[#001a41]/60 leading-relaxed mb-4">
          Používáme cookies pro fungování webu a analýzu návštěvnosti. Marketingové cookies používáme pouze s vaším souhlasem.{' '}
          <a href="/podminky#cookies" className="underline hover:text-[#b80049]">
            Více v podmínkách.
          </a>
        </p>

        {showDetails && (
          <div className="space-y-3 mb-4 bg-[#f1f3ff] rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-not-allowed">
              <input type="checkbox" checked disabled className="w-4 h-4 rounded accent-gray-400" />
              <div>
                <p className="text-xs font-medium text-[#001a41]/80">Nutné</p>
                <p className="text-[10px] text-[#001a41]/40">Základní funkce webu. Nelze vypnout.</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={analytics}
                onChange={e => setAnalytics(e.target.checked)}
                className="w-4 h-4 rounded accent-[#b80049]"
              />
              <div>
                <p className="text-xs font-medium text-[#001a41]/80">Analytické</p>
                <p className="text-[10px] text-[#001a41]/40">Google Analytics — anonymní analýza návštěvnosti.</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={marketing}
                onChange={e => setMarketing(e.target.checked)}
                className="w-4 h-4 rounded accent-[#b80049]"
              />
              <div>
                <p className="text-xs font-medium text-[#001a41]/80">Marketingové</p>
                <p className="text-[10px] text-[#001a41]/40">Personalizované reklamy na jiných webech.</p>
              </div>
            </label>
          </div>
        )}

        {/* Tři rovnocenná tlačítka — odmítnutí nesmí být těžší než souhlas */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={acceptAll} className={BUTTON_CLASS}>
            Přijmout vše
          </button>
          <button onClick={rejectAll} className={BUTTON_CLASS}>
            Odmítnout vše
          </button>
          {showDetails ? (
            <button onClick={acceptSelected} className={BUTTON_CLASS}>
              Uložit výběr
            </button>
          ) : (
            <button onClick={() => setShowDetails(true)} className={BUTTON_CLASS}>
              Nastavení
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
