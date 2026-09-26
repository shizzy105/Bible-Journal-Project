import React from 'react';

interface ConcordanceVerseRendererProps {
  text: string;
  onSelectStrongs: (strongsId: string) => void;
  darkMode?: boolean;
}

/**
 * Renders Scripture verse text containing Strong's tags (<S>H1234</S> or <S>G5678</S>).
 * Formats each Strong's number with an interactive, underlined badge in front of / after the respective word.
 * Tapping the underlined Strong's number opens the Concordance definition modal.
 */
export const ConcordanceVerseRenderer: React.FC<ConcordanceVerseRendererProps> = ({
  text,
  onSelectStrongs,
  darkMode = false,
}) => {
  if (!text) return null;

  // Clean any translator footnote <sup> tags or stray non-S HTML tags
  const cleanText = text
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')
    .replace(/<sup[^>]*>[\s\S]*$/gi, '')
    .replace(/<(?!S\b|\/S>)[^>]*>/gi, '')
    .trim();

  // Split text by Strong's tags (<S>...</S> or <S ...>...</S>)
  const parts: React.ReactNode[] = [];
  const regex = /<S[^>]*>([HhGg]?\d+)<\/S>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleanText)) !== null) {
    const rawTag = match[0];
    const strongsNum = match[1].toUpperCase();
    const matchIndex = match.index;

    // Push the text before the Strong tag
    if (matchIndex > lastIndex) {
      parts.push(cleanText.slice(lastIndex, matchIndex));
    }

    // Push the interactive underlined Strong badge
    parts.push(
      <button
        key={`strongs-${matchIndex}-${strongsNum}`}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelectStrongs(strongsNum);
        }}
        className={`inline-flex items-center align-baseline mx-0.5 px-1 py-0.2 rounded font-mono text-[0.72em] font-bold tracking-tight cursor-pointer transition-all active:scale-90 underline decoration-red-500/80 decoration-1.5 underline-offset-2 ${
          darkMode
            ? 'text-red-400 bg-red-950/40 hover:bg-red-900/60 hover:text-red-300 border border-red-900/40'
            : 'text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border border-red-200/80'
        }`}
        title={`View Strong's Concordance ${strongsNum}`}
      >
        {strongsNum}
      </button>
    );

    lastIndex = matchIndex + rawTag.length;
  }

  if (lastIndex < cleanText.length) {
    parts.push(cleanText.slice(lastIndex));
  }

  return <>{parts}</>;
};
