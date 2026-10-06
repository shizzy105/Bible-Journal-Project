import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Check, RotateCcw } from 'lucide-react';
import { AppTheme } from '../services/storage';

interface DatePickerModalProps {
  isOpen: boolean;
  initialDateString: string; // ISO 'YYYY-MM-DD'
  onSelectDate: (dateString: string) => void;
  onClose: () => void;
  darkMode: boolean;
  currentTheme?: AppTheme;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Selectable years from 1960 to 2045
const SELECTABLE_YEARS: number[] = [];
for (let y = 1960; y <= 2045; y++) {
  SELECTABLE_YEARS.push(y);
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  isOpen,
  initialDateString,
  onSelectDate,
  onClose,
  darkMode,
  currentTheme,
}) => {
  const isPureBlack =
    currentTheme === 'black' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('pure-black'));
  const isNavy =
    currentTheme === 'navy' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('navy'));

  // Parse initial date
  const parseDateStr = (str: string): { year: number; month: number; day: number } => {
    try {
      const parts = str.split('T')[0].split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          return { year: y, month: m, day: d };
        }
      }
    } catch (_) {}
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  };

  const [currentYear, setCurrentYear] = useState<number>(() => parseDateStr(initialDateString).year);
  const [currentMonth, setCurrentMonth] = useState<number>(() => parseDateStr(initialDateString).month);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const p = parseDateStr(initialDateString);
    return `${p.year}-${(p.month + 1).toString().padStart(2, '0')}-${p.day.toString().padStart(2, '0')}`;
  });
  const [showYearMonthPicker, setShowYearMonthPicker] = useState<boolean>(false);

  // Sync state when modal opens with a new initial date
  useEffect(() => {
    if (isOpen) {
      const p = parseDateStr(initialDateString);
      setCurrentYear(p.year);
      setCurrentMonth(p.month);
      setSelectedDateStr(`${p.year}-${(p.month + 1).toString().padStart(2, '0')}-${p.day.toString().padStart(2, '0')}`);
      setShowYearMonthPicker(false);
    }
  }, [isOpen, initialDateString]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDateStr(todayStr);
    setShowYearMonthPicker(false);
  };

  const handleJumpToYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, '0')}-${yesterday.getDate().toString().padStart(2, '0')}`;
    setCurrentYear(yesterday.getFullYear());
    setCurrentMonth(yesterday.getMonth());
    setSelectedDateStr(yesterdayStr);
    setShowYearMonthPicker(false);
  };

  const handleConfirm = () => {
    onSelectDate(selectedDateStr);
    onClose();
  };

  // Calendar math
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Theme-aware styles
  const modalClass = isPureBlack
    ? 'bg-neutral-950 border-neutral-900 text-white'
    : isNavy
    ? 'bg-[#1c2541] border-[#3a506b] text-white'
    : darkMode
    ? 'bg-neutral-900 border-neutral-800 text-white'
    : 'bg-white border-stone-200 text-stone-900';

  const innerCardClass = isPureBlack
    ? 'bg-black border-neutral-900'
    : isNavy
    ? 'bg-[#0b132b] border-[#3a506b]'
    : darkMode
    ? 'bg-neutral-950 border-neutral-800'
    : 'bg-stone-50 border-stone-200';

  const selectBgClass = isPureBlack
    ? 'bg-neutral-900 border-neutral-800 text-white'
    : isNavy
    ? 'bg-[#1c2541] border-[#3a506b] text-[#e0e1dd]'
    : darkMode
    ? 'bg-neutral-800 border-neutral-700 text-white'
    : 'bg-white border-stone-300 text-stone-900';

  const cancelBtnClass = isPureBlack
    ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300'
    : isNavy
    ? 'bg-[#253256] hover:bg-[#2e3e6b] text-[#e0e1dd]'
    : darkMode
    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
    : 'bg-stone-100 hover:bg-stone-200 text-stone-700';

  const navIconHoverClass = isPureBlack
    ? 'hover:bg-neutral-900 text-neutral-300 hover:text-white'
    : isNavy
    ? 'hover:bg-[#253256] text-[#e0e1dd] hover:text-white'
    : darkMode
    ? 'hover:bg-neutral-800 text-neutral-300 hover:text-white'
    : 'hover:bg-stone-100 text-stone-600 hover:text-stone-900';

  const dayHoverClass = isPureBlack
    ? 'hover:bg-neutral-900 text-neutral-200'
    : isNavy
    ? 'hover:bg-[#253256] text-[#e0e1dd]'
    : darkMode
    ? 'hover:bg-neutral-800 text-neutral-200'
    : 'hover:bg-stone-100 text-stone-800';

  const todayStr = new Date().toISOString().split('T')[0];

  // Format selected date nicely for display header
  const formatFriendlyDate = (isoStr: string): string => {
    try {
      const parts = isoStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString(undefined, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
    } catch (_) {}
    return isoStr;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-sm rounded-3xl border shadow-2xl p-4 sm:p-5 flex flex-col gap-3.5 transition-all ${modalClass}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Select Note Date"
      >
        {/* Header with Title, Selected Date Preview, and Close button */}
        <div className="flex items-center justify-between border-b pb-3 border-stone-200/50 dark:border-neutral-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Select Note Date</h3>
              <p className="text-xs text-red-500 font-semibold tracking-tight">
                {formatFriendlyDate(selectedDateStr)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors ${navIconHoverClass}`}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Month & Year Navigation Row */}
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => setShowYearMonthPicker((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-stone-500/10 text-sm font-bold tracking-tight transition-colors group cursor-pointer"
            title="Click to quickly change Month or Year"
          >
            <span>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <span className="text-[10px] text-red-500 group-hover:translate-y-0.5 transition-transform">
              {showYearMonthPicker ? '▲' : '▼'}
            </span>
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className={`p-1.5 rounded-xl transition-colors ${navIconHoverClass}`}
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className={`p-1.5 rounded-xl transition-colors ${navIconHoverClass}`}
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Year & Month Selector Panel */}
        {showYearMonthPicker && (
          <div className={`p-3 rounded-2xl border animate-fadeIn ${innerCardClass}`}>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                Jump to Month & Year
              </span>
              <button
                type="button"
                onClick={() => setShowYearMonthPicker(false)}
                className="text-xs font-bold text-red-500 hover:underline"
              >
                Done
              </button>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-2 mb-2.5">
              <button
                type="button"
                onClick={() => setCurrentYear((y) => y - 1)}
                className="p-2 rounded-xl border bg-stone-500/10 hover:bg-stone-500/20 active:scale-95 transition-all shrink-0"
                title="Previous Year"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value, 10))}
                className={`w-full p-2 rounded-xl font-bold text-xs border focus:outline-none focus:ring-2 focus:ring-red-500 ${selectBgClass}`}
              >
                {SELECTABLE_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setCurrentYear((y) => y + 1)}
                className="p-2 rounded-xl border bg-stone-500/10 hover:bg-stone-500/20 active:scale-95 transition-all shrink-0"
                title="Next Year"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 12 Months Grid */}
            <div className="grid grid-cols-3 gap-1">
              {MONTH_NAMES.map((name, idx) => {
                const isSelected = idx === currentMonth;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setCurrentMonth(idx);
                      setShowYearMonthPicker(false);
                    }}
                    className={`py-1.5 px-1 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-red-600 text-white font-bold shadow-xs scale-102'
                        : 'hover:bg-stone-500/15 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    {name.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Days of Week Row */}
        <div className="grid grid-cols-7 text-center text-[11px] font-bold text-stone-400 py-1 border-b border-stone-200/40 dark:border-neutral-800/60">
          {DAYS_OF_WEEK.map((d) => (
            <div key={d} className="py-0.5">
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Previous Month trailing days */}
          {[...Array(firstDayOfWeek)].map((_, i) => {
            const dayNum = daysInPrevMonth - firstDayOfWeek + i + 1;
            const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            const dateStr = `${prevYear}-${(prevMonthIdx + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
            return (
              <button
                key={`prev-${dayNum}`}
                type="button"
                onClick={() => {
                  setSelectedDateStr(dateStr);
                  setCurrentMonth(prevMonthIdx);
                  setCurrentYear(prevYear);
                }}
                className="h-9 sm:h-10 rounded-xl flex items-center justify-center text-xs opacity-30 hover:opacity-60 transition-opacity"
              >
                {dayNum}
              </button>
            );
          })}

          {/* Current Month days */}
          {[...Array(daysInCurrentMonth)].map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${dayNum
              .toString()
              .padStart(2, '0')}`;
            const isSelected = dateStr === selectedDateStr;
            const isToday = dateStr === todayStr;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDateStr(dateStr)}
                className={`h-9 sm:h-10 rounded-xl flex flex-col items-center justify-center relative transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-red-600 text-white font-bold shadow-md scale-105 z-10'
                    : isToday
                    ? 'border-2 border-red-500 font-bold text-red-500'
                    : dayHoverClass
                }`}
              >
                <span className="text-xs">{dayNum}</span>
                {isToday && !isSelected && (
                  <span className="w-1 h-1 rounded-full bg-red-500 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Presets & Bottom Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-200/50 dark:border-neutral-800/80 mt-1">
          {/* Quick presets */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleJumpToToday}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 ${cancelBtnClass}`}
              title="Select Today"
            >
              <RotateCcw className="w-3 h-3 text-red-500" />
              <span>Today</span>
            </button>
            <button
              type="button"
              onClick={handleJumpToYesterday}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${cancelBtnClass}`}
              title="Select Yesterday"
            >
              Yesterday
            </button>
          </div>

          {/* Cancel & Apply */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${cancelBtnClass}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md transition-transform active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
