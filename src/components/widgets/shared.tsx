'use client';

import { ReactNode } from 'react';

// ─── WIDGET CARD (souldne s redesignem — surface-container-lowest + shadow-soft) ───

interface WidgetCardProps {
  children: ReactNode;
  accentColor?: string;
  label: string;
  icon?: ReactNode;
}

export function WidgetCard({ children, label, icon }: WidgetCardProps) {
  return (
    <div className="bg-surface-container-lowest rounded-3xl p-5 md:p-6 shadow-soft border border-outline-variant/15 w-full animate-in slide-in-from-bottom-4 duration-500 overflow-hidden min-w-0">
      {/* Accent strip — gradient přes primary-container */}
      <div className="w-10 h-[3px] rounded-full mb-4 bg-gradient-to-r from-primary to-primary-container" />
      <div className="flex items-center gap-2 mb-4">
        {icon && <span className="text-primary-container">{icon}</span>}
        <span className="text-label-sm uppercase tracking-widest text-primary font-bold">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

// ─── RESULT BOX (label + value cell) ─────────────

interface ResultBoxProps {
  label: string;
  value: string;
  highlight?: boolean;
}

export function ResultBox({ label, value, highlight }: ResultBoxProps) {
  return (
    <div>
      <div className="text-label-sm text-on-surface-variant/60 uppercase tracking-wider font-bold mb-1">
        {label}
      </div>
      <div
        className={`tabular-nums ${
          highlight
            ? 'text-headline-md text-on-surface font-semibold'
            : 'text-body-md text-on-surface/80 font-medium'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// ─── RESULT ROW (flex row: label ↔ value) ─────────────────

interface ResultRowProps {
  label: string;
  value: string;
  valueColor?: string;
}

export function ResultRow({ label, value, valueColor }: ResultRowProps) {
  return (
    <div className="flex justify-between text-body-md">
      <span className="text-on-surface-variant">{label}</span>
      <span className={`font-medium tabular-nums ${valueColor || 'text-on-surface'}`}>{value}</span>
    </div>
  );
}

// ─── RESULT PANEL (tonal background) ────────────

interface ResultPanelProps {
  children: ReactNode;
  className?: string;
}

export function ResultPanel({ children, className = '' }: ResultPanelProps) {
  return (
    <div className={`mt-4 p-5 bg-surface-container-low rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

// ─── RATIO BAR (progress bar) ────────────────────

interface RatioBarProps {
  ratio: number; // 0-1
  leftColor?: string;
  rightColor?: string;
}

export function RatioBar({ ratio, leftColor, rightColor = 'bg-surface-container-high' }: RatioBarProps) {
  const pct = Math.max(0, Math.min(100, ratio * 100));
  return (
    <div className="flex h-2 rounded-full overflow-hidden mb-3.5">
      <div
        className="rounded-l-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%`, background: leftColor || 'linear-gradient(to right, #b80035, #e11d48)' }}
      />
      <div className={`flex-1 ${rightColor} rounded-r-full`} />
    </div>
  );
}

// ─── STATUS DOT ─────────────────────────────────────────────

export function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${
        ok
          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(52,199,89,0.5)]'
          : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
      }`}
    />
  );
}

// ─── CTA BUTTON (gradient primary → primary-container) ──────

interface CtaButtonProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
}

export function CtaButton({ children, onClick, href }: CtaButtonProps) {
  const cls =
    'w-full mt-4 py-3.5 px-5 rounded-full bg-primary-container text-on-primary-container text-label-md font-bold text-center transition-all shadow-soft hover:shadow-premium hover:scale-[1.01] active:scale-[0.98] cursor-pointer block';
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

// ─── GRID 2-COL (side-by-side stats) ────────────

interface GridProps {
  children: ReactNode;
  cols?: 2 | 3;
}

export function StatGrid({ children, cols = 2 }: GridProps) {
  return (
    <div className={`grid gap-3 ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {children}
    </div>
  );
}

// ─── STAT CARD (big number in a box) ────────────

interface StatCardProps {
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
}

export function StatCard({ label, value, valueColor, sub }: StatCardProps) {
  return (
    <div className="bg-surface-container-low rounded-2xl p-4 min-w-0">
      <div className="text-label-sm text-on-surface-variant/60 font-bold uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className={`text-headline-md font-semibold truncate tabular-nums ${valueColor || 'text-on-surface'}`}>
        {value}
      </div>
      {sub && <div className="text-label-md text-on-surface-variant/60 mt-0.5 normal-case tracking-normal">{sub}</div>}
    </div>
  );
}

// ─── DIVIDER ────────────────────────────────────────────────

export function Divider() {
  return <div className="border-t border-outline-variant/20 my-3" />;
}

// ─── SLIDER INPUT ───────────────────────────────────────────

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
  suffix?: string;
}

export function SliderInput({ label, value, min, max, step, onChange, formatValue, suffix }: SliderInputProps) {
  const display = formatValue ? formatValue(value) : `${value}${suffix ?? ''}`;
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-label-sm text-on-surface-variant/60 font-bold uppercase tracking-wider">
          {label}
        </span>
        <span className="text-body-md font-semibold text-on-surface tabular-nums">{display}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 bg-surface-container-high rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:active:scale-95
            [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md
            [&::-moz-range-thumb]:cursor-pointer"
          style={{
            background: `linear-gradient(to right, #b80035 0%, #e11d48 ${pct}%, #d3e4fe ${pct}%, #d3e4fe 100%)`,
          }}
        />
      </div>
    </div>
  );
}

// ─── SEVERITY COLOR HELPER ──────────────────────────────────

export function severityColor(level: 'ok' | 'warn' | 'danger'): string {
  switch (level) {
    case 'ok':
      return 'text-emerald-600';
    case 'warn':
      return 'text-amber-600';
    case 'danger':
      return 'text-red-600';
  }
}
