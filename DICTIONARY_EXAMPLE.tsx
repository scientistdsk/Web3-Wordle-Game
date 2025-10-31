/**
 * EXAMPLE: How to optionally use enhanced dictionary features
 *
 * This file shows examples - you can copy/paste into your components
 * NO CHANGES ARE REQUIRED - these are optional enhancements
 */

import React, { useState } from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';

// ============================================================================
// EXAMPLE 1: Enhanced Word Validation (Optional Migration)
// ============================================================================

// BEFORE (Current - works perfectly):
import { validateWordInDictionary } from './utils/supabase/api';

async function validateWordOldWay(word: string) {
  return await validateWordInDictionary(word);
}

// AFTER (Optional - has API fallback):
import { validateWord } from './utils/dictionary';

async function validateWordNewWay(word: string) {
  return await validateWord(word);
  // Benefits:
  // - Still checks Supabase first (same speed)
  // - Falls back to API if word not in Supabase
  // - Broader word coverage
}


// ============================================================================
// EXAMPLE 2: Show Word Definition After Game (NEW FEATURE)
// ============================================================================

function GameEndWithDefinition() {
  const [definition, setDefinition] = useState<string>('');

  // Import the new feature
  import { getEnhancedWordData } from './utils/dictionary';

  async function showDefinition(word: string) {
    const details = await getEnhancedWordData(word);

    if (details && details.meanings.length > 0) {
      const def = details.meanings[0].definitions[0];
      setDefinition(def.definition);

      // Also available:
      console.log('Example:', def.example);
      console.log('Synonyms:', def.synonyms);
      console.log('Phonetic:', details.phonetic);
    }
  }

  return (
    <Card>
      <CardContent>
        <h3>The word was: HELLO</h3>
        {definition && (
          <p className="text-muted-foreground">
            Definition: {definition}
          </p>
        )}
      </CardContent>
    </Card>
  );
}


// ============================================================================
// EXAMPLE 3: Add Pronunciation Audio (NEW FEATURE)
// ============================================================================

function WordPronunciation({ word }: { word: string }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  import { getWordAudio } from './utils/dictionary';

  async function loadAudio() {
    const url = await getWordAudio(word);
    setAudioUrl(url);
  }

  async function playPronunciation() {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    } else {
      await loadAudio();
      // Try again after loading
      if (audioUrl) {
        new Audio(audioUrl).play();
      }
    }
  }

  return (
    <Button onClick={playPronunciation} variant="outline" size="sm">
      🔊 Hear Pronunciation
    </Button>
  );
}


// ============================================================================
// EXAMPLE 4: Hint System Using Synonyms (NEW FEATURE)
// ============================================================================

function HintButton({ targetWord }: { targetWord: string }) {
  const [hint, setHint] = useState<string>('');

  import { getHints } from './utils/dictionary';

  async function showHint() {
    const synonyms = await getHints(targetWord);

    if (synonyms.length > 0) {
      // Show a random synonym as hint
      const randomSynonym = synonyms[Math.floor(Math.random() * synonyms.length)];
      setHint(`Hint: Similar to "${randomSynonym}"`);
    } else {
      setHint('No hints available for this word');
    }
  }

  return (
    <div>
      <Button onClick={showHint} variant="ghost" size="sm">
        💡 Get Hint
      </Button>
      {hint && <p className="text-sm text-muted-foreground mt-2">{hint}</p>}
    </div>
  );
}


// ============================================================================
// EXAMPLE 5: Complete GameplayPage Enhancement (Optional)
// ============================================================================

/**
 * How to add word details to GameplayPage.tsx
 *
 * Add this to the existing GameplayPage component:
 */

function EnhancedGameplayPageExample() {
  const currentWord = 'HELLO'; // Your actual game word
  const [wordDetails, setWordDetails] = useState<any>(null);

  // Import the enhanced dictionary
  import { getEnhancedWordData, getWordAudio, getHints } from './utils/dictionary';

  // Call this after game ends
  async function loadWordDetails() {
    const details = await getEnhancedWordData(currentWord);
    setWordDetails(details);
  }

  return (
    <div className="space-y-4">
      {/* Your existing game board */}

      {/* NEW: Word details section (only shows after game) */}
      {wordDetails && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">About the word "{currentWord}"</h3>

            {/* Phonetic */}
            {wordDetails.phonetic && (
              <p className="text-sm text-muted-foreground mb-2">
                Pronunciation: {wordDetails.phonetic}
              </p>
            )}

            {/* Definition */}
            {wordDetails.meanings[0]?.definitions[0] && (
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Definition:</strong>{' '}
                  {wordDetails.meanings[0].definitions[0].definition}
                </p>

                {/* Example */}
                {wordDetails.meanings[0].definitions[0].example && (
                  <p className="text-sm italic text-muted-foreground">
                    Example: "{wordDetails.meanings[0].definitions[0].example}"
                  </p>
                )}

                {/* Synonyms */}
                {wordDetails.meanings[0].definitions[0].synonyms?.length > 0 && (
                  <p className="text-sm">
                    <strong>Synonyms:</strong>{' '}
                    {wordDetails.meanings[0].definitions[0].synonyms.slice(0, 3).join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* Audio pronunciation button */}
            <WordPronunciation word={currentWord} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}


// ============================================================================
// SUMMARY: What You Can Do
// ============================================================================

/**
 * OPTION 1: DO NOTHING ✅
 * - Your current code works perfectly
 * - No changes needed
 * - Supabase dictionary continues to work
 *
 * OPTION 2: ADD NEW FEATURES ✅
 * - Add word definitions after game ends
 * - Add pronunciation audio
 * - Add hint system
 * - Keep existing validation unchanged
 *
 * OPTION 3: MIGRATE VALIDATION (OPTIONAL) ✅
 * - Change: import { validateWordInDictionary } from '../utils/supabase/api'
 * - To: import { validateWord } from '../utils/dictionary'
 * - Benefits: API fallback, broader coverage
 * - Same performance (Supabase is still primary)
 *
 * All options are valid! Choose what works for your use case.
 */

export {
  validateWordOldWay,
  validateWordNewWay,
  GameEndWithDefinition,
  WordPronunciation,
  HintButton,
  EnhancedGameplayPageExample
};
