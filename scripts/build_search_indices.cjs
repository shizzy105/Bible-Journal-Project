const fs = require('fs');
const path = require('path');

const bibleDir = path.join(__dirname, '..', 'public', 'bible');

// 1. Bundle KJV_STRONGS.json
console.log('Bundling KJV_STRONGS.json...');
const kjvStrongsFull = {};
const kjvStrongsDir = path.join(bibleDir, 'KJV_STRONGS');
if (fs.existsSync(kjvStrongsDir)) {
  for (let b = 1; b <= 66; b++) {
    const bookFile = path.join(kjvStrongsDir, `${b}.json`);
    if (fs.existsSync(bookFile)) {
      kjvStrongsFull[b] = JSON.parse(fs.readFileSync(bookFile, 'utf8'));
    }
  }
  fs.writeFileSync(path.join(bibleDir, 'KJV_STRONGS.json'), JSON.stringify(kjvStrongsFull));
  console.log('Created KJV_STRONGS.json');
}

// 2. Bundle NIV.json if NIV directory exists
const nivDir = path.join(bibleDir, 'NIV');
if (fs.existsSync(nivDir)) {
  console.log('Bundling NIV.json...');
  const nivFull = {};
  for (let b = 1; b <= 66; b++) {
    const bookFile = path.join(nivDir, `${b}.json`);
    if (fs.existsSync(bookFile)) {
      nivFull[b] = JSON.parse(fs.readFileSync(bookFile, 'utf8'));
    }
  }
  fs.writeFileSync(path.join(bibleDir, 'NIV.json'), JSON.stringify(nivFull));
  console.log('Created NIV.json');
}

// 3. Bundle NLT.json if NLT directory exists
const nltDir = path.join(bibleDir, 'NLT');
if (fs.existsSync(nltDir)) {
  console.log('Bundling NLT.json...');
  const nltFull = {};
  for (let b = 1; b <= 66; b++) {
    const bookFile = path.join(nltDir, `${b}.json`);
    if (fs.existsSync(bookFile)) {
      nltFull[b] = JSON.parse(fs.readFileSync(bookFile, 'utf8'));
    }
  }
  fs.writeFileSync(path.join(bibleDir, 'NLT.json'), JSON.stringify(nltFull));
  console.log('Created NLT.json');
}

// 4. Build Strong's Reverse Occurrence Indices:
// strongs_greek_index.json & strongs_hebrew_index.json
console.log('Building Strongs occurrence indices...');
const greekIndex = {};
const hebrewIndex = {};

for (let b = 1; b <= 66; b++) {
  const book = kjvStrongsFull[b];
  if (!book) continue;
  for (const ch in book) {
    const chNum = parseInt(ch, 10);
    const verses = book[ch];
    for (const v in verses) {
      const vNum = parseInt(v, 10);
      const text = verses[v];
      const regex = /([\w\u0027\u2019\-]+)?\s*<S[^>]*>([GH]\d+)<\/S>/gi;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const id = match[2].toUpperCase();
        const word = match[1] || '';
        const target = id.startsWith('G') ? greekIndex : hebrewIndex;
        if (!target[id]) target[id] = [];
        const occurrences = target[id];
        const last = occurrences[occurrences.length - 1];
        if (!last || last[0] !== b || last[1] !== chNum || last[2] !== vNum) {
          // [bookId, chapter, verse, word]
          occurrences.push([b, chNum, vNum, word]);
        }
      }
    }
  }
}

fs.writeFileSync(path.join(bibleDir, 'strongs_greek_index.json'), JSON.stringify(greekIndex));
fs.writeFileSync(path.join(bibleDir, 'strongs_hebrew_index.json'), JSON.stringify(hebrewIndex));
console.log('Created strongs_greek_index.json & strongs_hebrew_index.json');
console.log('All indices built successfully!');
