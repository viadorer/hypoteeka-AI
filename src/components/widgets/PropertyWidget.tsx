'use client';

import { formatCZK } from '@/lib/format';

interface Props {
  propertyPrice: number;
  propertyType?: string;
  location?: string;
}

export function PropertyWidget({ propertyPrice, propertyType, location }: Props) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
      <div className="w-8 h-[3px] rounded-full bg-[#E91E63] mb-4" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Nemovitost
      </p>
      <p className="text-3xl font-bold text-gray-900 tracking-tight">
        {formatCZK(propertyPrice)}
      </p>
      <div className="mt-2 text-sm text-gray-500">
        {propertyType && <span className="capitalize">{propertyType}</span>}
        {propertyType && location && <span> / </span>}
        {location && <span>{location}</span>}
        {!propertyType && !location && <span>Odhadní cena nemovitosti</span>}
      </div>
    </div>
  );
}
