import React, { useState } from 'react';
import { X, Code, Copy, Check, Smartphone, FileCode, Layers } from 'lucide-react';

interface AndroidCodeExportModalProps {
  onClose: () => void;
}

const ANDROID_FILES = [
  {
    name: 'AndroidManifest.xml',
    language: 'xml',
    code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- REQUIRED MICROPHONE PERMISSIONS FOR ANDROID & CAPACITOR -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Asor Notes"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="Asor Notes"
            android:theme="@style/AppTheme.NoActionBar"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

        </activity>
    </application>
</manifest>
`,
  },
  {
    name: 'MainActivity.kt',
    language: 'kotlin',
    code: `package com.asornotes.app

import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity()
`,
  },
  {
    name: 'capacitor.config.json',
    language: 'json',
    code: `{
  "appId": "com.asornotes.app",
  "appName": "Asor Notes",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  }
}
`,
  },
  {
    name: 'CapacitorCommands.sh',
    language: 'bash',
    code: `# 1. Install dependencies
npm install @capacitor/core capacitor-voice-recorder
npm install -D @capacitor/cli @capacitor/android

# 2. Build web bundle
npm run build

# 3. Add Android platform (if not added)
npx cap add android

# 4. Sync web assets and plugin native Android code
npx cap sync android

# 5. Open in Android Studio
npx cap open android
`,
  },
];

export const AndroidCodeExportModal: React.FC<AndroidCodeExportModalProps> = ({ onClose }) => {
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const activeFile = ANDROID_FILES[activeFileIndex];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-stone-900 border border-stone-800 text-stone-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Native Android Code Architecture</h3>
              <p className="text-xs text-stone-400">Kotlin • Jetpack Compose • Room Database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Tabs */}
        <div className="flex items-center gap-1 p-2 bg-stone-950 border-b border-stone-800 overflow-x-auto text-xs">
          {ANDROID_FILES.map((f, i) => (
            <button
              key={f.name}
              onClick={() => setActiveFileIndex(i)}
              className={`px-3 py-1.5 rounded-xl font-mono transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeFileIndex === i
                  ? 'bg-red-600 text-white font-bold'
                  : 'bg-stone-800/80 text-stone-400 hover:text-stone-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{f.name}</span>
            </button>
          ))}
        </div>

        {/* Code Content View */}
        <div className="flex-1 bg-stone-950 p-4 overflow-y-auto font-mono text-xs text-amber-200/90 leading-relaxed">
          <pre>{activeFile.code}</pre>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-900 flex items-center justify-between">
          <p className="text-xs text-stone-400">
            Build native APK with: <code className="text-red-400 font-mono">./gradlew assembleDebug</code>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 border border-stone-700"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
