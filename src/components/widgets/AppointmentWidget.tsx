'use client';

import { useState } from 'react';
import { WidgetCard, CtaButton } from './shared';

interface Props {
  specialistName?: string;
  context?: string;
}

const CalendarIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const DAYS = ['Po', 'Út', 'St', 'Čt', 'Pá'];

function getNextWeekdays(count: number): { label: string; date: string; dayName: string }[] {
  const result: { label: string; date: string; dayName: string }[] = [];
  const now = new Date();
  let d = new Date(now);
  d.setDate(d.getDate() + 1);

  while (result.length < count) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) {
      result.push({
        label: `${d.getDate()}.${d.getMonth() + 1}.`,
        date: d.toISOString().split('T')[0],
        dayName: DAYS[dow - 1],
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return result;
}

const TIME_SLOTS = ['9:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

export function AppointmentWidget({ specialistName, context }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const days = getNextWeekdays(5);

  const handleConfirm = () => {
    setConfirmed(true);
  };

  if (confirmed) {
    const day = days.find(d => d.date === selectedDate);
    return (
      <WidgetCard label="Rezervace termínu" icon={CalendarIcon}>
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900 mb-1">Termín zarezervován</p>
          <p className="text-[13px] text-gray-500">
            {day?.dayName} {day?.label} v {selectedTime}
          </p>
          {specialistName && (
            <p className="text-[12px] text-gray-400 mt-1">
              Specialista: {specialistName}
            </p>
          )}
          <p className="text-[11px] text-gray-400 mt-3">
            Potvrzení vám přijde na email. Specialista se vám ozve v domluvený čas.
          </p>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard label="Rezervace termínu" icon={CalendarIcon}>
      {context && (
        <p className="text-[12px] text-gray-500 mb-3">{context}</p>
      )}

      {/* Date selection */}
      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-2">
        Vyberte den
      </p>
      <div className="flex gap-1.5 mb-4">
        {days.map((day, i) => (
          <button
            key={day.date}
            onClick={() => setSelectedDate(day.date)}
            className={`flex-1 py-2 px-1 rounded-lg text-center transition-all animate-in slide-in-from-bottom-1 fade-in ${
              selectedDate === day.date
                ? 'bg-[#E91E63] text-white'
                : 'bg-gray-50 border border-gray-100 text-gray-700 hover:bg-gray-100'
            }`}
            style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
          >
            <div className="text-[10px] font-medium">{day.dayName}</div>
            <div className="text-xs font-semibold mt-0.5">{day.label}</div>
          </button>
        ))}
      </div>

      {/* Time selection */}
      {selectedDate && (
        <>
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-2">
            Vyberte čas
          </p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {TIME_SLOTS.map((time, i) => (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all animate-in slide-in-from-bottom-1 fade-in ${
                  selectedTime === time
                    ? 'bg-[#E91E63] text-white'
                    : 'bg-gray-50 border border-gray-100 text-gray-700 hover:bg-gray-100'
                }`}
                style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
              >
                {time}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Confirm */}
      {selectedDate && selectedTime && (
        <CtaButton onClick={handleConfirm}>
          Potvrdit termín {days.find(d => d.date === selectedDate)?.dayName} {days.find(d => d.date === selectedDate)?.label} v {selectedTime}
        </CtaButton>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Konzultace je zdarma a nezávazná. Specialista vám zavolá v domluvený čas.
        </p>
      </div>
    </WidgetCard>
  );
}
