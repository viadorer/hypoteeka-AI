'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ConsentState {
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const CONSENT_KEY = 'cookie_consent';

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
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = getConsent();
    if (!existing) {
      setVisible(true);
    }
  }, []);

  const save = (consent: ConsentState) => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    setVisible(false);
    // Reload to apply consent (GA4 checks consent on load)
    window.location.reload();
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
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Soukromí a cookies</h3>
          <button onClick={rejectAll} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed mb-4">
          Používáme cookies pro fungování webu a analýzu návštěvnosti. Marketingové cookies používáme pouze s vaším souhlasem.
        </p>

        {showDetails && (
          <div className="space-y-3 mb-4 bg-gray-50 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-not-allowed">
              <input type="checkbox" checked disabled className="w-4 h-4 rounded accent-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-700">Nutné</p>
                <p className="text-[10px] text-gray-400">Základní funkce webu. Nelze vypnout.</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={analytics}
                onChange={e => setAnalytics(e.target.checked)}
                className="w-4 h-4 rounded accent-[#E91E63]"
              />
              <div>
                <p className="text-xs font-medium text-gray-700">Analytické</p>
                <p className="text-[10px] text-gray-400">Google Analytics — anonymní analýza návštěvnosti.</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={marketing}
                onChange={e => setMarketing(e.target.checked)}
                className="w-4 h-4 rounded accent-[#E91E63]"
              />
              <div>
                <p className="text-xs font-medium text-gray-700">Marketingové</p>
                <p className="text-[10px] text-gray-400">Personalizované reklamy na jiných webech.</p>
              </div>
            </label>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={acceptAll}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#E91E63] hover:bg-[#C2185B] text-white text-sm font-medium transition-colors"
          >
            Přijmout vše
          </button>
          {showDetails ? (
            <button
              onClick={acceptSelected}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
            >
              Uložit výběr
            </button>
          ) : (
            <button
              onClick={() => setShowDetails(true)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
            >
              Nastavení
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
