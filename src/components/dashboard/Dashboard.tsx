'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, MessageSquare, Home, User, CreditCard, TrendingUp, CheckCircle2, Clock, Plus } from 'lucide-react';

interface SessionProfile {
  propertyPrice?: number;
  propertyType?: string;
  location?: string;
  purpose?: string;
  equity?: number;
  monthlyIncome?: number;
  partnerIncome?: number;
  age?: number;
  currentRent?: number;
  name?: string;
  email?: string;
  phone?: string;
}

interface SessionState {
  phase: string;
  leadScore: number;
  leadQualified: boolean;
  leadCaptured: boolean;
  turnCount: number;
  widgetsShown: string[];
  dataCollected: string[];
}

interface SessionData {
  id: string;
  profile: SessionProfile;
  state: SessionState;
  createdAt: string;
  updatedAt: string;
}

interface DashboardProps {
  sessionId: string;
  onContinueChat: (sessionId: string) => void;
  onNewChat: () => void;
}

const glass = 'bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/[0.03]';

function fmt(n: number): string {
  return n.toLocaleString('cs-CZ');
}

function phaseLabel(phase: string): string {
  const map: Record<string, string> = {
    greeting: 'Zahájeno',
    discovery: 'Sběr dat',
    analysis: 'Analýza',
    qualification: 'Kvalifikace',
    conversion: 'Konverze',
    followup: 'Dokončeno',
  };
  return map[phase] ?? phase;
}

function purposeLabel(p?: string): string {
  const map: Record<string, string> = {
    vlastni_bydleni: 'Vlastní bydlení',
    investice: 'Investice',
    refinancovani: 'Refinancování',
  };
  return p ? (map[p] ?? p) : 'Nezadáno';
}

