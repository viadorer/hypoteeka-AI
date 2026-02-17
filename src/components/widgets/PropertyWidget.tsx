'use client';

import { formatCZK } from '@/lib/format';
import { WidgetCard } from './shared';

interface Props {
  propertyPrice: number;
  propertyType?: string;
  location?: string;
}

const BuildingIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
  </svg>
);

export function PropertyWidget({ propertyPrice, propertyType, location }: Props) {
  return (
    <WidgetCard label="Nemovitost" icon={BuildingIcon}>
      <div className="text-[28px] font-semibold text-gray-900 tracking-tight truncate">
        {formatCZK(propertyPrice)}
      </div>
      <div className="text-[13px] text-gray-400 mt-1">
        {propertyType && <span className="capitalize">{propertyType}</span>}
        {propertyType && location && <span> / </span>}
        {location && <span>{location}</span>}
        {!propertyType && !location && <span>Odhadní cena nemovitosti</span>}
      </div>
    </WidgetCard>
  );
}
