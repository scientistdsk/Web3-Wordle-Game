import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { validateWord } from '../utils/dictionary';
import { useBounty, useSubmitAttempt } from '../utils/supabase/hooks';
import { validateWordInDictionary, incrementWordUsage } from '../utils/supabase/api';
import { useWallet } from './WalletContext';
import {
  Info,
  Trophy,
  Timer,
  Users,
  Target,
  RotateCcw,
  Share,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
import { BountyCompletionModal } from './BountyCompletionModal';
import { NotificationService } from '../utils/notifications/notification-service';

type LetterState = 'correct' | 'present' | 'absent' | 'empty';

interface GameState {
  guesses: string[];
  currentGuess: string;
  gameStatus: 'playing' | 'won' | 'lost';
  currentRow: number;
  currentWordIndex: number; // For multistage bounties
  wordsCompleted: number;
}

// Support for words up to 10 characters
const MAX_WORD_LENGTH = 10;
const MAX_GUESSES = 6;

interface GameplayPageProps {
  bountyId?: string | null;
  onBackToBountyHunt?: () => void;
}

export function GameplayPage({ bountyId, onBackToBountyHunt }: GameplayPageProps) {
  const { walletAddress, isConnected } = useWallet();
  const { data: bountyData, loading: bountyLoading, error: bountyError } = useBounty(bountyId || '', walletAddress || undefined);
  const { submitAttempt, loading: isSubmitting } = useSubmitAttempt();

  // Initialize word index based on participation data or start at 0
  const initialWordIndex = bountyData?.participation?.current_word_index || 0;
  const currentWord = bountyData?.words?.[initialWordIndex] || 'PUZZLE';
  const WORD_LENGTH = currentWord.length;

  // Calculate max attempts based on bounty type
  const maxAttemptsFromBounty = bountyData?.max_attempts_per_user;
  const maxGuesses = maxAttemptsFromBounty || MAX_GUESSES;

  // Check if time-based bounty and if time has run out
  const isTimeBased = bountyData?.bounty_type === 'Time-based';
  const timeLimit = bountyData?.time_limit_seconds || 0;
  const [hasTimeExpired, setHasTimeExpired] = useState(false);

  const [gameState, setGameState] = useState<GameState>({
    guesses: Array(MAX_GUESSES).fill(''),
    currentGuess: '',
    gameStatus: 'playing',
    currentRow: 0,
    currentWordIndex: initialWordIndex,
    wordsCompleted: bountyData?.participation?.words_completed || 0
  });

  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showWordError, setShowWordError] = useState(false);
  const [wordErrorMessage, setWordErrorMessage] = useState('');
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isWinner, setIsWinner] = useState(false);

  // Ref for the active row to scroll into view on mobile
  const activeRowRef = useRef<HTMLDivElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Scroll active row into view when it changes (for mobile keyboard)
  useEffect(() => {
    if (activeRowRef.current && gameState.gameStatus === 'playing') {
      // Use a timeout to ensure the row is rendered before scrolling
      setTimeout(() => {
        activeRowRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
    }
  }, [gameState.currentRow, gameState.currentGuess]);

  // Timer for elapsed time and time-based bounties
  useEffect(() => {
    const timer = setInterval(() => {
      if (gameState.gameStatus === 'playing') {
        setTimeElapsed(prev => prev + 1);

        // Check if time limit exceeded for time-based bounties
        if (isTimeBased && timeLimit > 0 && timeElapsed >= timeLimit) {
          setHasTimeExpired(true);
          setGameState(prev => ({ ...prev, gameStatus: 'lost' }));
          setShowCompletionModal(true);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.gameStatus, timeElapsed, isTimeBased, timeLimit]);

  const getLetterState = (letter: string, position: number, word: string): LetterState => {
    if (!word) return 'empty';

    // Two-pass algorithm to handle duplicate letters correctly
    const targetLetters = currentWord.split('');
    const guessLetters = word.split('');
    const results: (LetterState | null)[] = Array(word.length).fill(null);

    // First pass: mark correct positions
    for (let i = 0; i < guessLetters.length; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        results[i] = 'correct';
        targetLetters[i] = ''; // Mark as used
      }
    }

    // Second pass: mark present/absent
    for (let i = 0; i < guessLetters.length; i++) {
      if (results[i]) continue; // Already marked as correct

      const letterIndex = targetLetters.indexOf(guessLetters[i]);
      if (letterIndex !== -1) {
        results[i] = 'present';
        targetLetters[letterIndex] = ''; // Mark as used
      } else {
        results[i] = 'absent';
      }
    }

    return results[position] || 'empty';
  };

  const handleSubmitGuess = async () => {
    if (gameState.currentGuess.length !== WORD_LENGTH) return;
    if (!bountyId || !walletAddress) return;

    // Check if the guess is the target word (always valid)
    const guessUpperCase = gameState.currentGuess.toUpperCase();
    const isTargetWord = guessUpperCase === currentWord.toUpperCase();

    // Validate the word (allow target word even if not in dictionary)
    if (!isTargetWord) {
      // First do basic validation (letters only, etc.)
      const basicValidation = validateWord(gameState.currentGuess);
      if (!basicValidation.isValid && basicValidation.message !== 'Not a valid English word') {
        setWordErrorMessage(basicValidation.message || 'Invalid word');
        setShowWordError(true);
        setTimeout(() => setShowWordError(false), 3000);
        return;
      }

      // Then check against Supabase dictionary
      const isValidWord = await validateWordInDictionary(gameState.currentGuess);
      if (!isValidWord) {
        setWordErrorMessage('Not a valid English word');
        setShowWordError(true);
        setTimeout(() => setShowWordError(false), 3000);
        NotificationService.game.invalidWord(gameState.currentGuess);
        return;
      }

      // Increment word usage for analytics
      await incrementWordUsage(gameState.currentGuess);
    }

    try {
      // Submit attempt to database
      console.log('📝 Submitting attempt to database:', {
        bountyId,
        walletAddress,
        wordIndex: gameState.currentWordIndex,
        guess: gameState.currentGuess,
        timeElapsed
      });
      const result = await submitAttempt(
        bountyId,
        walletAddress,
        gameState.currentWordIndex,
        gameState.currentGuess,
        timeElapsed
      );
      console.log('✅ Attempt submitted successfully:', result);

      const newGuesses = [...gameState.guesses];
      newGuesses[gameState.currentRow] = gameState.currentGuess;

      const isWin = result.correct;
      const isLoss = gameState.currentRow === maxGuesses - 1 && !isWin;

      // Check if this is a multistage bounty and if we need to move to next word
      const isMultistage = bountyData?.bounty_type === 'Multistage';
      const hasMoreWords = gameState.currentWordIndex < (bountyData?.words?.length || 1) - 1;

      if (isWin && isMultistage && hasMoreWords) {
        // Word solved, move to next word in multistage bounty
        NotificationService.game.correctGuess(
          gameState.currentGuess,
          gameState.currentWordIndex + 1
        );
        setGameState({
          guesses: Array(MAX_GUESSES).fill(''),
          currentGuess: '',
          gameStatus: 'playing',
          currentRow: 0,
          currentWordIndex: gameState.currentWordIndex + 1,
          wordsCompleted: gameState.wordsCompleted + 1
        });
        setTimeElapsed(0); // Reset timer for next word
      } else {
        setGameState({
          guesses: newGuesses,
          currentGuess: '',
          gameStatus: isWin ? 'won' : isLoss ? 'lost' : 'playing',
          currentRow: gameState.currentRow + 1,
          currentWordIndex: gameState.currentWordIndex,
          wordsCompleted: isWin ? gameState.wordsCompleted + 1 : gameState.wordsCompleted
        });
      }

      if (result.completed_bounty) {
        // Player completed the bounty! Show success modal
        // Note: Admin will manually complete bounty and distribute prize
        const prizeAmount = parseFloat(bountyData?.prize_amount || '0');
        NotificationService.game.win({
          wordLength: currentWord.length,
          attempts: gameState.currentRow + 1,
          prize: prizeAmount
        });
        setIsWinner(true);
        setShowCompletionModal(true);
      } else if (isLoss) {
        // Game over but bounty not completed
        NotificationService.game.loss(currentWord, gameState.currentRow + 1);
        setIsWinner(false);
        setShowCompletionModal(true);
      }
    } catch (error) {
      console.error('Failed to submit attempt:', error);
      setWordErrorMessage('Failed to submit attempt. Please try again.');
      setShowWordError(true);
      setTimeout(() => setShowWordError(false), 3000);
    }
  };

  const handleKeyPress = (key: string) => {
    if (gameState.gameStatus !== 'playing') return;

    if (key === 'ENTER') {
      handleSubmitGuess();
    } else if (key === 'BACKSPACE') {
      setGameState(prev => ({
        ...prev,
        currentGuess: prev.currentGuess.slice(0, -1)
      }));
    } else if (key.match(/[A-Z]/) && gameState.currentGuess.length < WORD_LENGTH) {
      setGameState(prev => ({
        ...prev,
        currentGuess: prev.currentGuess + key
      }));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const resetGame = () => {
    setGameState({
      guesses: Array(MAX_GUESSES).fill(''),
      currentGuess: '',
      gameStatus: 'playing',
      currentRow: 0
    });
    setTimeElapsed(0);
  };

  // Show loading state if bounty data is loading
  if (bountyLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading bounty data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if bounty data failed to load
  if (bountyError || !bountyData) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Bounty</h3>
            <p className="text-muted-foreground mb-4">
              {typeof bountyError === 'string'
                ? bountyError
                : bountyError?.message || 'Bounty not found or you do not have access to it.'}
            </p>
            <Button onClick={onBackToBountyHunt} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bounty Hunt
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate time left
  const timeLeft = bountyData.end_time ? new Date(bountyData.end_time).getTime() - Date.now() : 0;
  const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
  const timeLeftDisplay = hoursLeft > 0 ? `${hoursLeft}h left` : 'Expired';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <Button onClick={onBackToBountyHunt} variant="outline" size="sm">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Bounty Hunt
      </Button>

      {/* Bounty Info Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{bountyData.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{bountyData.bounty_type}</Badge>
                <span className="text-sm text-muted-foreground">
                  by {bountyData.creator?.display_name || bountyData.creator?.username || 'Unknown'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-lg">
                {bountyData.prize_amount} {bountyData.prize_currency || 'HBAR'}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {bountyData.participant_count} hunters
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Board */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Timer className="h-4 w-4" />
                <span className="text-sm">{formatTime(timeElapsed)}</span>
                {isTimeBased && timeLimit > 0 && (
                  <span className={`text-xs ml-1 ${timeElapsed > timeLimit * 0.8 ? 'text-red-500' : 'text-muted-foreground'}`}>
                    / {formatTime(timeLimit)}
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Attempt {gameState.currentRow + 1} of {maxGuesses}
              </div>
              {bountyData?.bounty_type === 'Multistage' && (
                <div className="text-sm font-medium">
                  Word {gameState.currentWordIndex + 1} of {bountyData?.words?.length || 1}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Info className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Game Info & Hints</DialogTitle>
                    <DialogDescription>
                      View bounty details and get hints to help solve the puzzle
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Bounty Details</h4>
                      <p className="text-sm text-muted-foreground">
                        Creator: {bountyData.creator?.display_name || bountyData.creator?.username || 'Unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Prize: {bountyData.prize_amount} {bountyData.prize_currency || 'HBAR'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Time left: {timeLeftDisplay}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Words to solve: {bountyData.words_count}
                      </p>
                    </div>
                    {bountyData.hints && bountyData.hints.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Hints</h4>
                        {bountyData.hints.map((hint: string, index: number) => (
                          <p key={index} className="text-sm mb-1">{hint}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Trophy className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Leaderboard</DialogTitle>
                    <DialogDescription>
                      Current rankings for this bounty challenge
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground text-center">
                      Live leaderboard will appear here once you start playing
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Word Error Alert */}
          {showWordError && (
            <Alert className="max-w-md mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{wordErrorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Wordle Grid */}
          <div className="flex justify-center overflow-y-auto" ref={gameContainerRef}>
            <div
              className={`
                grid grid-rows-6 gap-1 sm:gap-2 w-full px-2 pb-4
                ${WORD_LENGTH <= 5 ? 'max-w-xs' :
                  WORD_LENGTH <= 7 ? 'max-w-md' :
                  WORD_LENGTH <= 9 ? 'max-w-lg' : 'max-w-xl'}
              `}
              style={{
                gridTemplateColumns: `repeat(${WORD_LENGTH}, 1fr)`
              }}
            >
              {gameState.guesses.map((guess, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  {Array.from({ length: WORD_LENGTH }).map((_, colIndex) => {
                    const letter = rowIndex === gameState.currentRow 
                      ? gameState.currentGuess[colIndex] || '' 
                      : guess[colIndex] || '';
                    
                    const letterState = rowIndex < gameState.currentRow
                      ? getLetterState(letter, colIndex, guess)
                      : 'empty';

                    return (
                      <div
                        key={colIndex}
                        ref={rowIndex === gameState.currentRow && colIndex === 0 ? activeRowRef : null}
                        className={`
                          aspect-square border-2 flex items-center justify-center font-bold
                          ${WORD_LENGTH <= 6 ? 'text-sm sm:text-lg' :
                            WORD_LENGTH <= 8 ? 'text-xs sm:text-base' : 'text-xs'}
                          ${letterState === 'correct' ? 'bg-green-500 text-white border-green-500' :
                            letterState === 'present' ? 'bg-yellow-500 text-white border-yellow-500' :
                            letterState === 'absent' ? 'bg-gray-500 text-white border-gray-500' :
                            letter ? 'border-gray-400' : 'border-gray-300'
                          }
                        `}
                      >
                        {letter}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Virtual Keyboard */}
          <div className="space-y-1.5 sm:space-y-2 pb-4 sm:pb-0">
            {[
              ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
              ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
              ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
            ].map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-1 sm:gap-1.5">
                {row.map((key) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    className={`
                      ${key === 'ENTER' || key === 'BACKSPACE'
                        ? 'min-w-[60px] h-11 px-2 sm:px-3 text-[10px] sm:text-xs'
                        : 'min-w-[32px] min-h-[44px] w-8 sm:w-10 h-11 p-0 text-xs sm:text-sm'}
                      font-semibold touch-manipulation
                    `}
                    onClick={() => handleKeyPress(key)}
                    disabled={gameState.gameStatus !== 'playing'}
                  >
                    {key === 'BACKSPACE' ? '⌫' : key}
                  </Button>
                ))}
              </div>
            ))}
          </div>

          {/* Game Status */}
          {gameState.gameStatus !== 'playing' && (
            <Card>
              <CardContent className="p-4 text-center">
                {gameState.gameStatus === 'won' ? (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-green-600">Congratulations!</h3>
                    <p>You solved it in {gameState.currentRow} attempts!</p>
                    <p className="text-sm text-muted-foreground">Time: {formatTime(timeElapsed)}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-red-600">Game Over</h3>
                    <p>The word was: <span className="font-bold">{currentWord}</span></p>
                  </div>
                )}
                <div className="flex gap-2 justify-center mt-4">
                  <Button onClick={resetGame} variant="outline" className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Try Again
                  </Button>
                  <Button onClick={() => setShowCompletionModal(true)} className="gap-2">
                    <Share className="h-4 w-4" />
                    View Results
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Time Elapsed</span>
                <span className="text-sm font-medium">{formatTime(timeElapsed)}</span>
              </div>
              {isTimeBased && timeLimit > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm">Time Remaining</span>
                  <span className={`text-sm font-medium ${timeElapsed > timeLimit * 0.8 ? 'text-red-500' : ''}`}>
                    {formatTime(Math.max(0, timeLimit - timeElapsed))}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm">Attempts</span>
                <span className="text-sm font-medium">{gameState.currentRow} / {maxGuesses}</span>
              </div>
              {maxAttemptsFromBounty && (
                <div className="flex justify-between">
                  <span className="text-sm">Remaining Attempts</span>
                  <span className={`text-sm font-medium ${(maxGuesses - gameState.currentRow) <= 2 ? 'text-orange-500' : ''}`}>
                    {maxGuesses - gameState.currentRow}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm">Letters Used</span>
                <span className="text-sm font-medium">
                  {new Set(gameState.guesses.filter(g => g).join('')).size}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Bounty Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Time Left</span>
                  <span className="text-muted-foreground">{timeLeftDisplay}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Your Position</span>
                  <span className="text-muted-foreground">
                    {bountyData.participation?.status || 'Not joined'}
                  </span>
                </div>
                {bountyData.participation && (
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="text-muted-foreground">
                      {gameState.wordsCompleted}/{bountyData.words_count} words
                    </span>
                  </div>
                )}
                {bountyData?.bounty_type === 'Multistage' && (
                  <div className="flex justify-between text-sm">
                    <span>Current Word</span>
                    <span className="font-medium">
                      {gameState.currentWordIndex + 1} of {bountyData?.words?.length || 1}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bounty Completion Modal */}
      {showCompletionModal && bountyData && (
        <BountyCompletionModal
          open={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          onBackToBountyHunt={() => {
            setShowCompletionModal(false);
            onBackToBountyHunt?.();
          }}
          bountyData={{
            id: bountyId || undefined,
            name: bountyData.name,
            prize_amount: bountyData.prize_amount,
            prize_currency: bountyData.prize_currency || 'HBAR',
            bounty_type: bountyData.bounty_type
          }}
          gameStats={{
            attempts: gameState.currentRow,
            timeElapsed,
            wordsCompleted: gameState.wordsCompleted,
            totalWords: bountyData.words_count || 1
          }}
          isWinner={isWinner}
        />
      )}
    </div>
  );
}