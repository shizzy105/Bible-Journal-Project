import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, ArrowLeft, ChevronDown, Check } from 'lucide-react';
import { JournalEntry } from '../types/journal';
import { getJournalEntryTextSnippet, formatDateDDMMYYYY } from '../utils/bibleParser';
import { AppTheme } from '../services/storage';

interface CalendarScreenProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onCreateEntryForDate: (dateString: string) => void;
  onBack: () => void;
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

// Generate range of selectable years (1950 - 2050)
const selectableYears: number[] = [];
for (let y = 1960; y <= 2045; y++) {
  selectableYears.push(y);
}

export const CalendarScreen: React.FC<CalendarScreenProps> = ({
  entries,
  onSelectEntry,
  onCreateEntryForDate,
  onBack,
  darkMode,
  currentTheme,
}) => {
  const isPureBlack =
    currentTheme === 'black' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('pure-black'));
  const isNavy =
    currentTheme === 'navy' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('navy'));

  const bgClass = isPureBlack
    ? 'bg-black text-white'
    : isNavy
    ? 'bg-[#0b132b] text-[#e0e1dd]'
    : darkMode
    ? 'bg-neutral-950 text-neutral-100'
    : 'bg-stone-50 text-stone-900';

  const navBarClass = isPureBlack
    ? 'bg-black/95 border-neutral-900'
    : isNavy
    ? 'bg-[#1c2541]/90 border-[#3a506b]'
    : darkMode
    ? 'bg-neutral-900/90 border-neutral-800'
    : 'bg-white/90 border-stone-200';

  const cardClass = isPureBlack
    ? 'bg-neutral-950 border-neutral-900'
    : isNavy
    ? 'bg-[#1c2541]/80 border-[#3a506b]'
    : darkMode
    ? 'bg-neutral-900 border-neutral-800'
    : 'bg-white border-stone-200';

  const innerCardClass = isPureBlack
    ? 'bg-black border-neutral-900'
    : isNavy
    ? 'bg-[#0b132b] border-[#3a506b]'
    : darkMode
    ? 'bg-neutral-950 border-neutral-800'
    : 'bg-stone-100 border-stone-300';

  const selectBgClass = isPureBlack
    ? 'bg-neutral-900 border-neutral-800 text-white'
    : isNavy
    ? 'bg-[#1c2541] border-[#3a506b] text-[#e0e1dd]'
    : darkMode
    ? 'bg-neutral-800 border-neutral-700 text-white'
    : 'bg-white border-stone-300 text-stone-900';

  const monthBtnInactiveClass = isPureBlack
    ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300'
    : isNavy
    ? 'bg-[#1c2541] hover:bg-[#232f55] text-stone-300'
    : darkMode
    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
    : 'bg-white hover:bg-stone-200 text-stone-700 border border-stone-200';

  const dayHoverClass = isPureBlack
    ? 'hover:bg-neutral-900'
    : isNavy
    ? 'hover:bg-[#1c2541]'
    : darkMode
    ? 'hover:bg-neutral-800'
    : 'hover:bg-stone-200';

  const entryCardClass = isPureBlack
    ? 'bg-neutral-950 border-neutral-900 hover:border-red-500'
    : isNavy
    ? 'bg-[#1c2541]/80 border-[#3a506b] hover:border-red-500'
    : darkMode
    ? 'bg-neutral-900 border-neutral-800 hover:border-red-500'
    : 'bg-white border-stone-200 hover:border-red-400 shadow-xs';

  const emptyBorderClass = isPureBlack
    ? 'border-neutral-900 text-neutral-500'
    : isNavy
    ? 'border-[#3a506b] text-neutral-500'
    : darkMode
    ? 'border-neutral-800 text-neutral-500'
    : 'border-stone-300 text-stone-400';

  const navIconHoverClass = isPureBlack
    ? 'hover:bg-neutral-900'
    : isNavy
    ? 'hover:bg-[#1c2541]'
    : darkMode
    ? 'hover:bg-neutral-800'
    : 'hover:bg-stone-200';

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [showYearMonthPicker, setShowYearMonthPicker] = useState<boolean>(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of month (0-6)
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  // Number of days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleYearChange = (newYear: number) => {
    setCurrentDate(new Date(newYear, month, 1));
  };

  const handleMonthChange = (newMonth: number) => {
    setCurrentDate(new Date(year, newMonth, 1));
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateStr(today.toISOString().split('T')[0]);
    setShowYearMonthPicker(false);
  };

  // Map entries by dateString for quick lookup
  const entriesByDate = new Map<string, JournalEntry[]>();
  entries.forEach((e) => {
    const list = entriesByDate.get(e.dateString) || [];
    list.push(e);
    entriesByDate.set(e.dateString, list);
  });

  const selectedDateEntries = entriesByDate.get(selectedDateStr) || [];

  return (
    <div className={`flex flex-col min-h-full ${bgClass}`}>
      {/* Top Bar */}
      <div
        className={`px-4 py-3.5 border-b flex items-center justify-between sticky top-0 z-20 ${navBarClass} backdrop-blur-md`}
      >
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-stone-800/20 text-stone-400 hover:text-stone-900 dark:hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs font-semibold">Home</span>
        </button>

        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-red-500" />
          <h2 className="text-base font-bold">Journal Calendar</h2>
        </div>

        <button
          onClick={handleJumpToToday}
          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-600/10 text-red-500 hover:bg-red-600/20 border border-red-500/20 transition-all active:scale-95"
          title="Jump to current date"
        >
          Today
        </button>
      </div>

      <div className="p-4 max-w-2xl mx-auto w-full space-y-6">
        {/* Month Navigation & Year Selector Card */}
        <div className={`p-4 rounded-3xl border shadow-sm ${cardClass}`}>
          {/* Header with quick Month & Year Dropdown / Trigger */}
          <div className="flex items-center justify-between mb-4 px-2">
            <button
              onClick={() => setShowYearMonthPicker(!showYearMonthPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-red-500/10 transition-colors group border border-transparent hover:border-red-500/30"
              title="Click to jump to any year or month"
            >
              <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                <span>{MONTH_NAMES[month]}</span>
                <span>{year}</span>
              </h3>
              <ChevronDown
                className={`w-4 h-4 text-red-500 transition-transform duration-200 ${
                  showYearMonthPicker ? 'rotate-180' : ''
                }`}
              />
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className={`p-2 rounded-full transition-colors ${navIconHoverClass}`}
                title="Previous month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextMonth}
                className={`p-2 rounded-full transition-colors ${navIconHoverClass}`}
                title="Next month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Expanded Year & Month Selector Scroller / Dropdown */}
          {showYearMonthPicker && (
            <div className={`mb-4 p-4 rounded-2xl border animate-fadeIn ${innerCardClass}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  Select Year & Month
                </span>
                <button
                  onClick={() => setShowYearMonthPicker(false)}
                  className="text-xs font-bold text-red-500 hover:underline"
                >
                  Done
                </button>
              </div>

              {/* Year Scroller / Dropdown */}
              <div className="mb-3">
                <label className="text-xs font-semibold text-stone-400 block mb-1.5">Year:</label>
                <div className="flex items-center gap-2">
                  <select
                    value={year}
                    onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
                    className={`w-full p-2.5 rounded-xl font-bold text-sm border focus:outline-none focus:ring-2 focus:ring-red-500 ${selectBgClass}`}
                  >
                    {selectableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleYearChange(year - 1)}
                    className="p-2.5 rounded-xl border bg-stone-500/10 hover:bg-stone-500/20 active:scale-95"
                    title="Previous year"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleYearChange(year + 1)}
                    className="p-2.5 rounded-xl border bg-stone-500/10 hover:bg-stone-500/20 active:scale-95"
                    title="Next year"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Months Grid */}
              <div>
                <label className="text-xs font-semibold text-stone-400 block mb-1.5">Month:</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {MONTH_NAMES.map((mName, mIdx) => {
                    const isSelectedMonth = mIdx === month;
                    return (
                      <button
                        key={mName}
                        onClick={() => {
                          handleMonthChange(mIdx);
                          setShowYearMonthPicker(false);
                        }}
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                          isSelectedMonth
                            ? 'bg-red-600 text-white shadow-sm font-bold'
                            : monthBtnInactiveClass
                        }`}
                      >
                        <span>{mName.slice(0, 3)}</span>
                        {isSelectedMonth && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 text-center text-xs font-bold text-stone-400 mb-2">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Month Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots before first day */}
            {[...Array(firstDayOfMonth)].map((_, i) => (
              <div key={`empty-${i}`} className="h-12" />
            ))}

            {/* Days of month */}
            {[...Array(daysInMonth)].map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${dayNum
                .toString()
                .padStart(2, '0')}`;

              const hasEntries = entriesByDate.has(dateStr);
              const isSelected = dateStr === selectedDateStr;
              const isToday =
                new Date().toISOString().split('T')[0] === dateStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`h-12 rounded-2xl flex flex-col items-center justify-center relative transition-all ${
                    isSelected
                      ? 'bg-red-600 text-white shadow-md font-bold scale-105 z-10'
                      : isToday
                      ? 'border-2 border-red-500 font-bold text-red-500'
                      : dayHoverClass
                  }`}
                >
                  <span className="text-sm">{dayNum}</span>

                  {/* Red Dot / Indicator for dates containing journal entries */}
                  {hasEntries && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                        isSelected ? 'bg-white' : 'bg-red-500 animate-pulse'
                      }`}
                      title={`${entriesByDate.get(dateStr)?.length} note(s)`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Entries Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Entries for {formatDateDDMMYYYY(selectedDateStr)}
            </h4>
            <button
              onClick={() => onCreateEntryForDate(selectedDateStr)}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Entry</span>
            </button>
          </div>

          {selectedDateEntries.length === 0 ? (
            <div
              className={`p-6 text-center rounded-2xl border border-dashed ${emptyBorderClass}`}
            >
              <p className="text-xs font-medium">No journal entries recorded for this date.</p>
              <button
                onClick={() => onCreateEntryForDate(selectedDateStr)}
                className="mt-2 text-xs text-red-500 font-bold hover:underline"
              >
                + Write a note for {formatDateDDMMYYYY(selectedDateStr)}
              </button>
            </div>
          ) : (
            selectedDateEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${entryCardClass}`}
              >
                <h5 className="font-bold text-base line-clamp-1">{entry.title || 'Untitled Entry'}</h5>
                <p className="text-xs text-stone-400 line-clamp-2 mt-1 leading-relaxed">
                  {getJournalEntryTextSnippet(entry) || 'No text content'}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
