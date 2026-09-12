import React from 'react';
import { AppTheme } from '../services/storage';

interface DeviceFrameProps {
  children: React.ReactNode;
  darkMode: boolean;
  theme?: AppTheme;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children, darkMode, theme }) => {
  const bgClass =
    theme === 'black'
      ? 'bg-black text-white'
      : theme === 'navy'
      ? 'bg-[#0b132b] text-[#e0e1dd]'
      : darkMode
      ? 'bg-neutral-950 text-neutral-100'
      : 'bg-stone-100 text-stone-900';

  return (
    <div className={`min-h-screen w-full transition-colors duration-200 ${bgClass}`}>
      <div className="w-full min-h-screen max-w-5xl mx-auto shadow-xs">{children}</div>
    </div>
  );
};
