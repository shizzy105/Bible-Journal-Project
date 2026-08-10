import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, FileText, BookOpen, ArrowLeft } from 'lucide-react';
import { JournalEntry } from '../types/journal';
import { stripHtmlTags } from '../utils/bibleParser';

interface CalendarScreenProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onCreateEntryForDate: (dateString: string) => void;
  onBack: () => void;
  darkMode: boolean;
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

export const CalendarScreen: React.FC<CalendarScreenProps> = ({
  entries,
  onSelectEntry,
  onCreateEntryForDate,
  onBack,
  darkMode,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

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

  // Map entries by dateString for quick lookup
  const entriesByDate = new Map<string, JournalEntry[]>();
  entries.forEach((e) => {
    const list = entriesByDate.get(e.dateString) || [];
    list.push(e);
    entriesByDate.set(e.dateString, list);
  });

  const selectedDateEntries = entriesByDate.get(selectedDateStr) || [];

  return (
    <div className={`flex flex-col min-h-full ${darkMode ? 'bg-slate-900 text-white' : 'bg-stone-50 text-stone-900'}`}>
      {/* Top Bar */}
      <div
        className={`px-4 py-3.5 border-b flex items-center justify-between sticky top-0 z-20 ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-stone-200'
        } backdrop-blur-md`}
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

        <div className="w-16" /> {/* Spacer */}
      </div>

      <div className="p-4 max-w-2xl mx-auto w-full space-y-6">
        {/* Month Navigation */}
        <div
          className={`p-4 rounded-3xl border shadow-sm ${
            darkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400">
              {MONTH_NAMES[month]} {year}
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

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
                      : 'hover:bg-stone-200 dark:hover:bg-slate-700'
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
              Entries for {selectedDateStr}
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
              className={`p-6 text-center rounded-2xl border border-dashed ${
                darkMode ? 'border-slate-800 text-stone-500' : 'border-stone-300 text-stone-400'
              }`}
            >
              <p className="text-xs font-medium">No journal entries recorded for this date.</p>
              <button
                onClick={() => onCreateEntryForDate(selectedDateStr)}
                className="mt-2 text-xs text-red-500 font-bold hover:underline"
              >
                + Write a note for {selectedDateStr}
              </button>
            </div>
          ) : (
            selectedDateEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  darkMode
                    ? 'bg-slate-800/80 border-slate-700 hover:border-red-500'
                    : 'bg-white border-stone-200 hover:border-red-400 shadow-xs'
                }`}
              >
                <h5 className="font-bold text-base line-clamp-1">{entry.title || 'Untitled Entry'}</h5>
                <p className="text-xs text-stone-400 line-clamp-2 mt-1 font-serif">
                  {stripHtmlTags(entry.blocks.find((b) => b.type === 'text')?.content || '') || 'No text content'}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
