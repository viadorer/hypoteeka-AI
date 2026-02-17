'use client';

import { useState } from 'react';
import { useTenant } from '@/lib/tenant/use-tenant';

interface QuickReplyOption {
  label: string;
  value: string;
}

interface QuickReplyWidgetProps {
  question: string;
  options: QuickReplyOption[];
  onSelect: (value: string) => void;
}

export function QuickReplyWidget({ question, options, onSelect }: QuickReplyWidgetProps) {
  const tenant = useTenant();
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (value: string) => {
    setSelected(value);
    onSelect(value);
  };

  return (
    <div className="max-w-md">
      <p className="text-sm text-gray-600 mb-2.5 font-normal">{question}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option, i) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            disabled={selected !== null}
            className={`
              px-4 py-2.5 rounded-full text-[13px] font-normal
              border transition-all duration-200
              animate-in slide-in-from-bottom-1 fade-in
              ${selected === option.value
                ? 'text-white border-transparent scale-[0.97]'
                : selected
                ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                : 'bg-white/80 text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 hover:-translate-y-px active:scale-[0.97] cursor-pointer'
              }
            `}
            style={{
              animationDelay: `${i * 60}ms`,
              animationFillMode: 'both',
              ...(selected === option.value ? { backgroundColor: tenant.branding.primaryColor } : {}),
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
