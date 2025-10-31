/**
 * Dictionary API Service - External API Integration
 * Provides fallback word validation and enhanced word data
 *
 * APIs Used:
 * - Dictionary API: https://dictionaryapi.dev/ (definitions, phonetics, synonyms)
 * - Random Words API: https://random-words-api.vercel.app (random words)
 */

import axios from 'axios';

export interface WordDefinition {
  word: string;
  phonetic?: string;
  phonetics: Array<{
    text?: string;
    audio?: string;
  }>;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
      synonyms?: string[];
      antonyms?: string[];
    }>;
  }>;
}

export interface RandomWordData {
  word: string;
  definition: string;
  pronunciation?: string;
}

/**
 * Validate word using external Dictionary API
 * This is used as a FALLBACK when Supabase dictionary doesn't have the word
 */
export async function validateWordWithAPI(word: string): Promise<boolean> {
  try {
    const response = await axios.get(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`,
      { timeout: 5000 } // 5 second timeout
    );

    // If we get a 200 response with data, the word is valid
    return response.status === 200 && Array.isArray(response.data) && response.data.length > 0;
  } catch (error) {
    // API returns 404 for words not found
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return false;
    }

    // For network errors or other issues, log but don't fail
    console.warn('Dictionary API validation failed:', error);
    return false; // Conservative: if API fails, consider word invalid
  }
}

/**
 * Get detailed word information from Dictionary API
 * Includes definitions, phonetics, synonyms, examples
 *
 * This can be used to enhance gameplay with hints, definitions, etc.
 */
export async function getWordDetails(word: string): Promise<WordDefinition | null> {
  try {
    const response = await axios.get<WordDefinition[]>(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`,
      { timeout: 5000 }
    );

    if (response.data && response.data.length > 0) {
      return response.data[0];
    }

    return null;
  } catch (error) {
    console.warn('Error fetching word details:', error);
    return null;
  }
}

/**
 * Get random words from Random Words API
 * This is used as a FALLBACK when Supabase dictionary is empty
 */
export async function getRandomWordsFromAPI(count: number = 1): Promise<RandomWordData[]> {
  try {
    // The API returns one random word per call
    const promises = Array(count).fill(null).map(() =>
      axios.get<RandomWordData[]>(
        'https://random-words-api.vercel.app/word',
        { timeout: 5000 }
      )
    );

    const responses = await Promise.all(promises);

    // Each response contains an array with one word
    const words: RandomWordData[] = [];
    responses.forEach(response => {
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        words.push(response.data[0]);
      }
    });

    return words;
  } catch (error) {
    console.warn('Error fetching random words from API:', error);
    return [];
  }
}

/**
 * Get pronunciation audio URL for a word
 * Returns the first available audio pronunciation
 */
export async function getWordPronunciation(word: string): Promise<string | null> {
  try {
    const details = await getWordDetails(word);
    if (!details) return null;

    // Find first available audio pronunciation
    for (const phonetic of details.phonetics) {
      if (phonetic.audio) {
        return phonetic.audio;
      }
    }

    return null;
  } catch (error) {
    console.warn('Error fetching word pronunciation:', error);
    return null;
  }
}

/**
 * Get synonyms for a word
 * Useful for hints or word suggestions
 */
export async function getWordSynonyms(word: string): Promise<string[]> {
  try {
    const details = await getWordDetails(word);
    if (!details) return [];

    const synonyms = new Set<string>();

    details.meanings.forEach(meaning => {
      meaning.definitions.forEach(def => {
        if (def.synonyms) {
          def.synonyms.forEach(syn => synonyms.add(syn));
        }
      });
    });

    return Array.from(synonyms);
  } catch (error) {
    console.warn('Error fetching word synonyms:', error);
    return [];
  }
}
