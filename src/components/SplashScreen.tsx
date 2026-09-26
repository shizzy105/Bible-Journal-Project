import React, { useEffect, useState } from 'react';
import { AppLogoIcon } from './AppLogoIcon';

interface SplashScreenProps {
  onFinish?: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 1200,
}) => {
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    // Start fade-out slightly before finishing
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, Math.max(200, durationMs - 250));

    const finishTimer = setTimeout(() => {
      onFinish?.();
    }, durationMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between items-center transition-opacity duration-300 ease-out select-none pointer-events-none bg-white dark:bg-stone-950 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 24px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 24px), 32px)',
      }}
    >
      {/* Top balance space */}
      <div className="w-full h-8" />

      {/* Center App Icon with subtle entrance animation */}
      <div className="flex flex-col items-center justify-center -translate-y-4">
        <div className="animate-splash-logo">
          <AppLogoIcon size={84} withShadow />
        </div>
      </div>

      {/* Bottom Branding */}
      <div className="flex flex-col items-center justify-center animate-splash-text">
        <span className="text-base font-bold tracking-wide text-stone-800 dark:text-stone-200">
          Asor Notes
        </span>
      </div>
    </div>
  );
};
