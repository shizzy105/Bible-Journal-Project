import { BibleBook, BibleVerse } from '../types/journal';
import { BIBLE_CHAPTER_VERSE_COUNTS } from './bibleVerseCounts';

export const BIBLE_BOOKS: BibleBook[] = [
  // Old Testament
  { id: 'GEN', name: 'Genesis', abbreviations: ['gen', 'ge', 'gn'], testament: 'OT', chaptersCount: 50 },
  { id: 'EXO', name: 'Exodus', abbreviations: ['ex', 'exo', 'exod'], testament: 'OT', chaptersCount: 40 },
  { id: 'LEV', name: 'Leviticus', abbreviations: ['lev', 'le', 'lv'], testament: 'OT', chaptersCount: 27 },
  { id: 'NUM', name: 'Numbers', abbreviations: ['num', 'nu', 'nm', 'nb'], testament: 'OT', chaptersCount: 36 },
  { id: 'DEU', name: 'Deuteronomy', abbreviations: ['deut', 'deu', 'dt'], testament: 'OT', chaptersCount: 34 },
  { id: 'JOSH', name: 'Joshua', abbreviations: ['josh', 'jos', 'jsh'], testament: 'OT', chaptersCount: 24 },
  { id: 'JUDG', name: 'Judges', abbreviations: ['judg', 'jdg', 'jg', 'jdgs'], testament: 'OT', chaptersCount: 21 },
  { id: 'RUTH', name: 'Ruth', abbreviations: ['ruth', 'rth', 'ru'], testament: 'OT', chaptersCount: 4 },
  { id: '1SAM', name: '1 Samuel', abbreviations: ['1 sam', '1 samuel', '1sam', '1s', '1 s', 'i sam', '1st samuel', 'first samuel', '1sa', '1 sa', '1sm', '1 sm', '1st sam', 'first sam'], testament: 'OT', chaptersCount: 31 },
  { id: '2SAM', name: '2 Samuel', abbreviations: ['2 sam', '2 samuel', '2sam', '2s', '2 s', 'ii sam', '2nd samuel', 'second samuel', '2sa', '2 sa', '2sm', '2 sm', '2nd sam', 'second sam'], testament: 'OT', chaptersCount: 24 },
  { id: '1KGS', name: '1 Kings', abbreviations: ['1 kings', '1kgs', '1 kgs', '1ki', '1 ki', '1kin', '1 kin', '1 king', '1st kings', 'first kings', 'i kings', 'i kgs', 'i ki', '1st king', 'first king', '1k', '1 k'], testament: 'OT', chaptersCount: 22 },
  { id: '2KGS', name: '2 Kings', abbreviations: ['2 kings', '2kgs', '2 kgs', '2ki', '2 ki', '2kin', '2 kin', '2 king', '2nd kings', 'second kings', 'ii kings', 'ii kgs', 'ii ki', '2nd king', 'second king', '2k', '2 k'], testament: 'OT', chaptersCount: 25 },
  { id: '1CHR', name: '1 Chronicles', abbreviations: ['1 chron', '1 chronicles', '1chr', '1 chr', '1ch', '1 ch', 'i chron', '1st chronicles', 'first chronicles', '1chron', '1st chron', 'first chron'], testament: 'OT', chaptersCount: 29 },
  { id: '2CHR', name: '2 Chronicles', abbreviations: ['2 chron', '2 chronicles', '2chr', '2 chr', '2ch', '2 ch', 'ii chron', '2nd chronicles', 'second chronicles', '2chron', '2nd chron', 'second chron'], testament: 'OT', chaptersCount: 36 },
  { id: 'EZRA', name: 'Ezra', abbreviations: ['ezra', 'ezr'], testament: 'OT', chaptersCount: 10 },
  { id: 'NEH', name: 'Nehemiah', abbreviations: ['neh', 'ne'], testament: 'OT', chaptersCount: 13 },
  { id: 'ESTH', name: 'Esther', abbreviations: ['esth', 'est', 'es'], testament: 'OT', chaptersCount: 10 },
  { id: 'JOB', name: 'Job', abbreviations: ['job', 'jb'], testament: 'OT', chaptersCount: 42 },
  { id: 'PSA', name: 'Psalms', abbreviations: ['ps', 'psa', 'psalm', 'psalms', 'pss'], testament: 'OT', chaptersCount: 150 },
  { id: 'PRO', name: 'Proverbs', abbreviations: ['prov', 'pro', 'pr', 'prv'], testament: 'OT', chaptersCount: 31 },
  { id: 'ECC', name: 'Ecclesiastes', abbreviations: ['eccl', 'ecc', 'ec'], testament: 'OT', chaptersCount: 12 },
  { id: 'SNG', name: 'Song of Solomon', abbreviations: ['song', 'sos', 'sng', 'canticles'], testament: 'OT', chaptersCount: 8 },
  { id: 'ISA', name: 'Isaiah', abbreviations: ['isa', 'is'], testament: 'OT', chaptersCount: 66 },
  { id: 'JER', name: 'Jeremiah', abbreviations: ['jer', 'je'], testament: 'OT', chaptersCount: 52 },
  { id: 'LAM', name: 'Lamentations', abbreviations: ['lam', 'la'], testament: 'OT', chaptersCount: 5 },
  { id: 'EZK', name: 'Ezekiel', abbreviations: ['ezek', 'ezk', 'eze'], testament: 'OT', chaptersCount: 48 },
  { id: 'DAN', name: 'Daniel', abbreviations: ['dan', 'da', 'dn'], testament: 'OT', chaptersCount: 12 },
  { id: 'HOS', name: 'Hosea', abbreviations: ['hos', 'ho'], testament: 'OT', chaptersCount: 14 },
  { id: 'JOL', name: 'Joel', abbreviations: ['joel', 'jol', 'jl'], testament: 'OT', chaptersCount: 3 },
  { id: 'AMO', name: 'Amos', abbreviations: ['amos', 'amo', 'am'], testament: 'OT', chaptersCount: 9 },
  { id: 'OBA', name: 'Obadiah', abbreviations: ['obad', 'oba', 'ob'], testament: 'OT', chaptersCount: 1 },
  { id: 'JON', name: 'Jonah', abbreviations: ['jonah', 'jon', 'jnh'], testament: 'OT', chaptersCount: 4 },
  { id: 'MIC', name: 'Micah', abbreviations: ['mic', 'mc'], testament: 'OT', chaptersCount: 7 },
  { id: 'NAM', name: 'Nahum', abbreviations: ['nah', 'nam', 'na'], testament: 'OT', chaptersCount: 3 },
  { id: 'HAB', name: 'Habakkuk', abbreviations: ['hab', 'hb'], testament: 'OT', chaptersCount: 3 },
  { id: 'ZEP', name: 'Zephaniah', abbreviations: ['zeph', 'zep', 'zp'], testament: 'OT', chaptersCount: 3 },
  { id: 'HAG', name: 'Haggai', abbreviations: ['hag', 'hg'], testament: 'OT', chaptersCount: 2 },
  { id: 'ZEC', name: 'Zechariah', abbreviations: ['zech', 'zec', 'zc'], testament: 'OT', chaptersCount: 14 },
  { id: 'MAL', name: 'Malachi', abbreviations: ['mal', 'ml'], testament: 'OT', chaptersCount: 4 },

  // New Testament
  { id: 'MAT', name: 'Matthew', abbreviations: ['matt', 'mat', 'mt'], testament: 'NT', chaptersCount: 28 },
  { id: 'MRK', name: 'Mark', abbreviations: ['mark', 'mrk', 'mk'], testament: 'NT', chaptersCount: 16 },
  { id: 'LUK', name: 'Luke', abbreviations: ['luke', 'luk', 'lk'], testament: 'NT', chaptersCount: 24 },
  { id: 'JHN', name: 'John', abbreviations: ['john', 'jhn', 'jn'], testament: 'NT', chaptersCount: 21 },
  { id: 'ACT', name: 'Acts', abbreviations: ['acts', 'act', 'ac'], testament: 'NT', chaptersCount: 28 },
  { id: 'ROM', name: 'Romans', abbreviations: ['rom', 'ro', 'rm'], testament: 'NT', chaptersCount: 16 },
  { id: '1COR', name: '1 Corinthians', abbreviations: ['1 cor', '1 corinthians', '1cor', '1co', '1 co', 'i cor', '1st corinthians', 'first corinthians', '1st cor', 'first cor'], testament: 'NT', chaptersCount: 16 },
  { id: '2COR', name: '2 Corinthians', abbreviations: ['2 cor', '2 corinthians', '2cor', '2co', '2 co', 'ii cor', '2nd corinthians', 'second corinthians', '2nd cor', 'second cor'], testament: 'NT', chaptersCount: 13 },
  { id: 'GAL', name: 'Galatians', abbreviations: ['gal', 'ga'], testament: 'NT', chaptersCount: 6 },
  { id: 'EPH', name: 'Ephesians', abbreviations: ['eph', 'ep'], testament: 'NT', chaptersCount: 6 },
  { id: 'PHP', name: 'Philippians', abbreviations: ['phil', 'php', 'pp', 'phi', 'philippians'], testament: 'NT', chaptersCount: 4 },
  { id: 'COL', name: 'Colossians', abbreviations: ['col', 'co', 'colossians'], testament: 'NT', chaptersCount: 4 },
  { id: '1THS', name: '1 Thessalonians', abbreviations: ['1 thess', '1 thessalonians', '1thess', '1ths', '1 ths', '1th', '1 th', 'i thess', '1st thessalonians', 'first thessalonians', '1st thess', 'first thess'], testament: 'NT', chaptersCount: 5 },
  { id: '2THS', name: '2 Thessalonians', abbreviations: ['2 thess', '2 thessalonians', '2thess', '2ths', '2 ths', '2th', '2 th', 'ii thess', '2nd thessalonians', 'second thessalonians', '2nd thess', 'second thess'], testament: 'NT', chaptersCount: 3 },
  { id: '1TIM', name: '1 Timothy', abbreviations: ['1 tim', '1 timothy', '1tim', '1ti', '1 ti', 'i tim', '1st timothy', 'first timothy', '1st tim', 'first tim'], testament: 'NT', chaptersCount: 6 },
  { id: '2TIM', name: '2 Timothy', abbreviations: ['2 tim', '2 timothy', '2tim', '2ti', '2 ti', 'ii tim', '2nd timothy', 'second timothy', '2nd tim', 'second tim'], testament: 'NT', chaptersCount: 4 },
  { id: 'TIT', name: 'Titus', abbreviations: ['titus', 'tit', 'ti'], testament: 'NT', chaptersCount: 3 },
  { id: 'PHM', name: 'Philemon', abbreviations: ['philem', 'phm', 'pm', 'phlm', 'philemon'], testament: 'NT', chaptersCount: 1 },
  { id: 'HEB', name: 'Hebrews', abbreviations: ['heb', 'he', 'hebrews'], testament: 'NT', chaptersCount: 13 },
  { id: 'JAS', name: 'James', abbreviations: ['jas', 'jm', 'james'], testament: 'NT', chaptersCount: 5 },
  { id: '1PET', name: '1 Peter', abbreviations: ['1 pet', '1 peter', '1pet', '1pe', '1 pe', 'i pet', '1st peter', 'first peter', '1st pet', 'first pet'], testament: 'NT', chaptersCount: 5 },
  { id: '2PET', name: '2 Peter', abbreviations: ['2 pet', '2 peter', '2pet', '2pe', '2 pe', 'ii pet', '2nd peter', 'second peter', '2nd pet', 'second pet'], testament: 'NT', chaptersCount: 3 },
  { id: '1JHN', name: '1 John', abbreviations: ['1 john', '1jhn', '1 jhn', '1jn', '1 jn', 'i john', '1st john', 'first john', '1st jhn', '1st jn'], testament: 'NT', chaptersCount: 5 },
  { id: '2JHN', name: '2 John', abbreviations: ['2 john', '2jhn', '2 jhn', '2jn', '2 jn', 'ii john', '2nd john', 'second john', '2nd jhn', '2nd jn'], testament: 'NT', chaptersCount: 1 },
  { id: '3JHN', name: '3 John', abbreviations: ['3 john', '3jhn', '3 jhn', '3jn', '3 jn', 'iii john', '3rd john', 'third john', '3rd jhn', '3rd jn'], testament: 'NT', chaptersCount: 1 },
  { id: 'JUD', name: 'Jude', abbreviations: ['jude', 'jud', 'jd'], testament: 'NT', chaptersCount: 1 },
  { id: 'REV', name: 'Revelation', abbreviations: ['rev', 're', 'rv'], testament: 'NT', chaptersCount: 22 },
];

