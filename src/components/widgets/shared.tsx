'use client';

import { ReactNode } from 'react';

// ─── WIDGET CARD (light card wrapper) ───────────────────────

interface WidgetCardProps {
  children: ReactNode;
  accentColor?: string;
  label: string;
  icon?: ReactNode;
}

export function WidgetCard({ children, accentColor = '#b80049', label, icon }: WidgetCardProps) {
  return (
    <div className="bg-[#ffffff] rounded-2xl p-4 md:p-6 shadow-[0_20px_50px_rgba(0,26,65,0.08)] border border-[#e4bdc2]/10 w-full animate-in slide-in-from-bottom-4 duration-500 overflow-hidden min-w-0">
      <div className="w-8 h-[3px] rounded-full mb-4" style={{ background: `linear-gradient(to right, ${accentColor}, #e2165f)` }} />
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-[#b80049]/60">{icon}</span>}
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#b80049]">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

// ─── RESULT BOX (grid cell with label + value) ─────────────

interface ResultBoxProps {
  label: string;
  value: string;
  highlight?: boolean;
}

export function ResultBox({ label, value, highlight }: ResultBoxProps) {
  return (
    <div>
      <div className="text-[10px] text-[#001a41]/40 uppercase tracking-wider font-bold mb-1">{label}</div>
      <div
        className={`tabular-nums ${
          highlight
            ? 'text-lg font-semibold text-[#001a41]'
            : 'text-sm font-medium text-[#001a41]/80'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// ─── RESULT ROW (flex row: label ... value) ─────────────────

interface ResultRowProps {
  label: string;
  value: string;
  valueColor?: string;
}

export function ResultRow({ label, value, valueColor }: ResultRowProps) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[#001a41]/60">{label}</span>
      <span className={`font-medium tabular-nums ${valueColor || 'text-[#001a41]'}`}>{value}</span>
    </div>
  );
}

// ─── RESULT PANEL (tonal background for results) ────────────

interface ResultPanelProps {
  children: ReactNode;
  className?: string;
}

export function ResultPanel({ children, className = '' }: ResultPanelProps) {
  return (
    <div className={`mt-4 p-4 bg-[#f1f3ff] rounded-xl ${className}`}>
      {children}
    </div>
  );
}

// ─── RATIO BAR (horizontal progress bar) ────────────────────

interface RatioBarProps {
  ratio: number; // 0-1
  leftColor?: string;
  rightColor?: string;
}

export function RatioBar({ ratio, leftColor, rightColor = 'bg-[#e9edff]' }: RatioBarProps) {
  const pct = Math.max(0, Math.min(100, ratio * 100));
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden mb-3.5">
      <div
        className="rounded-l-full transition-all duration-400"
        style={{ width: `${pct}%`, background: leftColor || 'linear-gradient(to right, #b80049, #e2165f)' }}
      />
      <div className={`flex-1 ${rightColor} rounded-r-full`} />
    </div>
  );
}

// ─── STATUS DOT ─────────────────────────────────────────────

export function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${
        ok ? 'bg-emerald-500 shadow-[0_0_6px_rgba(52,199,89,0.4)]' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]'
      }`}
    />
  );
}

// ─── CTA BUTTON ─────────────────────────────────────────────

interface CtaButtonProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
}

export function CtaButton({ children, onClick, href }: CtaButtonProps) {
  const cls = "w-full mt-3.5 py-3 px-4 rounded-full bg-gradient-to-r from-[#b80049] to-[#e2165f] text-white text-[13px] font-bold text-center transition-all shadow-[0_4px_20px_rgba(184,0,73,0.3)] hover:shadow-[0_4px_30px_rgba(184,0,73,0.4)] hover:opacity-95 active:scale-[0.98] cursor-pointer block";
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

// ─── GRID 2-COL (for side-by-side stats) ────────────────────

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

// ─── STAT CARD (big number in a box) ────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
}

export function StatCard({ label, value, valueColor, sub }: StatCardProps) {
  return (
    <div className="bg-[#f1f3ff] rounded-xl p-3 min-w-0">
      <div className="text-[10px] text-[#001a41]/40 font-bold uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-semibold truncate tabular-nums ${valueColor || 'text-[#001a41]'}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-[#001a41]/40 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── DIVIDER ────────────────────────────────────────────────

export function Divider() {
  return <div className="border-t border-[#e9edff] my-3" />;
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
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-[10px] text-[#001a41]/40 font-bold uppercase tracking-wider">{label}</span>
        <span className="text-sm font-semibold text-[#001a41] tabular-nums">{display}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 bg-[#e9edff] rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#b80049] [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:active:scale-95
            [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-[#b80049] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md
            [&::-moz-range-thumb]:cursor-pointer"
          style={{
            background: `linear-gradient(to right, #b80049 0%, #b80049 ${pct}%, #e9edff ${pct}%, #e9edff 100%)`,
          }}
        />
      </div>
    </div>
  );
}

// ─── SEVERITY COLOR HELPER ──────────────────────────────────

export function severityColor(level: 'ok' | 'warn' | 'danger'): string {
  switch (level) {
    case 'ok': return 'text-emerald-600';
    case 'warn': return 'text-amber-600';
    case 'danger': return 'text-red-600';
  }
}
