/**
 * Enhanced Dictionary Service
 * Hybrid approach: Supabase (primary) + External APIs (fallback)
 *
 * This service maintains backward compatibility with existing code
 * while adding fallback to external APIs when Supabase fails
 */

import {
  validateWordInDictionary as validateInSupabase,
  getRandomWords as getRandomWordsFromSupabase
} from '../supabase/api';
import {
  validateWordWithAPI,
  getRandomWordsFromAPI,
  getWordDetails,
  getWordPronunciation,
  getWordSynonyms,
  type WordDefinition
} from './dictionary-api';

/**
 * Enhanced word validation with fallback
 *
 * Strategy:
 * 1. Check Supabase dictionary (fast, reliable, existing implementation)
 * 2. If Supabase says invalid, check external API as fallback
 * 3. Return true if either source validates the word
 *
 * This ensures we don't break existing functionality while expanding coverage
 */
export async function validateWord(word: string): Promise<boolean> {
  try {
    // Step 1: Check Supabase (primary source)
    const isValidInSupabase = await validateInSupabase(word);

    if (isValidInSupabase) {
      console.log(`✅ Word "${word}" validated via Supabase`);
      return true;
    }

    // Step 2: Fallback to external API
    console.log(`🔄 Word "${word}" not in Supabase, checking external API...`);
    const isValidInAPI = await validateWordWithAPI(word);

    if (isValidInAPI) {
      console.log(`✅ Word "${word}" validated via external API`);
      return true;
    }

    console.log(`❌ Word "${word}" is invalid in both sources`);
    return false;
  } catch (error) {
    console.error('Error in enhanced word validation:', error);

    // If all fails, fall back to Supabase result only
    return await validateInSupabase(word);
  }
}

/**
 * Enhanced random words generation with fallback
 *
 * Strategy:
 * 1. Try Supabase first (existing implementation)
 * 2. If Supabase returns empty, try external API
 * 3. Return whichever source provides words
 */
export async function getRandomWords(count: number = 1, wordLength?: number): Promise<string[]> {
  try {
    // Step 1: Try Supabase (primary source)
    const supabaseWords = await getRandomWordsFromSupabase(count, wordLength);

    if (supabaseWords && supabaseWords.length > 0) {
      console.log(`✅ Got ${supabaseWords.length} random words from Supabase`);
      return supabaseWords;
    }

    // Step 2: Fallback to external API (no word length filter available)
    console.log(`🔄 Supabase returned no words, trying external API...`);
    const apiWords = await getRandomWordsFromAPI(count);

    if (apiWords && apiWords.length > 0) {
      // Filter by word length if specified
      let words = apiWords.map(w => w.word.toUpperCase());

      if (wordLength) {
        words = words.filter(w => w.length === wordLength);
      }

      console.log(`✅ Got ${words.length} random words from external API`);
      return words;
    }

    console.warn('⚠️ Both sources returned no random words');
    return [];
  } catch (error) {
    console.error('Error in enhanced random words generation:', error);

    // If all fails, fall back to Supabase only
    return await getRandomWordsFromSupabase(count, wordLength);
  }
}

/**
 * Get word details with definitions, phonetics, etc.
 * This is a NEW feature that wasn't in the original implementation
 *
 * Can be used for:
 * - Showing word definitions after game ends
 * - Providing hints
 * - Educational content
 */
export async function getEnhancedWordData(word: string): Promise<WordDefinition | null> {
  return await getWordDetails(word);
}

/**
 * Get pronunciation audio for a word
 * NEW feature for enhanced gameplay
 */
export async function getWordAudio(word: string): Promise<string | null> {
  return await getWordPronunciation(word);
}

/**
 * Get synonyms for a word
 * NEW feature - can be used for hints
 */
export async function getHints(word: string): Promise<string[]> {
  return await getWordSynonyms(word);
}

// Re-export everything for convenience
export * from './dictionary-api';
export { validateWordInDictionary, incrementWordUsage, getPopularWords } from '../supabase/api';
