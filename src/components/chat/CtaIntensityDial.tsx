'use client';

import { useState, useEffect } from 'react';
import { Volume, Volume1, Volume2 } from 'lucide-react';

export type CtaIntensity = 'low' | 'medium' | 'high';

const LEVELS: { value: CtaIntensity; label: string; desc: string; icon: typeof Volume }[] = [
  { value: 'low', label: 'Nízká', desc: 'Kontakt jen na vyžádání', icon: Volume },
  { value: 'medium', label: 'Střední', desc: 'Nabídka po 2+ výpočtech', icon: Volume1 },
  { value: 'high', label: 'Vysoká', desc: 'Aktivní nabídka kontaktu', icon: Volume2 },
];

const STORAGE_KEY = 'hypoteeka_cta_intensity';

interface Props {
  onChange: (intensity: CtaIntensity) => void;
}

export function CtaIntensityDial({ onChange }: Props) {
  const [value, setValue] = useState<CtaIntensity>('medium');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as CtaIntensity | null;
    if (stored && ['low', 'medium', 'high'].includes(stored)) {
      setValue(stored);
      onChange(stored);
    }
  }, [onChange]);

  const handleChange = (newValue: CtaIntensity) => {
    setValue(newValue);
    localStorage.setItem(STORAGE_KEY, newValue);
    onChange(newValue);
  };

  const currentIndex = LEVELS.findIndex(l => l.value === value);
  const current = LEVELS[currentIndex];
  const Icon = current.icon;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => {
          const next = LEVELS[(currentIndex + 1) % LEVELS.length];
          handleChange(next.value);
        }}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
        title={`Intenzita nabídky: ${current.label} - ${current.desc}`}
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{current.label}</span>
      </button>
    </div>
  );
}