// Exact Verse Counts Mapping for standard chapters across major books
const CHAPTER_MAX_VERSES_MAP: Record<string, Record<number, number>> = {
  Matthew: {
    1: 25, 2: 23, 3: 17, 4: 25, 5: 48, 6: 34, 7: 29, 8: 34, 9: 38, 10: 42,
    11: 30, 12: 50, 13: 58, 14: 36, 15: 39, 16: 28, 17: 27, 18: 35, 19: 30, 20: 34,
    21: 46, 22: 46, 23: 39, 24: 51, 25: 46, 26: 75, 27: 66, 28: 20,
  },
  Mark: {
    1: 45, 2: 28, 3: 35, 4: 41, 5: 43, 6: 56, 7: 37, 8: 38, 9: 50, 10: 52,
    11: 33, 12: 44, 13: 37, 14: 72, 15: 47, 16: 20,
  },
  Luke: {
    1: 80, 2: 52, 3: 38, 4: 44, 5: 39, 6: 49, 7: 50, 8: 56, 9: 62, 10: 42,
    11: 54, 12: 59, 13: 35, 14: 35, 15: 32, 16: 31, 17: 37, 18: 43, 19: 48, 20: 47,
    21: 38, 22: 71, 23: 56, 24: 53,
  },
  John: {
    1: 51, 2: 25, 3: 36, 4: 54, 5: 47, 6: 71, 7: 53, 8: 59, 9: 41, 10: 42,
    11: 57, 12: 50, 13: 38, 14: 31, 15: 27, 16: 33, 17: 26, 18: 40, 19: 42, 20: 31, 21: 25,
  },
  Acts: {
    1: 26, 2: 47, 3: 26, 4: 37, 5: 42, 6: 15, 7: 60, 8: 40, 9: 43, 10: 48,
    11: 30, 12: 25, 13: 52, 14: 28, 15: 41, 16: 40, 17: 34, 18: 28, 19: 41, 20: 38,
    21: 40, 22: 30, 23: 35, 24: 27, 25: 27, 26: 32, 27: 44, 28: 31,
  },
  Romans: {
    1: 32, 2: 29, 3: 31, 4: 25, 5: 21, 6: 23, 7: 25, 8: 39, 9: 33, 10: 21,
    11: 36, 12: 21, 13: 14, 14: 23, 15: 33, 16: 27,
  },
  Genesis: {
    1: 31, 2: 25, 3: 24, 4: 26, 5: 32, 6: 22, 7: 24, 8: 22, 9: 29, 10: 32,
    11: 32, 12: 20, 15: 21, 18: 33, 22: 24, 28: 22, 37: 36, 50: 26,
  },
  Psalms: {
    1: 6, 23: 6, 91: 16, 100: 5, 119: 176, 121: 8, 139: 24, 150: 6,
  },
  Proverbs: {
    1: 33, 3: 35, 4: 27, 16: 33, 31: 31,
  },
  Daniel: {
    1: 21, 2: 49, 3: 30, 4: 37, 5: 31, 6: 28, 7: 28, 8: 27, 9: 27, 10: 21, 11: 45, 12: 13,
  },
  '1 Corinthians': {
    13: 13, 15: 58,
  },
};

