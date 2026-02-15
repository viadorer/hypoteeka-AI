'use client';

import { TrendingUp, MapPin, Clock, Mail, Phone, ArrowRight } from 'lucide-react';

interface Props {
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  avgPriceM2: number;
  avgDuration?: number;
  address?: string;
  propertyType?: string;
  emailSent?: boolean;
  contactEmail?: string;
  comment?: string;
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('cs-CZ');
}

export function ValuationResultWidget({
  avgPrice, minPrice, maxPrice, avgPriceM2, avgDuration,
  address, propertyType, emailSent, contactEmail, comment,
}: Props) {
  const typeLabel: Record<string, string> = { flat: 'Byt', house: 'Dům', land: 'Pozemek' };
  const label = typeLabel[propertyType ?? ''] ?? 'Nemovitost';
  const rangePercent = avgPrice > 0 ? Math.round(((maxPrice - minPrice) / avgPrice) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500 w-full min-w-0">
      {/* Header accent */}
      <div className="w-8 h-[3px] rounded-full bg-emerald-500 mb-4" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
        Orientační ocenění
      </p>

      {/* Property info */}
      {address && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{label} -- {address}</span>
        </div>
      )}

      {/* Main price */}
      <div className="mb-4">
        <p className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
          {fmt(avgPrice)} Kč
        </p>
        <p className="text-xs text-gray-400 mt-1">odhadní tržní cena</p>
      </div>

      {/* Price range bar */}
      <div className="mb-5">
        <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
          <span>{fmt(minPrice)} Kč</span>
          <span>{fmt(maxPrice)} Kč</span>
        </div>
        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-200 via-emerald-400 to-emerald-200 rounded-full" />
          {/* Marker for avg price */}
          <div
            className="absolute top-0 h-full w-0.5 bg-gray-900"
            style={{ left: avgPrice > 0 ? `${((avgPrice - minPrice) / (maxPrice - minPrice)) * 100}%` : '50%' }}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-center">
          rozptyl {rangePercent}%
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          label="Cena za m²"
          value={`${fmt(avgPriceM2)} Kč`}
        />
        {avgDuration !== undefined && avgDuration > 0 && (
          <StatCard
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Prům. doba prodeje"
            value={`${avgDuration} dní`}
          />
        )}
      </div>

      {/* Email confirmation */}
      {emailSent && contactEmail && (
        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2 mb-4">
          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Podrobný report odeslán na <strong>{contactEmail}</strong></span>
        </div>
      )}

      {/* Hugo's comment */}
      {comment && (
        <div className="text-sm text-gray-600 leading-relaxed mb-4 border-l-2 border-gray-200 pl-3">
          {comment}
        </div>
      )}

      {/* CTA footer */}
      <div className="bg-gray-50 -mx-4 md:-mx-6 -mb-4 md:-mb-6 px-4 md:px-6 py-3 md:py-4 rounded-b-2xl border-t border-gray-100">
        <div className="flex items-start gap-2">
          <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-gray-700">
              Specialista vás bude kontaktovat
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Pro zpřesnění odhadu a nezávaznou konzultaci zdarma
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 ml-auto mt-0.5 flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}
