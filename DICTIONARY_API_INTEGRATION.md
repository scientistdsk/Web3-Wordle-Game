# Dictionary API Integration Guide

## 📚 Overview

This project now has an **enhanced dictionary system** that combines:
1. **Supabase Database** (Primary, fast, existing)
2. **External APIs** (Fallback, extended coverage)

### APIs Integrated from wordWall Project:
- **Dictionary API**: `https://api.dictionaryapi.dev` - Free, open-source dictionary
- **Random Words API**: `https://random-words-api.vercel.app` - Random word generator

## 🎯 Key Features

### 1. **Non-Breaking Integration**
- ✅ All existing code continues to work
- ✅ Supabase remains the primary source
- ✅ API is used only as fallback
- ✅ Zero migration required (but optional enhancement available)

### 2. **Hybrid Validation**
```typescript
// Strategy:
1. Check Supabase first (fast, reliable)
2. If word not found in Supabase → Check API
3. Return true if either source validates
```

### 3. **New Features** (Not in Original)
- 📖 **Word Definitions** - Get meanings, examples
- 🔊 **Pronunciation Audio** - Audio URLs for words
- 🔄 **Synonyms** - Get word synonyms for hints
- 📝 **Phonetics** - Pronunciation text

---

## 🚀 Usage

### Option 1: Keep Using Existing Code (No Changes)
Your current code works as-is:
```typescript
import { validateWordInDictionary } from '../utils/supabase/api';

// Still works exactly the same
const isValid = await validateWordInDictionary('HELLO');
```

### Option 2: Upgrade to Enhanced Validation (Optional)
For better word coverage with API fallback:

```typescript
// Before (Supabase only)
import { validateWordInDictionary } from '../utils/supabase/api';
const isValid = await validateWordInDictionary('HELLO');

// After (Supabase + API fallback)
import { validateWord } from '../utils/dictionary';
const isValid = await validateWord('HELLO');
```

**Benefits of upgrading:**
- ✅ Broader word coverage
- ✅ Automatic fallback when Supabase is empty
- ✅ Same performance (Supabase is still checked first)

---

## 📖 New Features Usage

### 1. Get Word Details (Definitions, Examples)
```typescript
import { getEnhancedWordData } from '../utils/dictionary';

const details = await getEnhancedWordData('HELLO');
if (details) {
  console.log(details.phonetic); // /həˈloʊ/
  console.log(details.meanings[0].definitions[0].definition);
  // "Used as a greeting..."
}
```

**Use cases:**
- Show word definition after game ends
- Educational content
- Enhanced feedback

### 2. Get Pronunciation Audio
```typescript
import { getWordAudio } from '../utils/dictionary';

const audioUrl = await getWordAudio('HELLO');
if (audioUrl) {
  // Play audio: https://api.dictionaryapi.dev/media/...
  new Audio(audioUrl).play();
}
```

**Use cases:**
- Audio pronunciation for accessibility
- Language learning mode
- Enhanced user experience

### 3. Get Synonyms (for Hints)
```typescript
import { getHints } from '../utils/dictionary';

const synonyms = await getHints('HAPPY');
// Returns: ['cheerful', 'joyful', 'pleased', ...]
```

**Use cases:**
- Provide hints in difficult bounties
- Educational mode
- Synonym-based puzzles

### 4. Enhanced Random Words
```typescript
import { getRandomWords } from '../utils/dictionary';

// Uses Supabase first, API fallback
const words = await getRandomWords(5, 5); // 5 words, 5 letters each
```

---

## 🔧 Migration Guide (Optional)

### Current Files Using Dictionary:

1. **GameplayPage.tsx** (Line 167)
```typescript
// Current:
import { validateWordInDictionary } from '../utils/supabase/api';
const isValidWord = await validateWordInDictionary(gameState.currentGuess);

// Enhanced (optional):
import { validateWord } from '../utils/dictionary';
const isValidWord = await validateWord(gameState.currentGuess);
```

2. **CreateBountyPage.tsx** (Line 145)
```typescript
// Current:
import { validateWordInDictionary, getRandomWords } from '../utils/supabase/api';

// Enhanced (optional):
import { validateWord, getRandomWords } from '../utils/dictionary';
// Now has API fallback!
```

### Why Migrate?
- ✅ **Broader dictionary**: API has 170,000+ words
- ✅ **Better coverage**: Supabase + API combined
- ✅ **Same performance**: Supabase is still primary
- ✅ **Graceful fallback**: Works even if Supabase is down