export function getMaxVersesForChapter(bookName: string, chapter: number): number {
  if (!bookName || !chapter || chapter < 1) return 0;
  
  // Find canonical book from BIBLE_BOOKS
  const searchName = bookName.trim().toLowerCase();
  const book = BIBLE_BOOKS.find(
    (b) =>
      b.name.toLowerCase() === searchName ||
      b.id.toLowerCase() === searchName ||
      b.abbreviations.some((abbr) => abbr.toLowerCase() === searchName)
  );

  const canonicalName = book ? book.name : bookName;
  const counts = BIBLE_CHAPTER_VERSE_COUNTS[canonicalName];
  if (counts && counts[chapter - 1] !== undefined) {
    return counts[chapter - 1];
  }

  // Fallback if book name exists in map directly
  if (BIBLE_CHAPTER_VERSE_COUNTS[bookName] && BIBLE_CHAPTER_VERSE_COUNTS[bookName][chapter - 1] !== undefined) {
    return BIBLE_CHAPTER_VERSE_COUNTS[bookName][chapter - 1];
  }

  return 0;
}

// Extensive Verbatim Offline Bible Database (Exact Authentic Text per Translation)
const VERBATIM_OFFLINE_DB: Record<string, Record<string, string>> = {
  // Genesis 1
  'Genesis:1:1': {
    KJV: 'In the beginning God created the heaven and the earth.',
    NKJV: 'In the beginning God created the heavens and the earth.',
    ESV: 'In the beginning, God created the heavens and the earth.',
    WEB: 'In the beginning, God created the heavens and the earth.',
  },
  'Genesis:1:2': {
    KJV: 'And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.',
    NKJV: 'The earth was without form, and void; and darkness was on the face of the deep. And the Spirit of God was hovering over the face of the waters.',
    ESV: 'The earth was without form and void, and darkness was over the face of the deep. And the Spirit of God was hovering over the face of the waters.',
    WEB: 'The earth was waste and void. Darkness was on the face of the deep. The Spirit of God was hovering over the surface of the waters.',
  },
  'Genesis:1:3': {
    KJV: 'And God said, Let there be light: and there was light.',
    NKJV: 'Then God said, "Let there be light"; and there was light.',
    ESV: 'And God said, "Let there be light," and there was light.',
    WEB: 'God said, "Let there be light," and there was light.',
  },
  'Genesis:1:4': {
    KJV: 'And God saw the light, that it was good: and God divided the light from the darkness.',
    NKJV: 'And God saw the light, that it was good; and God divided the light from the darkness.',
    ESV: 'And God saw that the light was good. And God separated the light from the darkness.',
    WEB: 'God saw the light, that it was good, and God divided the light from the darkness.',
  },
  'Genesis:1:5': {
    KJV: 'And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day.',
    NKJV: 'God called the light Day, and the darkness He called Night. So the evening and the morning were the first day.',
    ESV: 'God called the light Day, and the darkness he called Night. And there was evening and there was morning, the first day.',
    WEB: 'God called the light "day", and the darkness he called "night". There was evening and there was morning, one day.',
  },

  // Joshua 1:9
  'Joshua:1:9': {
    KJV: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.',
    NKJV: 'Have I not commanded you? Be strong and of good courage; do not be afraid, nor be dismayed, for the LORD your God is with you wherever you go.',
    ESV: 'Have I not commanded you? Be strong and courageous. Do not be frightened, and do not be dismayed, for the LORD your God is with you wherever you go.',
    WEB: 'Haven\'t I commanded you? Be strong and courageous. Don\'t be afraid, and don\'t be dismayed, for Yahweh your God is with you wherever you go.',
  },

  // Psalm 23
  'Psalms:23:1': {
    KJV: 'The LORD is my shepherd; I shall not want.',
    NKJV: 'The LORD is my shepherd; I shall not want.',
    ESV: 'The LORD is my shepherd; I shall not want.',
    WEB: 'Yahweh is my shepherd: I shall have no lack.',
  },
  'Psalms:23:2': {
    KJV: 'He maketh me to lie down in green pastures: he leadeth me beside the still waters.',
    NKJV: 'He makes me to lie down in green pastures; He leads me beside the still waters.',
    ESV: 'He makes me lie down in green pastures. He leads me beside still waters.',
    WEB: 'He makes me lie down in green pastures. He leads me beside still waters.',
  },
  'Psalms:23:3': {
    KJV: 'He restoreth my soul: he leadeth me in the paths of righteousness for his name\'s sake.',
    NKJV: 'He restores my soul; He leads me in the paths of righteousness For His name\'s sake.',
    ESV: 'He restores my soul. He leads me in paths of righteousness for his name\'s sake.',
    WEB: 'He restores my soul. He guides me in the paths of righteousness for his name\'s sake.',
  },
  'Psalms:23:4': {
    KJV: 'Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.',
    NKJV: 'Yea, though I walk through the valley of the shadow of death, I will fear no evil; For You are with me; Your rod and Your staff, they comfort me.',
    ESV: 'Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me; your rod and your staff, they comfort me.',
    WEB: 'Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me.',
  },
  'Psalms:23:5': {
    KJV: 'Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over.',
    NKJV: 'You prepare a table before me in the presence of my enemies; You anoint my head with oil; My cup runs over.',
    ESV: 'You prepare a table before me in the presence of my enemies; you anoint my head with oil; my cup overflows.',
    WEB: 'You prepare a table before me in the presence of my enemies. You anoint my head with oil. My cup runs over.',
  },
  'Psalms:23:6': {
    KJV: 'Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever.',
    NKJV: 'Surely goodness and mercy shall follow me All the days of my life; And I will dwell in the house of the LORD Forever.',
    ESV: 'Surely goodness and mercy shall follow me all the days of my life, and I shall dwell in the house of the LORD forever.',
    WEB: 'Surely goodness and loving kindness shall follow me all the days of my life, and I will dwell in Yahweh\'s house forever.',
  },

  // Psalm 91
  'Psalms:91:1': {
    KJV: 'He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty.',
    NKJV: 'He who dwells in the secret place of the Most High shall abide under the shadow of the Almighty.',
    ESV: 'He who dwells in the shelter of the Most High will abide in the shadow of the Almighty.',
    WEB: 'He who dwells in the secret place of the Most High will rest in the shadow of the Almighty.',
  },
  'Psalms:91:2': {
    KJV: 'I will say of the LORD, He is my refuge and my fortress: my God; in him will I trust.',
    NKJV: 'I will say of the LORD, "He is my refuge and my fortress; My God, in Him I will trust."',
    ESV: 'I will say to the LORD, "My refuge and my fortress, my God, in whom I trust."',
    WEB: 'I will say of Yahweh, "He is my refuge and my fortress; my God, in whom I trust."',
  },
  'Psalms:91:3': {
    KJV: 'Surely he shall deliver thee from the snare of the fowler, and from the noisome pestilence.',
    NKJV: 'Surely He shall deliver you from the snare of the fowler And from the perilous pestilence.',
    ESV: 'For he will deliver you from the snare of the fowler and from the deadly pestilence.',
    WEB: 'For he will deliver you from the snare of the fowler, and from the deadly pestilence.',
  },
  'Psalms:91:4': {
    KJV: 'He shall cover thee with his feathers, and under his wings shalt thou trust: his truth shall be thy shield and buckler.',
    NKJV: 'He shall cover you with His feathers, And under His wings you shall take refuge; His truth shall be your shield and buckler.',
    ESV: 'He will cover you with his pinions, and under his wings you will find refuge; his faithfulness is a shield and buckler.',
    WEB: 'He will cover you with his feathers. Under his wings you will take refuge. His faithfulness is your shield and rampart.',
  },

  // Psalm 100
  'Psalms:100:1': {
    KJV: 'Make a joyful noise unto the LORD, all ye lands.',
    NKJV: 'Make a joyful shout to the LORD, all you lands!',
    ESV: 'Make a joyful noise to the LORD, all the earth!',
    WEB: 'Shout for joy to Yahweh, all you lands!',
  },
  'Psalms:100:2': {
    KJV: 'Serve the LORD with gladness: come before his presence with singing.',
    NKJV: 'Serve the LORD with gladness; Come before His presence with singing.',
    ESV: 'Serve the LORD with gladness! Come into his presence with singing!',
    WEB: 'Serve Yahweh with gladness. Come before his presence with singing.',
  },
  'Psalms:100:3': {
    KJV: 'Know ye that the LORD he is God: it is he that hath made us, and not we ourselves; we are his people, and the sheep of his pasture.',
    NKJV: 'Know that the LORD, He is God; It is He who has made us, and not we ourselves; We are His people and the sheep of His pasture.',
    ESV: 'Know that the LORD, he is God! It is he who made us, and we are his; we are his people, and the sheep of his pasture.',
    WEB: 'Know that Yahweh, he is God. It is he who has made us, and we are his. We are his people, and the sheep of his pasture.',
  },

  // Psalm 119:105
  'Psalms:119:105': {
    KJV: 'Thy word is a lamp unto my feet, and a light unto my path.',
    NKJV: 'Your word is a lamp to my feet And a light to my path.',
    ESV: 'Your word is a lamp to my feet and a light to my path.',
    WEB: 'Your word is a lamp to my feet, and a light for my path.',
  },

  // Psalm 121
  'Psalms:121:1': {
    KJV: 'I will lift up mine eyes unto the hills, from whence cometh my help.',
    NKJV: 'I will lift up my eyes to the hills— From whence comes my help?',
    ESV: 'I lift up my eyes to the hills. From where does my help come?',
    WEB: 'I will lift up my eyes to the hills. Where does my help come from?',
  },
  'Psalms:121:2': {
    KJV: 'My help cometh from the LORD, which made heaven and earth.',
    NKJV: 'My help comes from the LORD, Who made heaven and earth.',
    ESV: 'My help comes from the LORD, who made heaven and earth.',
    WEB: 'My help comes from Yahweh, who made heaven and earth.',
  },

  // Proverbs 3:5-6
  'Proverbs:3:5': {
    KJV: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.',
    NKJV: 'Trust in the LORD with all your heart, And lean not on your own understanding;',
    ESV: 'Trust in the LORD with all your heart, and do not lean on your own understanding.',
    WEB: 'Trust in Yahweh with all your heart, and don\'t lean on your own understanding.',
  },
  'Proverbs:3:6': {
    KJV: 'In all thy ways acknowledge him, and he shall direct thy paths.',
    NKJV: 'In all your ways acknowledge Him, And He shall direct your paths.',
    ESV: 'In all your ways acknowledge him, and he will make straight your paths.',
    WEB: 'In all your ways acknowledge him, and he will make your paths straight.',
  },

  // Isaiah 40:31
  'Isaiah:40:31': {
    KJV: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.',
    NKJV: 'But those who wait on the LORD Shall renew their strength; They shall mount up with wings like eagles, They shall run and not be weary, They shall walk and not faint.',
    ESV: 'but they who wait for the LORD shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint.',
    WEB: 'but those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.',
  },

  // Jeremiah 29:11
  'Jeremiah:29:11': {
    KJV: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.',
    NKJV: 'For I know the thoughts that I think toward you, says the LORD, thoughts of peace and not of evil, to give you a future and a hope.',
    ESV: 'For I know the plans I have for you, declares the LORD, plans for welfare and not for evil, to give you a future and a hope.',
    WEB: 'For I know the thoughts that I think toward you, says Yahweh, thoughts of peace, and not of evil, to give you hope and a future.',
  },

  // Matthew 5
  'Matthew:5:1': {
    KJV: 'And seeing the multitudes, he went up into a mountain: and when he was set, his disciples came unto him:',
    NKJV: 'And seeing the multitudes, He went up on a mountain, and when He was seated His disciples came to Him.',
    ESV: 'Seeing the crowds, he went up on the mountain, and when he sat down, his disciples came to him.',
    WEB: 'Seeing the crowds, he went up onto the mountain when he sat down, his disciples came to him.',
  },
  'Matthew:5:3': {
    KJV: 'Blessed are the poor in spirit: for theirs is the kingdom of heaven.',
    NKJV: 'Blessed are the poor in spirit, For theirs is the kingdom of heaven.',
    ESV: 'Blessed are the poor in spirit, for theirs is the kingdom of heaven.',
    WEB: 'Blessed are the poor in spirit, for theirs is the Kingdom of Heaven.',
  },
  'Matthew:5:14': {
    KJV: 'Ye are the light of the world. A city that is set on an hill cannot be hid.',
    NKJV: 'You are the light of the world. A city that is set on a hill cannot be hidden.',
    ESV: 'You are the light of the world. A city set on a hill cannot be hidden.',
    WEB: 'You are the light of the world. A city located on a hill can\'t be hidden.',
  },
  'Matthew:5:16': {
    KJV: 'Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.',
    NKJV: 'Let your light so shine before men, that they may see your good works and glorify your Father in heaven.',
    ESV: 'In the same way, let your light shine before others, so that they may see your good works and give glory to your Father who is in heaven.',
    WEB: 'Even so, let your light shine before men; that they may see your good works, and glorify your Father who is in heaven.',
  },

  // Matthew 6:9-13
  'Matthew:6:9': {
    KJV: 'After this manner therefore pray ye: Our Father which art in heaven, Hallowed be thy name.',
    NKJV: 'In this manner, therefore, pray: Our Father in heaven, Hallowed be Your name.',
    ESV: 'Pray then like this: "Our Father in heaven, hallowed be your name."',
    WEB: 'Pray like this: "Our Father in heaven, may your name be kept holy."',
  },
  'Matthew:6:10': {
    KJV: 'Thy kingdom come. Thy will be done in earth, as it is in heaven.',
    NKJV: 'Your kingdom come. Your will be done On earth as it is in heaven.',
    ESV: 'Your kingdom come, your will be done, on earth as it is in heaven.',
    WEB: 'Let your Kingdom come. Let your will be done on earth as it is in heaven.',
  },
  'Matthew:6:11': {
    KJV: 'Give us this day our daily bread.',
    NKJV: 'Give us this day our daily bread.',
    ESV: 'Give us this day our daily bread,',
    WEB: 'Give us today our daily bread.',
  },
  'Matthew:6:12': {
    KJV: 'And forgive us our debts, as we forgive our debtors.',
    NKJV: 'And forgive us our debts, As we forgive our debtors.',
    ESV: 'and forgive us our debts, as we also have forgiven our debtors.',
    WEB: 'Forgive us our debts, as we also forgive our debtors.',
  },
  'Matthew:6:13': {
    KJV: 'And lead us not into temptation, but deliver us from evil: For thine is the kingdom, and the power, and the glory, for ever. Amen.',
    NKJV: 'And do not lead us into temptation, But deliver us from the evil one. For Yours is the kingdom and the power and the glory forever. Amen.',
    ESV: 'And lead us not into temptation, but deliver us from evil.',
    WEB: 'Bring us not into temptation, but deliver us from the evil one. For yours is the Kingdom, the power, and the glory forever. Amen.',
  },
  'Matthew:6:33': {
    KJV: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.',
    NKJV: 'But seek first the kingdom of God and His righteousness, and all these things shall be added to you.',
    ESV: 'But seek first the kingdom of God and his righteousness, and all these things will be added to you.',
    WEB: 'But seek first God\'s Kingdom, and his righteousness; and all these things will be given to you as well.',
  },

  // Matthew 8:8-9
  'Matthew:8:8': {
    KJV: 'The centurion answered and said, Lord, I am not worthy that thou shouldest come under my roof: but speak the word only, and my servant shall be healed.',
    NKJV: 'The centurion answered and said, "Lord, I am not worthy that You should come under my roof. But only speak a word, and my servant will be healed."',
    ESV: 'But the centurion replied, "Lord, I am not worthy to have you come under my roof, but only say the word, and my servant will be healed."',
    WEB: 'The centurion answered, "Lord, I\'m not worthy for you to come under my roof. Just say the word, and my servant will be healed."',
  },
  'Matthew:8:9': {
    KJV: 'For I am a man under authority, having soldiers under me: and I say to this man, Go, and he goeth; and to another, Come, and he cometh; and to my servant, Do this, and he doeth it.',
    NKJV: 'For I also am a man under authority, having soldiers under me. And I say to this one, \'Go,\' and he goes; and to another, \'Come,\' and he comes; and to my servant, \'Do this,\' and he does it.',
    ESV: 'For I too am a man under authority, with soldiers under me. And I say to one, \'Go,\' and he goes, and to another, \'Come,\' and he comes, and to my servant, \'Do this,\' and he does it.',
    WEB: 'For I also am a man under authority, having under myself soldiers. I tell this one, "Go," and he goes; and to another, "Come," and he comes; and to my servant, "Do this," and he does it.',
  },

  // Matthew 11:28
  'Matthew:11:28': {
    KJV: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.',
    NKJV: 'Come to Me, all you who labor and are heavy laden, and I will give you rest.',
    ESV: 'Come to me, all who labor and are heavy laden, and I will give you rest.',
    WEB: 'Come to me, all you who labor and are heavily burdened, and I will give you rest.',
  },

  // John 1:1, 14
  'John:1:1': {
    KJV: 'In the beginning was the Word, and the Word was with God, and the Word was God.',
    NKJV: 'In the beginning was the Word, and the Word was with God, and the Word was God.',
    ESV: 'In the beginning was the Word, and the Word was with God, and the Word was God.',
    WEB: 'In the beginning was the Word, and the Word was with God, and the Word was God.',
  },
  'John:1:14': {
    KJV: 'And the Word was made flesh, and dwelt among us, (and we beheld his glory, the glory as of the only begotten of the Father,) full of grace and truth.',
    NKJV: 'And the Word became flesh and dwelt among us, and we beheld His glory, the glory as of the only begotten of the Father, full of grace and truth.',
    ESV: 'And the Word became flesh and dwelt among us, and we have seen his glory, glory as of the only Son from the Father, full of grace and truth.',
    WEB: 'The Word became flesh, and lived among us. We saw his glory, such glory as of the one and only Son of the Father, full of grace and truth.',
  },

  // John 3:16-17
  'John:3:16': {
    KJV: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
    NKJV: 'For God so loved the world that He gave His only begotten Son, that whoever believes in Him should not perish but have everlasting life.',
    ESV: 'For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.',
    WEB: 'For God so loved the world, that he gave his only begotten Son, that whoever believes in him should not perish, but have eternal life.',
  },
  'John:3:17': {
    KJV: 'For God sent not his Son into the world to condemn the world; but that the world through him might be saved.',
    NKJV: 'For God did not send His Son into the world to condemn the world, but that the world through Him might be saved.',
    ESV: 'For God did not send his Son into the world to condemn the world, but in order that the world might be saved through him.',
    WEB: 'For God didn\'t send his Son into the world to judge the world, but that the world should be saved through him.',
  },

  // John 14:6
  'John:14:6': {
    KJV: 'Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.',
    NKJV: 'Jesus said to him, "I am the way, the truth, and the life. No one comes to the Father except through Me."',
    ESV: 'Jesus said to him, "I am the way, and the truth, and the life. No one comes to the Father except through me."',
    WEB: 'Jesus said to him, "I am the way, the truth, and the life. No one comes to the Father, except through me."',
  },

  // Romans 8:28
  'Romans:8:28': {
    KJV: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.',
    NKJV: 'And we know that all things work together for good to those who love God, to those who are the called according to His purpose.',
    ESV: 'And we know that for those who love God all things work together for good, for those who are called according to his purpose.',
    WEB: 'We know that all things work together for good for those who love God, to those who are called according to his purpose.',
  },

  // Romans 12:2
  'Romans:12:2': {
    KJV: 'And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.',
    NKJV: 'And do not be conformed to this world, but be transformed by the renewing of your mind, that you may prove what is that good and acceptable and perfect will of God.',
    ESV: 'Do not be conformed to this world, but be transformed by the renewal of your mind, that by testing you may discern what is the will of God, what is good and acceptable and perfect.',
    WEB: 'Don\'t be conformed to this world, but be transformed by the renewing of your mind, so that you may prove what is the good, well-pleasing, and perfect will of God.',
  },

  // 1 Corinthians 13:4
  '1 Corinthians:13:4': {
    KJV: 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up,',
    NKJV: 'Love suffers long and is kind; love does not envy; love does not parade itself, is not puffed up;',
    ESV: 'Love is patient and kind; love does not envy or boast; it is not arrogant',
    WEB: 'Love is patient and is kind; love doesn\'t envy. Love doesn\'t boast, it isn\'t proud,',
  },

  // Galatians 5:22-23
  'Galatians:5:22': {
    KJV: 'But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith,',
    NKJV: 'But the fruit of the Spirit is love, joy, peace, longsuffering, kindness, goodness, faithfulness,',
    ESV: 'But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness,',
    WEB: 'But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness,',
  },
  'Galatians:5:23': {
    KJV: 'Meekness, temperance: against such there is no law.',
    NKJV: 'gentleness, self-control. Against such there is no law.',
    ESV: 'gentleness, self-control; against such there is no law.',
    WEB: 'gentleness, and self-control. Against such things there is no law.',
  },

  // Philippians 4:6-7, 13
  'Philippians:4:6': {
    KJV: 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.',
    NKJV: 'Be anxious for nothing, but in everything by prayer and supplication, with thanksgiving, let your requests be made known to God;',
    ESV: 'do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.',
    WEB: 'In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God.',
  },
  'Philippians:4:7': {
    KJV: 'And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.',
    NKJV: 'and the peace of God, which surpasses all understanding, will guard your hearts and minds through Christ Jesus.',
    ESV: 'And the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus.',
    WEB: 'And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.',
  },
  'Philippians:4:13': {
    KJV: 'I can do all things through Christ which strengtheneth me.',
    NKJV: 'I can do all things through Christ who strengthens me.',
    ESV: 'I can do all things through him who strengthens me.',
    WEB: 'I can do all things through Christ, who strengthens me.',
  },

  // 2 Timothy 1:7
  '2 Timothy:1:7': {
    KJV: 'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.',
    NKJV: 'For God has not given us a spirit of fear, but of power and of love and of a sound mind.',
    ESV: 'for God gave us a spirit not of fear but of power and love and self-control.',
    WEB: 'For God didn\'t give us a spirit of fear, but of power, love, and self-control.',
  },

  // Hebrews 11:1
  'Hebrews:11:1': {
    KJV: 'Now faith is the substance of things hoped for, the evidence of things not seen.',
    NKJV: 'Now faith is the substance of things hoped for, the evidence of things not seen.',
    ESV: 'Now faith is the assurance of things hoped for, the conviction of things not seen.',
    WEB: 'Now faith is assurance of things hoped for, proof of things not seen.',
  },

  // 1 John 4:8, 19
  '1 John:4:8': {
    KJV: 'He that loveth not knoweth not God; for God is love.',
    NKJV: 'He who does not love does not know God, for God is love.',
    ESV: 'Anyone who does not love does not know God, because God is love.',
    WEB: 'He who doesn\'t love doesn\'t know God, for God is love.',
  },
  '1 John:4:19': {
    KJV: 'We love him, because he first loved us.',
    NKJV: 'We love Him because He first loved us.',
    ESV: 'We love because he first loved us.',
    WEB: 'We love him, because he first loved us.',
  },

  // Deuteronomy 32:1-6
  'Deuteronomy:32:1': {
    NKJV: '“Give ear, O heavens, and I will speak; And hear, O earth, the words of my mouth.',
    ESV: '“Give ear, O heavens, and I will speak, and let the earth hear the words of my mouth.',
    KJV: 'Give ear, O ye heavens, and I will speak; and hear, O earth, the words of my mouth.',
    WEB: 'Give ear, you heavens, and I will speak. Let the earth hear the words of my mouth.',
  },
  'Deuteronomy:32:2': {
    NKJV: 'Let my teaching drop as the rain, My speech distill as the dew, As raindrops on the tender herb, And as showers on the grass.',
    ESV: 'May my teaching drop as the rain, my speech distill as the dew, like gentle rain upon the tender grass, and like showers upon the herb.',
    KJV: 'My doctrine shall drop as the rain, my speech shall distil as the dew, as the small rain upon the tender herb, and as the showers upon the grass:',
    WEB: 'My doctrine will drop as the rain. My speech will condense as the dew, as the mist on the tender grass, and as the showers on the herb.',
  },
  'Deuteronomy:32:3': {
    NKJV: 'For I proclaim the name of the LORD: Ascribe greatness to our God.',
    ESV: 'For I will proclaim the name of the LORD; ascribe greatness to our God!',
    KJV: 'Because I will publish the name of the LORD: ascribe ye greatness unto our God.',
    WEB: 'For I will proclaim Yahweh’s name. Ascribe greatness to our God!',
  },
  'Deuteronomy:32:4': {
    NKJV: 'He is the Rock, His work is perfect; For all His ways are justice, A God of truth and without injustice; Righteous and upright is He.',
    ESV: '“The Rock, his work is perfect, for all his ways are justice. A God of faithfulness and without iniquity, just and upright is he.',
    KJV: 'He is the Rock, his work is perfect: for all his ways are judgment: a God of truth and without iniquity, just and right is he.',
    WEB: 'The Rock, his work is perfect, for all his ways are justice: a God of faithfulness and without iniquity, just and right is he.',
  },
  'Deuteronomy:32:5': {
    NKJV: 'They have corrupted themselves; They are not His children, Because of their blemish: A perverse and crooked generation.',
    ESV: 'They have dealt corruptly with him; they are no longer his children because they are blemished; they are a crooked and twisted generation.',
    KJV: 'They have corrupted themselves, their spot is not the spot of his children: they are a perverse and crooked generation.',
    WEB: 'They have dealt corruptly with him. They are not his children, because of their defect. They are a perverse and crooked generation.',
  },
  'Deuteronomy:32:6': {
    NKJV: 'Do you thus deal with the LORD, O foolish and unwise people? Is He not your Father, who bought you? Has He not made you and established you?',
    ESV: 'Do you thus repay the LORD, you foolish and senseless people? Is not he your father, who created you, who made you and established you?',
    KJV: 'Do ye thus requite the LORD, O foolish people and unwise? is not he thy father that hath bought thee? hath he not made thee, and established thee?',
    WEB: 'Is this the way you repay Yahweh, foolish and unwise people? Isn’t he your father who has bought you? He has made you and established you.',
  },
};