function widgetLabel(w: string): string {
  const map: Record<string, string> = {
    show_property: 'Přehled nemovitosti',
    show_payment: 'Výpočet splátky',
    show_eligibility: 'Ověření bonity ČNB',
    show_rent_vs_buy: 'Nájem vs. koupě',
    show_investment: 'Investiční analýza',
    show_affordability: 'Kolik si mohu dovolit',
    show_refinance: 'Refinancování',
    show_amortization: 'Splátkový kalendář',
    show_lead_capture: 'Kontaktní formulář',
  };
  return map[w] ?? w;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleString('cs-CZ', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function Dashboard({ sessionId, onContinueChat, onNewChat }: DashboardProps) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/sessions')
      .then(r => r.json())
      .then((data: SessionData[]) => {
        const found = data.find(s => s.id === sessionId);
        setSession(found ?? null);
      })
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex-1 md:ml-[260px] flex items-center justify-center min-h-screen pt-16 md:pt-0 overflow-x-hidden">
        <p className="text-gray-400 text-sm">Načítám...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 md:ml-[260px] flex flex-col items-center justify-center min-h-screen pt-16 md:pt-0 px-4 overflow-x-hidden">
        <p className="text-gray-500 text-base mb-4">Analýza nebyla nalezena.</p>
        <button onClick={onNewChat} className="px-4 py-2 bg-[#E91E63] text-white rounded-xl text-sm font-medium hover:bg-[#C2185B] transition-colors">
          Nová kalkulace
        </button>
      </div>
    );
  }

  const p = session.profile;
  const s = session.state;

  // Calculate LTV if we have data
  const loanAmount = (p.propertyPrice && p.equity) ? p.propertyPrice - p.equity : null;
  const ltv = (loanAmount && p.propertyPrice) ? (loanAmount / p.propertyPrice * 100) : null;

  return (
    <div className="flex-1 md:ml-[260px] min-h-screen pt-16 md:pt-0 overflow-y-auto overflow-x-hidden min-w-0 w-full">
      <div className="max-w-[800px] mx-auto px-4 py-6 md:py-12 w-full min-w-0">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-3">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 truncate">
              {p.propertyPrice ? `Nemovitost ${fmt(p.propertyPrice)} Kč` : `Analýza ${sessionId.slice(0, 8)}`}
            </h1>
            <p className="text-xs md:text-sm text-gray-400 truncate">
              {formatDate(session.createdAt)}
              {session.updatedAt !== session.createdAt && ` -- aktualizováno ${formatDate(session.updatedAt)}`}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => onContinueChat(sessionId)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E91E63] text-white rounded-xl text-sm font-medium hover:bg-[#C2185B] transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Pokračovat v chatu</span>
              <span className="sm:hidden">Chat</span>
            </button>
            <button
              onClick={onNewChat}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${glass} hover:bg-white/80 text-gray-600`}
            >
              <Plus className="w-4 h-4" />
              Nová
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className={`rounded-2xl p-5 mb-6 ${glass}`}>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Fáze</p>
              <p className="text-sm font-semibold text-gray-900">{phaseLabel(s.phase)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Lead score</p>
              <p className={`text-sm font-semibold ${s.leadScore >= 60 ? 'text-green-600' : s.leadScore >= 30 ? 'text-amber-600' : 'text-gray-500'}`}>
                {s.leadScore}/100
                {s.leadQualified && <span className="ml-1 text-green-600">(kvalifikovaný)</span>}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Zprávy</p>
              <p className="text-sm font-semibold text-gray-900">{s.turnCount}</p>
            </div>
            {s.leadCaptured && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Kontakt</p>
                <p className="text-sm font-semibold text-green-600">Odeslán</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

          {/* Nemovitost */}
          <div className={`rounded-2xl p-5 ${glass}`}>
            <div className="flex items-center gap-2 mb-4">
              <Home className="w-5 h-5 text-[#E91E63]" />
              <h2 className="text-base font-bold text-gray-900">Nemovitost</h2>
            </div>
            <div className="space-y-3">
              <Row label="Cena" value={p.propertyPrice ? `${fmt(p.propertyPrice)} Kč` : null} />
              <Row label="Typ" value={p.propertyType} />
              <Row label="Lokalita" value={p.location} />
              <Row label="Účel" value={purposeLabel(p.purpose)} />
              <Row label="Vlastní zdroje" value={p.equity ? `${fmt(p.equity)} Kč` : null} />
              {loanAmount && <Row label="Výše úvěru" value={`${fmt(loanAmount)} Kč`} highlight />}
              {ltv !== null && (
                <Row
                  label="LTV"
                  value={`${ltv.toFixed(1)} %`}
                  highlight
                  warn={ltv > 80}
                />
              )}
            </div>
          </div>

          {/* Klient */}
          <div className={`rounded-2xl p-5 ${glass}`}>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-[#0047FF]" />
              <h2 className="text-base font-bold text-gray-900">Klient</h2>
            </div>
            <div className="space-y-3">
              <Row label="Jméno" value={p.name} />
              <Row label="E-mail" value={p.email} />
              <Row label="Telefon" value={p.phone} />
              <Row label="Věk" value={p.age ? `${p.age} let` : null} />
              <Row label="Měsíční příjem" value={p.monthlyIncome ? `${fmt(p.monthlyIncome)} Kč` : null} />
              {p.partnerIncome && <Row label="Příjem partnera" value={`${fmt(p.partnerIncome)} Kč`} />}
              {p.currentRent && <Row label="Současný nájem" value={`${fmt(p.currentRent)} Kč`} />}
            </div>
          </div>
        </div>

        {/* Provedené analýzy */}
        {s.widgetsShown.length > 0 && (
          <div className={`rounded-2xl p-5 mb-6 ${glass}`}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-[#E91E63]" />
              <h2 className="text-base font-bold text-gray-900">Provedené analýzy</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {s.widgetsShown.map(w => (
                <div key={w} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/40">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{widgetLabel(w)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sesbíraná data */}
        {s.dataCollected.length > 0 && (
          <div className={`rounded-2xl p-5 mb-6 ${glass}`}>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-[#0047FF]" />
              <h2 className="text-base font-bold text-gray-900">Sesbíraná data</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {s.dataCollected.map(field => (
                <span key={field} className="px-3 py-1.5 rounded-lg bg-blue-50/80 text-xs font-medium text-[#0047FF]">
                  {fieldLabel(field)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className={`rounded-2xl p-5 ${glass}`}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-400" />
            <h2 className="text-base font-bold text-gray-900">Časová osa</h2>
          </div>
          <div className="space-y-2 text-sm text-gray-500">
            <p>Vytvořeno: {formatDate(session.createdAt)}</p>
            <p>Poslední aktivita: {formatDate(session.updatedAt)}</p>
          </div>
        </div>

      </div>
    </div>
  );
}

function Row({ label, value, highlight, warn }: { label: string; value?: string | null; highlight?: boolean; warn?: boolean }) {
  if (!value || value === 'Nezadáno') {
    return (
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs text-gray-300">--</span>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-medium ${warn ? 'text-red-600' : highlight ? 'text-[#E91E63]' : 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
}

function fieldLabel(field: string): string {
  const map: Record<string, string> = {
    propertyPrice: 'Cena nemovitosti',
    propertyType: 'Typ nemovitosti',
    location: 'Lokalita',
    purpose: 'Účel',
    equity: 'Vlastní zdroje',
    monthlyIncome: 'Měsíční příjem',
    partnerIncome: 'Příjem partnera',
    age: 'Věk',
    currentRent: 'Nájem',
    name: 'Jméno',
    email: 'E-mail',
    phone: 'Telefon',
    existingLoans: 'Závazky',
    existingMortgageBalance: 'Zůstatek hypotéky',
    existingMortgageRate: 'Sazba hypotéky',
  };
  return map[field] ?? field;
}
