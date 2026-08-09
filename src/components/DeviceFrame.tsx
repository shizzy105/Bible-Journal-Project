import React, { useState } from 'react';
import { Smartphone, Monitor } from 'lucide-react';

interface DeviceFrameProps {
  children: React.ReactNode;
  darkMode: boolean;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children, darkMode }) => {
  const [useFrame, setUseFrame] = useState<boolean>(false);

  return (
    <div className={`min-h-screen w-full transition-colors duration-200 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-stone-100 text-stone-900'}`}>
      {/* Top Bar Bar Controls for Frame Switcher */}
      <div className="fixed top-2 right-3 z-50 flex items-center gap-2 bg-stone-900/80 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full shadow-lg border border-stone-700">
        <span className="font-medium text-stone-300 hidden sm:inline">View Mode:</span>
        <button
          onClick={() => setUseFrame(false)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all ${
            !useFrame ? 'bg-red-600 text-white font-semibold' : 'text-stone-300 hover:text-white'
          }`}
          title="Full Responsive Display"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Full</span>
        </button>
        <button
          onClick={() => setUseFrame(true)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all ${
            useFrame ? 'bg-red-600 text-white font-semibold' : 'text-stone-300 hover:text-white'
          }`}
          title="Android Phone Mockup"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Android Frame</span>
        </button>
      </div>

      {useFrame ? (
        <div className="flex items-center justify-center min-h-screen p-2 sm:p-6 bg-stone-900">
          {/* Authentic Android Mobile Frame (Redmi Style) */}
          <div className="relative w-full max-w-[420px] h-[850px] max-h-[95vh] bg-black rounded-[48px] p-3.5 shadow-2xl border-4 border-stone-700 flex flex-col overflow-hidden ring-1 ring-white/10">
            {/* Camera Punchhole & Ear Speaker */}
            <div className="absolute top-0 left-0 right-0 h-7 z-40 flex justify-center items-center pointer-events-none">
              <div className="w-4 h-4 rounded-full bg-slate-900 border border-slate-800 shadow-inner"></div>
            </div>

            {/* Inner Android Screen Viewport */}
            <div
              className={`w-full h-full rounded-[38px] overflow-hidden flex flex-col relative ${
                darkMode ? 'bg-slate-900 text-slate-100' : 'bg-stone-50 text-stone-900'
              }`}
            >
              {/* Android Status Bar */}
              <div
                className={`w-full h-7 px-5 pt-1.5 flex justify-between items-center text-[10px] font-medium z-30 select-none ${
                  darkMode ? 'text-slate-400 bg-slate-900/90' : 'text-stone-600 bg-stone-50/90'
                }`}
              >
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  <span>5G</span>
                  <span>88%</span>
                </div>
              </div>

              {/* App Content */}
              <div className="flex-1 overflow-y-auto relative flex flex-col">{children}</div>

              {/* Android Bottom Navigation Bar Indicator */}
              <div
                className={`w-full h-5 flex items-center justify-center pointer-events-none z-30 ${
                  darkMode ? 'bg-slate-900/90' : 'bg-stone-50/90'
                }`}
              >
                <div className="w-32 h-1 bg-stone-400/50 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Full Screen Responsive Layout */
        <div className="w-full min-h-screen max-w-5xl mx-auto shadow-sm">{children}</div>
      )}
    </div>
  );
};
