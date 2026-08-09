import React from 'react';

interface DeviceFrameProps {
  children: React.ReactNode;
  darkMode: boolean;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children, darkMode }) => {
  return (
    <div className={`min-h-screen w-full transition-colors duration-200 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-stone-100 text-stone-900'}`}>
      <div className="w-full min-h-screen max-w-5xl mx-auto shadow-xs">{children}</div>
    </div>
  );
};
