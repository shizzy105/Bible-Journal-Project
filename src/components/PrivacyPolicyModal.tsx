import React, { useState } from 'react';
import { X, ShieldCheck, Copy, Check, ExternalLink, Mail } from 'lucide-react';

interface PrivacyPolicyModalProps {
  onClose: () => void;
  darkMode?: boolean;
}

export const PRIVACY_POLICY_TEXT = `PRIVACY POLICY FOR ASOR NOTES
Effective Date: September 16, 2026
Application: Asor Notes (com.asornotes.app)
Contact: Asor initiative (help@Asornotes.com)

1. OVERVIEW
Asor Notes ("we", "our", or "the App") is an offline-first Bible study, sermon journaling, and scripture concordance application. 

We respect your personal privacy. Asor Notes is architected with a strict privacy-first philosophy: your notes, personal reflections, study journals, audio recordings, and drawings remain entirely on your device and are never sent to external servers or monetized.

2. INFORMATION WE COLLECT AND STORE
We do not collect, transmit, sell, or monetize any of your personal data.
- No Account Required: You can use all features of Asor Notes without registering, logging in, or providing any personal details (such as your name, email, or phone number).
- Local Note & Journal Storage: All notes, sermon journals, drawings, tags, bookmarks, and formatting are stored locally on your device using IndexedDB and device local storage.
- Voice Audio Recordings: When you record a voice note, the audio file is stored locally on your device. Audio recordings are never uploaded to any remote server or third-party service.
- No Tracking / Telemetry: We do not collect device identifiers (IMEI, MAC address, Advertising ID), IP addresses, or location data.

3. DEVICE PERMISSIONS & WHY THEY ARE REQUIRED
Asor Notes requests only the necessary Android permissions to deliver core offline note-taking and audio features:
- RECORD_AUDIO (Microphone): Used solely when you tap the voice recorder button inside a note to record personal audio memos. The microphone is never accessed in the background. Audio is stored only on your device.
- MODIFY_AUDIO_SETTINGS: Used to optimize audio playback quality when listening to your recorded voice notes through speakers or headphones.
- READ_MEDIA_AUDIO / STORAGE: Required on Android to save, access, play back, and export your recorded voice notes or backup archives.
- INTERNET: Used strictly to fetch public Bible scripture text and lexicons if queried online, or to download updates. No user notes or telemetry are transmitted.

4. THIRD-PARTY SERVICES & ADVERTISING
Asor Notes contains:
- NO third-party advertisements or ad networks (No Google AdMob, Unity Ads, etc.).
- NO third-party behavioral analytics or trackers (No Facebook SDK, Mixpanel, Firebase Analytics).
- NO sale of user data to third-party brokers or advertisers.

5. DATA RETENTION, BACKUP & DELETION
Because all data resides locally on your device:
- User Deletion: You can modify or permanently delete any note, audio recording, or trash item at any time within the app.
- App Uninstallation: Clearing application data or uninstalling the app from your device will permanently remove all locally stored notes and audio files.
- Backup & Export: You can export a full JSON backup of your notes to your device storage at any time for safekeeping.

6. CHILDREN'S PRIVACY (COPPA / GDPR COMPLIANCE)
Asor Notes does not knowingly collect or solicit any personal information from children under the age of 13 (or under 16 in applicable jurisdictions). Because our app collects zero personal information, it is safe for general audiences of all ages.

7. CHANGES TO THIS PRIVACY POLICY
We may update this Privacy Policy from time to time. Any revisions will be reflected in the application and on our hosted privacy policy page with an updated Effective Date.

8. CONTACT US
If you have any questions, suggestions, or concerns regarding this Privacy Policy or your data privacy, please contact:
Developer: Asor initiative
Email: help@Asornotes.com
Application: Asor Notes (com.asornotes.app)`;

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ onClose, darkMode }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(PRIVACY_POLICY_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenHosted = () => {
    window.open('https://asor-notes.vercel.app/privacy', '_blank');
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
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight truncate">Privacy Policy</h2>
              <p className="text-xs opacity-60">Asor Notes • com.asornotes.app</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                copied
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-stone-100 dark:bg-neutral-800 hover:bg-stone-200 dark:hover:bg-neutral-700 text-stone-700 dark:text-stone-300'
              }`}
              title="Copy text for Play Store"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handleOpenHosted}
              className="p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-stone-100 dark:bg-neutral-800 hover:bg-stone-200 dark:hover:bg-neutral-700 text-stone-700 dark:text-stone-300 transition-colors"
              title="Open Privacy Policy Website"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Website</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-neutral-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-sm leading-relaxed space-y-4">
          <div className="space-y-4 opacity-90">
            <section>
              <h3 className="font-bold text-base mb-1">1. Overview</h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300">
                <strong>Asor Notes</strong> is an offline-first Bible study, sermon journaling, and scripture concordance app. Your personal reflections, notes, voice memos, and drawings remain entirely on your device and are never sent to external servers or monetized.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-1">2. Information We Collect and Store</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-stone-600 dark:text-stone-300">
                <li><strong>No Account Required:</strong> No registration, login, email, or personal details collected.</li>
                <li><strong>Notes & Journals:</strong> Stored strictly in your device's local memory (IndexedDB / LocalStorage).</li>
                <li><strong>Voice Audio Recordings:</strong> Stored locally on your device only. Never uploaded to external servers.</li>
                <li><strong>No Tracking:</strong> Zero telemetry, analytics, or advertising identifiers.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-base mb-1">3. Device Permissions</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-stone-600 dark:text-stone-300">
                <li><strong>RECORD_AUDIO (Microphone):</strong> Used exclusively when you tap the voice note recorder.</li>
                <li><strong>MODIFY_AUDIO_SETTINGS:</strong> Used for in-app voice note playback management.</li>
                <li><strong>READ_MEDIA_AUDIO / Storage:</strong> Used to save, play back, and export voice notes and backups.</li>
                <li><strong>INTERNET:</strong> Used only to fetch public Bible texts or lexicons if queried online.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-base mb-1">4. Third-Party Services & Advertising</h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300">
                Asor Notes contains no advertisements, no tracking SDKs, and no data sharing with third parties.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-1">5. Data Retention & Deletion</h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300">
                You have full control. You can delete individual notes or empty your trash anytime. Uninstalling the app completely removes all stored data.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-1">6. Children's Privacy</h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300">
                Complies with COPPA and GDPR. We do not collect personal data from anyone, including children.
              </p>
            </section>

            <section className="p-3.5 rounded-2xl bg-stone-100 dark:bg-neutral-800 border border-stone-200 dark:border-neutral-700">
              <div className="flex items-center gap-2 font-bold mb-1">
                <Mail className="w-4 h-4 text-red-500" />
                <span>Contact</span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300">
                Developer: Asor initiative &bull; Email: help@Asornotes.com
              </p>
            </section>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-neutral-800 flex justify-between items-center shrink-0">
          <span className="text-xs opacity-50">Last updated: Sept 16, 2026</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
