import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ImageBlock } from '../types/journal';

interface ImageBlockItemProps {
  block: ImageBlock;
  onDelete: () => void;
  darkMode?: boolean;
}

export const ImageBlockItem: React.FC<ImageBlockItemProps> = ({
  block,
  onDelete,
  darkMode = true,
}) => {
  // Inline expansion state: false = standard compact height, true = 100% full uncropped natural size
  const [isExtended, setIsExtended] = useState<boolean>(false);

  const toggleExtend = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsExtended((prev) => !prev);
  };

  return (
    <div
      className={`relative group my-3 flex flex-col items-center rounded-3xl border transition-all duration-200 overflow-hidden ${
        darkMode
          ? 'bg-slate-900/90 border-slate-800 shadow-md'
          : 'bg-stone-50 border-stone-200 shadow-xs'
      }`}
    >
      {/* Top Left: The single '<>' Bracket toggle button with transparent text indicating fullview or retract */}
      <button
        type="button"
        onClick={toggleExtend}
        className={`absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs backdrop-blur-md shadow-md transition-all active:scale-95 border select-none ${
          isExtended
            ? 'bg-red-600/85 hover:bg-red-600 text-white border-red-400/40'
            : 'bg-black/65 hover:bg-black/80 text-white border-white/20'
        }`}
        title={isExtended ? 'Retract' : 'Fullview'}
      >
        <span className="font-black text-xs tracking-tight">&lt;&gt;</span>
        <span className="text-[11px] font-sans font-medium opacity-80 text-white/90">
          {isExtended ? 'retract' : 'fullview'}
        </span>
      </button>

      {/* Top Right: Delete action */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-3 right-3 z-10 p-1.5 sm:p-2 rounded-xl bg-black/60 hover:bg-red-600 text-white backdrop-blur-md transition-all shadow-md active:scale-95"
        title="Delete image"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* Image displayed directly in the notes page */}
      <div
        className={`w-full overflow-hidden transition-all duration-300 flex items-center justify-center ${
          isExtended
            ? 'max-h-none h-auto'
            : 'max-h-[360px] sm:max-h-[420px]'
        }`}
      >
        <img
          src={block.imageUrl}
          alt={block.caption || 'Journal attachment'}
          className={`w-full transition-all duration-300 ${
            isExtended
              ? 'h-auto max-h-none object-contain rounded-2xl'
              : 'h-auto max-h-[360px] sm:max-h-[420px] object-cover rounded-2xl'
          }`}
        />
      </div>
    </div>
  );
};
