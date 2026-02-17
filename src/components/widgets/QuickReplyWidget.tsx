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
    // Send selection after brief delay for visual feedback
    setTimeout(() => {
      onSelect(value);
    }, 150);
  };

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/[0.03] rounded-2xl p-4 max-w-md">
      <p className="text-sm text-gray-700 mb-3 font-medium">{question}</p>
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            disabled={selected !== null}
            className={`
              px-4 py-3 rounded-xl text-sm font-medium text-left transition-all
              ${selected === option.value
                ? 'text-white shadow-lg scale-[0.98]'
                : selected
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white hover:bg-gray-50 text-gray-800 hover:shadow-md active:scale-[0.98] cursor-pointer'
              }
            `}
            style={selected === option.value ? {
              backgroundColor: tenant.branding.primaryColor,
            } : {}}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
