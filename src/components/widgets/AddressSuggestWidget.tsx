'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Search, Check, Loader2 } from 'lucide-react';

interface SuggestItem {
  name: string;
  label: string;
  lat: number;
  lng: number;
  street: string;
  streetNumber: string;
  city: string;
  district: string;
  region: string;
  postalCode: string;
  location: string;
}

interface AddressSuggestWidgetProps {
  onSend?: (text: string) => void;
  context?: string;
}

export function AddressSuggestWidget({ onSend, context }: AddressSuggestWidgetProps) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<SuggestItem | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setItems([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/valuation/suggest?query=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        setIsOpen((data.items ?? []).length > 0);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelected(null);
    setConfirmed(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleSelect = (item: SuggestItem) => {
    setSelected(item);
    setQuery(item.label);
    setIsOpen(false);
    setConfirmed(false);
  };

  const handleConfirm = () => {
    if (!selected || !onSend) return;
    setConfirmed(true);
    // Send structured address data back to Hugo as a chat message
    const msg = `Potvrzuji adresu: ${selected.label} [ADDRESS_DATA:${JSON.stringify({
      address: selected.label,
      lat: selected.lat,
      lng: selected.lng,
      street: selected.street,
      streetNumber: selected.streetNumber,
      city: selected.city,
      district: selected.district,
      region: selected.region,
      postalCode: selected.postalCode,
    })}]`;
    onSend(msg);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (confirmed && selected) {
    return (
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden w-full min-w-0">
        <div className="w-8 h-[3px] rounded-full bg-emerald-500 mb-4" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Adresa potvrzena
        </p>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Check className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{selected.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{selected.location}</p>
            <p className="text-[10px] text-gray-400 mt-1">
              GPS: {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden w-full min-w-0">
      <div className="w-8 h-[3px] rounded-full bg-[#E91E63] mb-4" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
        Ověření adresy
      </p>
      {context && (
        <p className="text-xs text-gray-500 mb-3">{context}</p>
      )}

      <div className="relative" ref={dropdownRef}>
        {/* Input */}
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => items.length > 0 && !selected && setIsOpen(true)}
            placeholder="Zadejte adresu nemovitosti..."
            className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63]/20 transition-all"
            autoComplete="off"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          )}
          {!isLoading && query.length >= 2 && (
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          )}
        </div>

        {/* Dropdown */}
        {isOpen && items.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => handleSelect(item)}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-b-0"
              >
                <MapPin className="w-4 h-4 text-[#E91E63] mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500 truncate">{item.location}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected address + confirm button */}
      {selected && (
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-sm font-medium text-gray-900">{selected.name}</p>
            <p className="text-xs text-gray-500">{selected.location}</p>
          </div>
          <button
            onClick={handleConfirm}
            className="px-5 py-3 rounded-xl bg-[#E91E63] hover:bg-[#C2185B] text-white text-sm font-medium transition-all flex-shrink-0"
          >
            Potvrdit
          </button>
        </div>
      )}

      <p className="text-[10px] text-gray-400 mt-3">
        Zdroj: Mapy.com
      </p>
    </div>
  );
}
