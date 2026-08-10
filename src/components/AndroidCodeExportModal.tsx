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

    <!-- Audio Recording Permissions for Android -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Bible Journal"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.BibleJournal">
        <activity
            android:name=".MainActivity"
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
    name: 'CapacitorMainActivity.kt',
    language: 'kotlin',
    code: `package com.biblejournal

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.PermissionRequest
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.BridgeActivity
import com.getcapacitor.BridgeWebChromeClient

class MainActivity : BridgeActivity() {
    private val RECORD_AUDIO_REQUEST_CODE = 101

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Request OS runtime microphone permission on App Launch
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), RECORD_AUDIO_REQUEST_CODE)
        }

        // 2. Override Capacitor WebChromeClient to grant web getUserMedia permissions to WebView
        bridge?.webView?.webChromeClient = object : BridgeWebChromeClient(bridge) {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    request.grant(request.resources)
                }
            }
        }
    }
}
`,
  },
  {
    name: 'MainActivity.kt',
    language: 'kotlin',
    code: `package com.biblejournal

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
    private val RECORD_AUDIO_REQUEST_CODE = 101

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Request runtime microphone permission
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), RECORD_AUDIO_REQUEST_CODE)
        }

        val webView: WebView = findViewById(R.id.webView)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.mediaPlaybackRequiresUserGesture = false

        // Automatically grant WebView audio permission requests
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    request.grant(request.resources)
                }
            }
        }
    }
}
`,
  },
  {
    name: 'JournalEntity.kt',
    language: 'kotlin',
    code: `package com.biblejournal.data

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.Date

@Entity(tableName = "journal_entries")
data class JournalEntity(
    @PrimaryKey val id: String,
    val title: String,
    val dateString: String,
    val contentJson: String, // Mixed blocks: text, voice, sketch
    val isPinned: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
`,
  },
  {
    name: 'BibleParser.kt',
    language: 'kotlin',
    code: `package com.biblejournal.util

import java.util.regex.Pattern

data class BibleRefMatch(
    val book: String,
    val chapter: Int,
    val startVerse: Int,
    val endVerse: Int?,
    val rawMatch: String
)

object BibleParser {
    private val BOOK_PATTERN = "Matt|Matthew|John|Jn|Rom|Romans|1 Cor|Ps|Psalms|Gen|Genesis|Rev"
    private val REGEX = Pattern.compile(
        "\\\\b($BOOK_PATTERN)\\\\b[\\\\s.]*(\\\\d{1,3})[\\\\s]*(?:[:.]|v)?[\\\\s]*(\\\\d{1,3})(?:[\\\\s]*-[\\\\s]*(\\\\d{1,3}))?",
        Pattern.CASE_INSENSITIVE
    )

    fun parseReferences(text: String): List<BibleRefMatch> {
        val matches = mutableListOf<BibleRefMatch>()
        val matcher = REGEX.matcher(text)
        while (matcher.find()) {
            val book = matcher.group(1) ?: continue
            val chapter = matcher.group(2)?.toIntOrNull() ?: continue
            val startVerse = matcher.group(3)?.toIntOrNull() ?: continue
            val endVerse = matcher.group(4)?.toIntOrNull()
            matches.add(BibleRefMatch(book, chapter, startVerse, endVerse, matcher.group(0)))
        }
        return matches
    }
}
`,
  },
  {
    name: 'NoteEditorScreen.kt (Compose)',
    language: 'kotlin',
    code: `package com.biblejournal.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Composable
fun NoteEditorScreen(
    entryTitle: String,
    onTitleChange: (String) -> Unit,
    onSave: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        TextField(
            value = entryTitle,
            onValueChange = onTitleChange,
            placeholder = { Text("Title...") },
            colors = TextFieldDefaults.colors(
                focusedContainerColor = Color.Transparent,
                unfocusedContainerColor = Color.Transparent
            )
        )
        Spacer(modifier = Modifier.height(12.dp))
        // Mixed Content Editor Canvas & Bible Verse Popup Bottom Sheet
    }
}
`,
  },
  {
    name: 'JournalDatabase.kt',
    language: 'kotlin',
    code: `package com.biblejournal.data

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [JournalEntity::class], version = 1, exportSchema = false)
abstract class JournalDatabase : RoomDatabase() {
    abstract fun journalDao(): JournalDao
}
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