/**
 * Universal Scripture Text Sanitizer
 * Thoroughly removes Strong's concordance tags (<S>1580</S>),
 * attached numbers (e.g., LORD3068 -> LORD, requite1580 -> requite),
 * HTML tags, brackets, KJV translator marginal notes (e.g., "to: or, to edify profitably", ": Heb. ...", ": Gr. ..."),
 * and extra spaces.
 * If preserveStrongs is true, preserves <S>H1234</S> or <S>G1234</S> tags for Concordance view.
 */
export function sanitizeVerseText(text: string, preserveStrongs: boolean = false): string {
  if (!text) return '';
  if (preserveStrongs) {
    return text
      // Remove comment links
      .replace(/<a[^>]*>.*?<\/a>/gi, '')
      // Remove <sup> translator footnotes/marginal notes and their contents
      .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')
      .replace(/<sup[^>]*>[\s\S]*$/gi, '')
      // Remove other HTML tags except <S> and </S> (like <b>, <i>, <br>, <span>, etc.)
      .replace(/<(?!S\b|\/S>)[^>]*>/gi, '')
      // Remove trailing translator marginal glosses if un-tagged
      .replace(/\s*(?:(?:\b[\w\s'’"-]+)?:\s*(?:or,|Heb\.|Gr\.|that is,|some read,|Chald\.|Lat\.|meaning,)[^:]*)+$/gi, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }
  return text
    // Remove <sup> translator footnotes/marginal notes and their contents
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')
    .replace(/<sup[^>]*>[\s\S]*$/gi, '')
    // Remove Strong's tags like <S>1580</S> or <S 1580> or <S>
    .replace(/<S[^>]*>[\s\S]*?<\/S>/gi, '')
    .replace(/<S[^>]*>/gi, '')
    // Remove comment links
    .replace(/<a[^>]*>.*?<\/a>/gi, '')
    // Remove remaining HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove Strong's numbers attached directly to words (e.g. requite1580 -> requite, LORD3068 -> LORD)
    .replace(/([a-zA-Z’']+)\d+/g, '$1')
    // Remove bracketed or parenthesized numbers like [1], (1580), {1234}
    .replace(/\[\d+\]/g, '')
    .replace(/\(\d+\)/g, '')
    .replace(/\{\d+\}/g, '')
    // Remove KJV translator marginal notes and alternate translation glosses
    .replace(/\s*(?:(?:\b[\w\s'’"-]+)?:\s*(?:or,|Heb\.|Gr\.|that is,|some read,|Chald\.|Lat\.|meaning,)[^:]*)+$/gi, '')
    .replace(/\s+(?:[\w\s'’"-]+)?:\s*(?:or,|Heb\.|Gr\.|that is,|some read,|Chald\.|Lat\.|meaning,)[^.]*(?:\.|$)/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Map book names and abbreviations to standard 1-66 book index
export function getBookNumber(bookName: string): number {
  const norm = bookName.trim().toLowerCase();
  const index = BIBLE_BOOKS.findIndex(
    (b) =>
      b.name.toLowerCase() === norm ||
      b.id.toLowerCase() === norm ||
      b.abbreviations.some((abb) => abb.toLowerCase() === norm)
  );
  if (index !== -1) return index + 1;

  const altMap: Record<string, number> = {
    genesis: 1, gen: 1, ge: 1, gn: 1,
    exodus: 2, exo: 2, ex: 2, exod: 2,
    leviticus: 3, lev: 3, le: 3, lv: 3,
    numbers: 4, num: 4, nu: 4, nm: 4, nb: 4,
    deuteronomy: 5, deut: 5, deu: 5, dt: 5,
    joshua: 6, josh: 6, jos: 6, jsh: 6,
    judges: 7, judg: 7, jdg: 7, jg: 7,
    ruth: 8, rth: 8, ru: 8,
    '1 samuel': 9, '1sam': 9, '1s': 9,
    '2 samuel': 10, '2sam': 10, '2s': 10,
    '1 kings': 11, '1kgs': 11, '1k': 11,
    '2 kings': 12, '2kgs': 12, '2k': 12,
    '1 chronicles': 13, '1chr': 13, '1ch': 13,
    '2 chronicles': 14, '2chr': 14, '2ch': 14,
    ezra: 15, ezr: 15,
    nehemiah: 16, neh: 16, ne: 16,
    esther: 17, esth: 17, est: 17,
    job: 18, jb: 18,
    psalms: 19, psalm: 19, psa: 19, ps: 19, pss: 19,
    proverbs: 20, prov: 20, pro: 20, pr: 20,
    ecclesiastes: 21, eccl: 21, ecc: 21, ec: 21,
    'song of solomon': 22, song: 22, sos: 22, sng: 22,
    isaiah: 23, isa: 23, is: 23,
    jeremiah: 24, jer: 24, je: 24,
    lamentations: 25, lam: 25, la: 25,
    ezekiel: 26, ezek: 26, ezk: 26, eze: 26,
    daniel: 27, dan: 27, da: 27, dn: 27,
    hosea: 28, hos: 28, ho: 28,
    joel: 29, jol: 29, jl: 29,
    amos: 30, amo: 30, am: 30,
    obadiah: 31, obad: 31, oba: 31, ob: 31,
    jonah: 32, jon: 32, jnh: 32,
    micah: 33, mic: 33, mc: 33,
    nahum: 34, nah: 34, nam: 34, na: 34,
    habakkuk: 35, hab: 35, hb: 35,
    zephaniah: 36, zeph: 36, zep: 36, zp: 36,
    haggai: 37, hag: 37, hg: 37,
    zechariah: 38, zech: 38, zec: 38, zc: 38,
    malachi: 39, mal: 39, ml: 39,
    matthew: 40, matt: 40, mat: 40, mt: 40,
    mark: 41, mrk: 41, mk: 41,
    luke: 42, luk: 42, lk: 42,
    john: 43, jhn: 43, jn: 43,
    acts: 44, act: 44, ac: 44,
    romans: 45, rom: 45, ro: 45, rm: 45,
    '1 corinthians': 46, '1cor': 46, '1co': 46,
    '2 corinthians': 47, '2cor': 47, '2co': 47,
    galatians: 48, gal: 48, ga: 48,
    ephesians: 49, eph: 49, ep: 49,
    philippians: 50, phil: 50, php: 50, pp: 50,
    colossians: 51, col: 51, co: 51,
    '1 thessalonians': 52, '1ths': 52, '1th': 52,
    '2 thessalonians': 53, '2ths': 53, '2th': 53,
    '1 timothy': 54, '1tim': 54, '1ti': 54,
    '2 timothy': 55, '2tim': 55, '2ti': 55,
    titus: 56, tit: 56, ti: 56,
    philemon: 57, phm: 57, pm: 57,
    hebrews: 58, heb: 58, he: 58,
    james: 59, jas: 59, jm: 59,
    '1 peter': 60, '1pet': 60, '1pe': 60,
    '2 peter': 61, '2pet': 61, '2pe': 61,
    '1 john': 62, '1jhn': 62, '1jn': 62,
    '2 john': 63, '2jhn': 63, '2jn': 63,
    '3 john': 64, '3jhn': 64, '3jn': 64,
    jude: 65, jud: 65, jd: 65,
    revelation: 66, rev: 66, re: 66, rv: 66
  };
  return altMap[norm] || 1;
}

// Persistent LocalStorage cache key
const LOCAL_STORAGE_KEY = 'AMEN_JOURNAL_BIBLE_CACHE_V13';

// In-Memory Book Cache (0ms instant access across all chapters and verses)
export type BookData = Record<string, Record<string, string>>;
const BOOK_MEMORY_CACHE = new Map<string, BookData>();
const PENDING_BOOK_FETCHES = new Map<string, Promise<BookData | null>>();

function getStoredCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToStoredCache(cacheKey: string, text: string) {
  try {
    const cache = getStoredCache();
    cache[cacheKey] = sanitizeVerseText(text);
    const keys = Object.keys(cache);
    if (keys.length > 250) {
      delete cache[keys[0]];
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to save verse to localStorage cache:', e);
  }
}

function saveBatchToStoredCache(entries: Record<string, string>) {
  try {
    const cache = getStoredCache();
    for (const [key, val] of Object.entries(entries)) {
      cache[key] = sanitizeVerseText(val);
    }
    const keys = Object.keys(cache);
    if (keys.length > 300) {
      const extra = keys.length - 300;
      for (let i = 0; i < extra; i++) {
        delete cache[keys[i]];
      }
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to save batch to localStorage cache:', e);
  }
}

export function getCanonicalBookName(bookName: string): string {
  const norm = bookName.trim().toLowerCase();
  const match = BIBLE_BOOKS.find(
    (b) =>
      b.name.toLowerCase() === norm ||
      b.id.toLowerCase() === norm ||
      b.abbreviations.some((abb) => abb.toLowerCase() === norm)
  );
  return match ? match.name : bookName;
}

/**
 * Pre-load a whole book into memory so all chapters/verses render in 0ms.
 */
export async function loadBookData(
  bookName: string,
  translation: string = 'KJV'
): Promise<BookData | null> {
  const canonicalName = getCanonicalBookName(bookName);
  const bookNum = getBookNumber(canonicalName);
  const transKey = translation.toUpperCase();
  const cacheKey = `${transKey}:${bookNum}`;

  // 1. Instant in-memory cache check (0ms)
  const existing = BOOK_MEMORY_CACHE.get(cacheKey);
  if (existing) return existing;

  // 2. In-flight request deduplication
  const pending = PENDING_BOOK_FETCHES.get(cacheKey);
  if (pending) return pending;

  const fetchPromise = (async (): Promise<BookData | null> => {
    // 3. Check bundled local translations first (KJV, KJV_STRONGS, NKJV, ESV, WEB, NIV, NLT)
    const isBundled = ['KJV', 'KJV_STRONGS', 'NKJV', 'ESV', 'WEB', 'NIV', 'NLT'].includes(transKey);

    if (isBundled) {
      try {
        const res = await fetch(`/bible/${transKey}/${bookNum}.json`);
        if (res.ok) {
          const data: BookData = await res.json();
          BOOK_MEMORY_CACHE.set(cacheKey, data);
          return data;
        }
      } catch {
        // ignore
      }
    }

    // 4. If user asked for an unbundled translation (e.g. NIV, NLT) and is online, try bolls with fast timeout
    if (!isBundled && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1800);
        const bollsRes = await fetch(
          `https://bolls.life/get-chapter/${transKey}/${bookNum}/1/`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        if (bollsRes.ok) {
          // handled per-chapter in fetchBibleVersesAsync
        }
      } catch {
        // fallback
      }
    }

    // 5. Offline fallback: only cache KJV as KJV, do not pollute cacheKey of other translations
    try {
      const fallbackRes = await fetch(`/bible/KJV/${bookNum}.json`);
      if (fallbackRes.ok) {
        const data: BookData = await fallbackRes.json();
        BOOK_MEMORY_CACHE.set(`KJV:${bookNum}`, data);
        if (transKey === 'KJV') {
          return data;
        }
      }
    } catch {
      // ignore
    }

    return null;
  })();

  PENDING_BOOK_FETCHES.set(cacheKey, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    PENDING_BOOK_FETCHES.delete(cacheKey);
  }
}

/**
 * Prefetch a book quietly in background
 */
export function prefetchBook(bookName: string, translation: string = 'KJV') {
  loadBookData(bookName, translation).catch(() => {});
}

/**
 * Prefetch adjacent books for smooth continuous navigation
 */
export function prefetchAdjacentBooks(currentBookName: string, translation: string = 'KJV') {
  const canonicalName = getCanonicalBookName(currentBookName);
  const bookIndex = BIBLE_BOOKS.findIndex((b) => b.name === canonicalName);
  if (bookIndex > 0) {
    prefetchBook(BIBLE_BOOKS[bookIndex - 1].name, translation);
  }
  if (bookIndex < BIBLE_BOOKS.length - 1) {
    prefetchBook(BIBLE_BOOKS[bookIndex + 1].name, translation);
  }
}

/**
 * Synchronous lookup for rendering. 100% functional offline and ultra-fast.
 * Checks fast in-memory book cache first, then verbatim DB, then local storage.
 */
export function getBibleVersesSync(
  bookName: string,
  chapter: number,
  startVerse: number,
  endVerse?: number,
  translation: string = 'KJV'
): BibleVerse[] | null {
  const transKey = translation.toUpperCase();
  const finalEndVerse = endVerse && endVerse >= startVerse ? endVerse : startVerse;
  const canonicalName = getCanonicalBookName(bookName);
  const bookNum = getBookNumber(canonicalName);

  const isConcordanceKJV = transKey === 'KJV_STRONGS';

  // 1. Check in-memory book cache (0.01ms instant access!)
  // Strictly check for the requested translation to ensure switching versions works accurately
  const bookData = BOOK_MEMORY_CACHE.get(`${transKey}:${bookNum}`);

  if (bookData) {
    const chapterObj = bookData[chapter.toString()];
    if (chapterObj) {
      const results: BibleVerse[] = [];
      for (let v = startVerse; v <= finalEndVerse; v++) {
        const text = chapterObj[v.toString()];
        if (text) {
          results.push({
            book: canonicalName,
            chapter,
            verse: v,
            text: sanitizeVerseText(text, isConcordanceKJV),
            translation: transKey,
          });
        }
      }
      if (results.length === finalEndVerse - startVerse + 1) {
        return results;
      }
    }
  }

  // 2. Check exact verbatim offline DB & LocalStorage
  const result: BibleVerse[] = [];
  const stored = getStoredCache();

  for (let v = startVerse; v <= finalEndVerse; v++) {
    const key = `${canonicalName}:${chapter}:${v}`;
    const rawKey = `${bookName}:${chapter}:${v}`;
    const cacheKey = `${key}:${transKey}`;

    // A. Check exact verbatim offline DB for requested translation
    let verseText = VERBATIM_OFFLINE_DB[key]?.[transKey] || VERBATIM_OFFLINE_DB[rawKey]?.[transKey];

    // B. Check cached verse in LocalStorage
    if (!verseText) {
      verseText = stored[cacheKey] || stored[`${rawKey}:${transKey}`];
    }

    // Do not fall back to other translations here; return null so the async fetcher can load the real text
    if (!verseText) {
      return null;
    }

    result.push({
      book: canonicalName,
      chapter,
      verse: v,
      text: sanitizeVerseText(verseText, isConcordanceKJV),
      translation: transKey,
    });
  }

  return result;
}

/**
 * Async fetcher that downloads exact requested verses when online,
 * saves books into memory cache for complete 0ms offline use,
 * and works 100% offline.
 */
export async function fetchBibleVersesAsync(
  bookName: string,
  chapter: number,
  startVerse: number,
  endVerse?: number,
  translation: string = 'KJV'
): Promise<BibleVerse[]> {
  const transKey = translation.toUpperCase();
  const finalEndVerse = endVerse && endVerse >= startVerse ? endVerse : startVerse;
  const canonicalName = getCanonicalBookName(bookName);

  // 1. If sync lookup succeeds for all requested verses, return immediately (0ms!)
  const syncVerses = getBibleVersesSync(canonicalName, chapter, startVerse, finalEndVerse, transKey);
  if (syncVerses && syncVerses.length === finalEndVerse - startVerse + 1) {
    return syncVerses;
  }

  // 2. Load the whole book into memory cache (bundled local asset)
  const bookData = await loadBookData(canonicalName, transKey);
  const isConcordanceKJV = transKey === 'KJV_STRONGS';
  if (bookData) {
    const chapterObj = bookData[chapter.toString()];
    if (chapterObj) {
      const localResults: BibleVerse[] = [];
      for (let v = startVerse; v <= finalEndVerse; v++) {
        const vText = chapterObj[v.toString()];
        if (vText) {
          localResults.push({
            book: canonicalName,
            chapter,
            verse: v,
            text: sanitizeVerseText(vText, isConcordanceKJV),
            translation: transKey,
          });
        }
      }
      if (localResults.length === finalEndVerse - startVerse + 1) {
        return localResults;
      }
    }
  }

  const bookNum = getBookNumber(canonicalName);

  // 3. Online Backup API: bolls.life (Supports NKJV, ESV, KJV, WEB, etc.)
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const bollsUrl = `https://bolls.life/get-chapter/${transKey}/${bookNum}/${chapter}/`;
      const response = await fetch(bollsUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) {
        const chapterData = await response.json();
        if (Array.isArray(chapterData) && chapterData.length > 0) {
          const fetchedResults: BibleVerse[] = [];
          for (let v = startVerse; v <= finalEndVerse; v++) {
            const vObj = chapterData.find((item: any) => item.verse === v);
            if (vObj && vObj.text) {
              const cleanText = sanitizeVerseText(vObj.text, isConcordanceKJV);
              fetchedResults.push({
                book: canonicalName,
                chapter,
                verse: v,
                text: cleanText,
                translation: transKey,
              });
            }
          }
          if (fetchedResults.length === finalEndVerse - startVerse + 1) {
            return fetchedResults;
          }
        }
      }
    } catch (err) {
      console.warn('bolls.life fetch failed, trying bible-api.com fallback:', err);
    }

    // 4. Secondary Online API: bible-api.com
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const isFullChapter =
        startVerse === 1 &&
        endVerse !== undefined &&
        endVerse === getMaxVersesForChapter(canonicalName, chapter);
      const refStr = isFullChapter
        ? `${canonicalName} ${chapter}`
        : `${canonicalName} ${chapter}:${startVerse}${
            endVerse && endVerse !== startVerse ? `-${endVerse}` : ''
          }`;
      const apiTrans = transKey === 'WEB' ? 'web' : 'kjv';
      const response = await fetch(
        `https://bible-api.com/${encodeURIComponent(refStr)}?translation=${apiTrans}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        if (data && data.verses && Array.isArray(data.verses)) {
          const fetchedVerses: BibleVerse[] = data.verses.map((vItem: any) => {
            const vNum = vItem.verse;
            const cleanText = sanitizeVerseText(vItem.text || '');
            return {
              book: canonicalName,
              chapter,
              verse: vNum,
              text: cleanText,
              translation: transKey,
            };
          });

          if (fetchedVerses.length > 0) {
            return fetchedVerses;
          }
        }
      }
    } catch (err) {
      console.warn('bible-api.com fetch failed:', err);
    }
  }

  // 5. Offline Fallback:
  // Use exact verbatim text available in DB or cache, or clean verse text
  const fallbackVerses: BibleVerse[] = [];
  const stored = getStoredCache();

  for (let v = startVerse; v <= finalEndVerse; v++) {
    const key = `${canonicalName}:${chapter}:${v}`;
    const rawKey = `${bookName}:${chapter}:${v}`;
    const cacheKey = `${key}:${transKey}`;

    let text =
      VERBATIM_OFFLINE_DB[key]?.[transKey] ||
      VERBATIM_OFFLINE_DB[rawKey]?.[transKey] ||
      stored[cacheKey];

    if (!text && (VERBATIM_OFFLINE_DB[key] || VERBATIM_OFFLINE_DB[rawKey])) {
      const dbObj = VERBATIM_OFFLINE_DB[key] || VERBATIM_OFFLINE_DB[rawKey];
      text =
        dbObj[transKey] || dbObj['NKJV'] || dbObj['ESV'] || dbObj['KJV'] || dbObj['WEB'];
    }

    if (!text) {
      text = `Verse text for ${canonicalName} ${chapter}:${v} (${transKey})`;
    }

    fallbackVerses.push({
      book: canonicalName,
      chapter,
      verse: v,
      text: sanitizeVerseText(text),
      translation: transKey,
    });
  }

  return fallbackVerses;
}

/**
 * Background cache warmer: pre-loads key books into memory cache
 * in background idle time so main UI thread never suffers startup latency!
 */
export async function warmupOfflineBibleCache(targetTranslation?: string) {
  if (typeof window === 'undefined') return;

  const runWarmup = () => {
    // Only warm up the active translation first, then default translations quietly
    const keyBooks = ['Matthew', 'Genesis', 'Psalms'];
    const active = targetTranslation || 'KJV_STRONGS';

    // Warm up active translation books with small delays so startup is butter smooth
    keyBooks.forEach((book, index) => {
      setTimeout(() => {
        loadBookData(book, active).catch(() => {});
      }, index * 120);
    });
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(runWarmup, { timeout: 3000 });
  } else {
    setTimeout(runWarmup, 800);
  }
}

export const TRANSLATIONS = [
  { id: 'KJV', name: 'King James Version (KJV)' },
  { id: 'KJV_STRONGS', name: 'Concordance (KJV)' },
  { id: 'NKJV', name: 'New King James Version (NKJV)' },
  { id: 'ESV', name: 'English Standard Version (ESV)' },
  { id: 'WEB', name: 'World English Bible (WEB)' },
  { id: 'NIV', name: 'New International Version (NIV)' },
  { id: 'NLT', name: 'New Living Translation (NLT)' },
  { id: 'ASV', name: 'American Standard Version (ASV)' },
  { id: 'BBE', name: 'Bible in Basic English (BBE)' },
  { id: 'CSB', name: 'Christian Standard Bible (CSB)' },
  { id: 'NASB', name: 'New American Standard Bible (NASB)' },
  { id: 'AMP', name: 'Amplified Bible (AMP)' },
  { id: 'YLT', name: "Young's Literal Translation (YLT)" },
];