### Why NOT Migrate?
- ✅ **Works fine now**: Current code is stable
- ✅ **No bugs**: If it ain't broke, don't fix it
- ✅ **Controlled vocabulary**: Supabase-only = curated list

**Decision: Your choice! Both approaches work.**

---

## 🎮 Example: Enhanced Gameplay Features

### Add Word Definition After Game
```typescript
// In GameplayPage.tsx, after game ends:
import { getEnhancedWordData } from '../utils/dictionary';

const handleGameEnd = async () => {
  const details = await getEnhancedWordData(currentWord);

  if (details) {
    // Show definition, pronunciation, examples
    setWordDefinition(details.meanings[0].definitions[0].definition);
    setWordExample(details.meanings[0].definitions[0].example);
  }
};
```

### Add Hint System
```typescript
// In GameplayPage.tsx, add hint button:
import { getHints } from '../utils/dictionary';

const showHint = async () => {
  const synonyms = await getHints(currentWord);
  if (synonyms.length > 0) {
    toast.info(`Hint: Synonym of "${synonyms[0]}"`);
  }
};
```

---

## 📊 API Details

### Dictionary API (dictionaryapi.dev)
- **Rate Limit**: 450 requests/5 minutes (free tier)
- **Response Time**: ~200-500ms
- **Coverage**: 170,000+ English words
- **Data**: Definitions, phonetics, synonyms, antonyms, examples, audio

### Random Words API (random-words-api.vercel.app)
- **Rate Limit**: Unlimited (Vercel serverless)
- **Response Time**: ~100-300ms
- **Coverage**: Curated word list
- **Data**: Word, definition, pronunciation

---

## 🔒 Error Handling

The enhanced system handles errors gracefully:

```typescript
// If API fails → Falls back to Supabase
// If Supabase fails → Falls back to API
// If both fail → Returns false (invalid word)

// Logs for debugging:
✅ Word "HELLO" validated via Supabase
🔄 Word "OBSCURE" not in Supabase, checking external API...
✅ Word "OBSCURE" validated via external API
❌ Word "XYZABC" is invalid in both sources
```

---

## 🧪 Testing

### Test Enhanced Validation
```typescript
import { validateWord } from '../utils/dictionary';

// Test common word (should be in Supabase)
console.log(await validateWord('HELLO')); // true, from Supabase

// Test uncommon word (may need API fallback)
console.log(await validateWord('ZEPHYR')); // true, from API if not in Supabase

// Test invalid word
console.log(await validateWord('XYZABC')); // false
```

### Test Word Details
```typescript
import { getEnhancedWordData, getWordAudio, getHints } from '../utils/dictionary';

const word = 'HAPPY';
const details = await getEnhancedWordData(word);
const audio = await getWordAudio(word);
const hints = await getHints(word);

console.log('Definition:', details?.meanings[0].definitions[0].definition);
console.log('Audio:', audio);
console.log('Synonyms:', hints);
```

---

## 🎯 Recommendations

### For Development (Now):
✅ **Keep existing code** - It works perfectly
✅ **Use new features** - Add definitions, audio, hints as enhancements
✅ **Test fallback** - Verify API works when Supabase doesn't have a word

### For Future (Optional):
✅ **Gradual migration** - Migrate one component at a time
✅ **Monitor logs** - See when API fallback is triggered
✅ **Optimize** - Cache frequently used words to reduce API calls

---

## 📝 Summary

**What Changed:**
- ✅ Added external API fallback for word validation
- ✅ Added new features (definitions, audio, synonyms)
- ✅ **Nothing broke** - existing code works as-is

**What to Do:**
1. **Nothing required** - Current code works fine
2. **Optional**: Use new features for enhanced gameplay
3. **Optional**: Migrate to hybrid validation for better coverage

**Files Created:**
- `src/utils/dictionary/dictionary-api.ts` - API integration
- `src/utils/dictionary/index.ts` - Enhanced service with fallback
- `DICTIONARY_API_INTEGRATION.md` - This guide

**Dependencies Added:**
- `axios@1.13.1` - For API calls (same as wordWall used)

---

## 🤝 Credits

Dictionary functionality borrowed from **wordWall** project:
- Dictionary API integration
- Random words API integration
- Axios-based HTTP client pattern

Enhanced and adapted for Web3-Wordle-Game with:
- Supabase-first hybrid approach
- Non-breaking backward compatibility
- TypeScript types and error handling
