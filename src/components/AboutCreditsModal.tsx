import React, { useState } from 'react';
import { X, Info, Heart, BookOpen, ShieldCheck, Mail, Copy, Check, ExternalLink, Code2 } from 'lucide-react';

interface AboutCreditsModalProps {
  onClose: () => void;
  darkMode?: boolean;
}

export const AboutCreditsModal: React.FC<AboutCreditsModalProps> = ({ onClose, darkMode }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCredits = () => {
    const text = `Asor Notes - About & Credits

Application: Asor Notes (Offline Bible Study & Concordance Journal)
Developer: Asor Initiative
Contact: help@Asornotes.com

BIBLICAL TEXTS & CONCORDANCE ATTRIBUTIONS:
1. Strong's Exhaustive Concordance (1890)
   Compiled by Dr. James Strong. Hebrew & Greek Lexicons are in the Public Domain worldwide.
2. King James Version (KJV)
   Classic 1611 Scripture text. Public Domain worldwide.
3. World English Bible (WEB)
   Modern English translation. Dedicated to the Public Domain.
4. English Standard Version (ESV)
   Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), copyright © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.
5. New King James Version (NKJV)
   Scripture taken from the New King James Version®. Copyright © 1982 by Thomas Nelson.
6. New International Version (NIV)
   Holy Bible, New International Version®, NIV® Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.®
7. New Living Translation (NLT)
   Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation.

OPEN SOURCE & ASSETS:
- Lucide Icons (ISC License)
- React, Tailwind CSS, IndexedDB local-first architecture`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
          darkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-stone-200 text-stone-900'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight truncate">About & Credits</h2>
              <p className="text-xs opacity-60">Asor Notes • Attributions & Licensing</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyCredits}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                copied
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-stone-100 dark:bg-neutral-800 hover:bg-stone-200 dark:hover:bg-neutral-700 text-stone-700 dark:text-stone-300'
              }`}
              title="Copy Attributions"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-100 dark:bg-neutral-800 hover:bg-stone-200 dark:hover:bg-neutral-700 text-stone-600 dark:text-stone-300 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-sm leading-relaxed">
          {/* App Mission Card */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border ${
              darkMode
                ? 'bg-neutral-950/60 border-neutral-800'
                : 'bg-amber-50/50 border-amber-200/60 text-stone-800'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400 text-sm mb-1.5">
              <Heart className="w-4 h-4 fill-current" />
              <span>About Asor Notes</span>
            </div>
            <p className="text-xs opacity-80 leading-relaxed">
              Asor Notes is an offline-first Bible study journal and scripture concordance suite designed for deep reflection, personal devotions, sermon preparation, and original language word studies with zero tracking and full user privacy.
            </p>
          </div>

          {/* Scripture & Lexicon Attributions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-60">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Biblical Texts & Concordance Attributions</span>
            </div>

            <div className="space-y-2.5">
              {/* Strong's */}
              <div
                className={`p-3.5 rounded-2xl border ${
                  darkMode ? 'bg-neutral-950/40 border-neutral-800' : 'bg-stone-50 border-stone-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-red-600 dark:text-red-400">
                    Strong's Exhaustive Concordance
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Public Domain
                  </span>
                </div>
                <p className="text-xs opacity-75">
                  Compiled by Dr. James Strong (1890). Hebrew, Aramaic, and Greek Lexicons are free of copyright and in the Public Domain worldwide.
                </p>
              </div>

              {/* KJV */}
              <div
                className={`p-3.5 rounded-2xl border ${
                  darkMode ? 'bg-neutral-950/40 border-neutral-800' : 'bg-stone-50 border-stone-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">King James Version (KJV)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Public Domain
                  </span>
                </div>
                <p className="text-xs opacity-75">
                  The classic 1611 Authorized Version of the Holy Bible. Public domain worldwide.
                </p>
              </div>

              {/* World English Bible */}
              <div
                className={`p-3.5 rounded-2xl border ${
                  darkMode ? 'bg-neutral-950/40 border-neutral-800' : 'bg-stone-50 border-stone-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">World English Bible (WEB)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Public Domain
                  </span>
                </div>
                <p className="text-xs opacity-75">
                  A modern English translation of the Holy Bible in the Public Domain by Rainbow Missions, Inc.
                </p>
              </div>

              {/* Copyrighted modern versions */}
              <div
                className={`p-3.5 rounded-2xl border ${
                  darkMode ? 'bg-neutral-950/40 border-neutral-800' : 'bg-stone-50 border-stone-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">Modern Translations (ESV, NKJV, NIV, NLT)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    Copyright Respected
                  </span>
                </div>
                <ul className="text-[11px] opacity-75 space-y-1 list-disc list-inside">
                  <li><strong>ESV®:</strong> English Standard Version®, copyright © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission.</li>
                  <li><strong>NKJV™:</strong> New King James Version®. Copyright © 1982 by Thomas Nelson.</li>
                  <li><strong>NIV®:</strong> Holy Bible, New International Version®, copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.®</li>
                  <li><strong>NLT:</strong> Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Software & Icons */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-60">
              <Code2 className="w-3.5 h-3.5" />
              <span>Technology & Open Source</span>
            </div>

            <div
              className={`p-3.5 rounded-2xl border ${
                darkMode ? 'bg-neutral-950/40 border-neutral-800' : 'bg-stone-50 border-stone-200'
              }`}
            >
              <p className="text-xs opacity-80 leading-relaxed">
                Asor Notes is built using modern web standards including React, Tailwind CSS, TypeScript, and Lucide Icons (ISC License). All data storage operates locally via IndexedDB.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-neutral-800 bg-stone-50/50 dark:bg-neutral-950/50 flex items-center justify-between gap-3 shrink-0">
          <a
            href="mailto:help@Asornotes.com?subject=Asor%20Notes%20Credits%20%26%20Feedback"
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>help@Asornotes.com</span>
          </a>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
