'use client';

import { ReactNode } from 'react';

// ─── WIDGET CARD (glass card wrapper) ───────────────────────

interface WidgetCardProps {
  children: ReactNode;
  accentColor?: string;
  label: string;
  icon?: ReactNode;
}

export function WidgetCard({ children, accentColor = '#E91E63', label, icon }: WidgetCardProps) {
  return (
    <div className="bg-white/[0.025] border border-white/[0.07] rounded-[18px] p-[18px] w-full animate-in slide-in-from-bottom-3 duration-400">
      <div className="flex items-center gap-2 mb-3.5 pb-3 border-b border-white/[0.05]">
        {icon && <span className="text-white/50">{icon}</span>}
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/50">
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
      <div className="text-[10px] text-white/30 uppercase tracking-[0.05em] mb-1">{label}</div>
      <div
        className={`tabular-nums ${
          highlight
            ? 'text-lg font-semibold text-white'
            : 'text-sm font-medium text-white/70'
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
      <span className="text-white/40">{label}</span>
      <span className={`font-medium tabular-nums ${valueColor || 'text-white/70'}`}>{value}</span>
    </div>
  );
}

// ─── RESULT PANEL (glass background for results) ────────────

interface ResultPanelProps {
  children: ReactNode;
  className?: string;
}

export function ResultPanel({ children, className = '' }: ResultPanelProps) {
  return (
    <div className={`mt-4 p-4 bg-white/[0.03] rounded-[14px] border border-white/[0.06] ${className}`}>
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

export function RatioBar({ ratio, leftColor = 'bg-white', rightColor = 'bg-white/[0.12]' }: RatioBarProps) {
  const pct = Math.max(0, Math.min(100, ratio * 100));
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden mb-3.5">
      <div className={`${leftColor} rounded-l-full transition-all duration-400`} style={{ width: `${pct}%` }} />
      <div className={`flex-1 ${rightColor} rounded-r-full`} />
    </div>
  );
}

// ─── STATUS DOT ─────────────────────────────────────────────

export function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${
        ok ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,199,89,0.4)]' : 'bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.4)]'
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
  const cls = "w-full mt-3.5 py-3 px-4 rounded-full bg-white text-[#111] text-[13px] font-medium text-center transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer block";
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
    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06] min-w-0">
      <div className="text-[11px] text-white/35 mb-1">{label}</div>
      <div className={`text-lg font-semibold truncate tabular-nums ${valueColor || 'text-white'}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-white/30 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── DIVIDER ────────────────────────────────────────────────

export function Divider() {
  return <div className="border-t border-white/[0.06] my-3" />;
}

// ─── SEVERITY COLOR HELPER ──────────────────────────────────

export function severityColor(level: 'ok' | 'warn' | 'danger'): string {
  switch (level) {
    case 'ok': return 'text-emerald-400';
    case 'warn': return 'text-amber-400';
    case 'danger': return 'text-red-400';
  }
}
