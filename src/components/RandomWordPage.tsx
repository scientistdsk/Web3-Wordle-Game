import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { validateWord } from '../utils/dictionary';
import { 
  Shuffle, 
  Play, 
  RotateCcw, 
  Share, 
  Timer,
  Target,
  BookOpen,
  Lightbulb,
  AlertCircle
} from 'lucide-react';

type GameMode = 'classic' | 'hard' | 'speed' | 'custom';
type WordLength = 4 | 5 | 6 | 7 | 8 | 9 | 10;
type LetterState = 'correct' | 'present' | 'absent' | 'empty';

interface GameState {
  guesses: string[];
  currentGuess: string;
  gameStatus: 'setup' | 'playing' | 'won' | 'lost';
  currentRow: number;
  secretWord: string;
  timeElapsed: number;
  hintsUsed: number;
}

const wordLists = {
  4: ['WORD', 'GAME', 'PLAY', 'QUIZ', 'TEST'],
  5: ['WORDLE', 'GAMES', 'HAPPY', 'SMART', 'QUICK'],
  6: ['PUZZLE', 'MASTER', 'CLEVER', 'BRIGHT', 'STRONG'],
  7: ['WORDLES', 'AMAZING', 'PERFECT', 'AWESOME', 'MILLION'],
  8: ['COMPUTER', 'KEYBOARD', 'PASSWORD', 'DOWNLOAD', 'INTERNET'],
  9: ['WONDERFUL', 'BEAUTIFUL', 'EXCELLENT', 'ADVENTURE', 'EDUCATION'],
  10: ['PLAYGROUND', 'BASKETBALL', 'WONDERLAND', 'HELICOPTER', 'DEMOCRATIC']
};

const gameModes = [
  {
    id: 'classic' as GameMode,
    name: 'Classic',
    description: '6 attempts to guess the word',
    icon: Target,
    maxGuesses: 6
  },
  {
    id: 'hard' as GameMode,
    name: 'Hard Mode',
    description: 'Must use revealed hints in subsequent guesses',
    icon: BookOpen,
    maxGuesses: 6
  },
  {
    id: 'speed' as GameMode,
    name: 'Speed Challenge',
    description: '5 minutes to solve as many as possible',
    icon: Timer,
    maxGuesses: 6
  },
  {
    id: 'custom' as GameMode,
    name: 'Custom',
    description: 'Choose your own word length and attempts',
    icon: Shuffle,
    maxGuesses: 6
  }
];

export function RandomWordPage() {
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic');
  const [wordLength, setWordLength] = useState<WordLength>(5);
  const [customAttempts, setCustomAttempts] = useState(6);
  const [gameState, setGameState] = useState<GameState>({
    guesses: [],
    currentGuess: '',
    gameStatus: 'setup',
    currentRow: 0,
    secretWord: '',
    timeElapsed: 0,
    hintsUsed: 0
  });
  const [showWordError, setShowWordError] = useState(false);
  const [wordErrorMessage, setWordErrorMessage] = useState('');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState.gameStatus === 'playing') {
      timer = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          timeElapsed: prev.timeElapsed + 1
        }));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState.gameStatus]);

  const startGame = () => {
    const words = wordLists[wordLength];
    const secretWord = words[Math.floor(Math.random() * words.length)];
    const maxGuesses = selectedMode === 'custom' ? customAttempts : 6;
    
    setGameState({
      guesses: Array(maxGuesses).fill(''),
      currentGuess: '',
      gameStatus: 'playing',
      currentRow: 0,
      secretWord,
      timeElapsed: 0,
      hintsUsed: 0
    });
  };

  const resetGame = () => {
    setGameState(prev => ({
      ...prev,
      guesses: Array(prev.guesses.length).fill(''),
      currentGuess: '',
      gameStatus: 'setup',
      currentRow: 0,
      secretWord: '',
      timeElapsed: 0,
      hintsUsed: 0
    }));
  };

  const getLetterState = (letter: string, position: number, word: string): LetterState => {
    if (!word) return 'empty';
    
    if (gameState.secretWord[position] === letter) {
      return 'correct';
    } else if (gameState.secretWord.includes(letter)) {
      return 'present';
    } else {
      return 'absent';
    }
  };

  const handleSubmitGuess = () => {
    if (gameState.currentGuess.length !== wordLength) return;

    // Validate the word
    const validation = validateWord(gameState.currentGuess);
    if (!validation.isValid) {
      setWordErrorMessage(validation.message || 'Invalid word');
      setShowWordError(true);
      setTimeout(() => setShowWordError(false), 3000);
      return;
    }

    const newGuesses = [...gameState.guesses];
    newGuesses[gameState.currentRow] = gameState.currentGuess;

    const isWin = gameState.currentGuess === gameState.secretWord;
    const isLoss = gameState.currentRow === gameState.guesses.length - 1 && !isWin;

    setGameState(prev => ({
      ...prev,
      guesses: newGuesses,
      currentGuess: '',
      gameStatus: isWin ? 'won' : isLoss ? 'lost' : 'playing',
      currentRow: prev.currentRow + 1
    }));
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
    } else if (key.match(/[A-Z]/) && gameState.currentGuess.length < wordLength) {
      setGameState(prev => ({
        ...prev,
        currentGuess: prev.currentGuess + key
      }));
    }
  };

  const getHint = () => {
    if (gameState.hintsUsed >= 2) return;
    
    const unrevealedPositions = [];
    for (let i = 0; i < gameState.secretWord.length; i++) {
      const isRevealed = gameState.guesses.some(guess => 
        guess && guess[i] === gameState.secretWord[i]
      );
      if (!isRevealed) {
        unrevealedPositions.push(i);
      }
    }
    
    if (unrevealedPositions.length > 0) {
      const randomPos = unrevealedPositions[Math.floor(Math.random() * unrevealedPositions.length)];
      const hintLetter = gameState.secretWord[randomPos];
      alert(`Hint: Position ${randomPos + 1} is "${hintLetter}"`);
      
      setGameState(prev => ({
        ...prev,
        hintsUsed: prev.hintsUsed + 1
      }));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (gameState.gameStatus === 'setup') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1>Play Random Word</h1>
          <p className="text-muted-foreground">Choose your game mode and start playing!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gameModes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = selectedMode === mode.id;
            
            return (
              <Card 
                key={mode.id}
                className={`cursor-pointer transition-colors ${
                  isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedMode(mode.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className={`h-6 w-6 mt-0.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <h3 className="font-medium">{mode.name}</h3>
                      <p className="text-sm text-muted-foreground">{mode.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Game Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="word-length">Word Length</Label>
              <Select 
                value={wordLength.toString()} 
                onValueChange={(value) => setWordLength(parseInt(value) as WordLength)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 Letters</SelectItem>
                  <SelectItem value="5">5 Letters (Classic)</SelectItem>
                  <SelectItem value="6">6 Letters</SelectItem>
                  <SelectItem value="7">7 Letters</SelectItem>
                  <SelectItem value="8">8 Letters</SelectItem>
                  <SelectItem value="9">9 Letters</SelectItem>
                  <SelectItem value="10">10 Letters</SelectItem>

                </SelectContent>
              </Select>
            </div>

            {selectedMode === 'custom' && (
              <div>
                <Label htmlFor="custom-attempts">Number of Attempts</Label>
                <Select 
                  value={customAttempts.toString()} 
                  onValueChange={(value) => setCustomAttempts(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Attempts (Hard)</SelectItem>
                    <SelectItem value="4">4 Attempts</SelectItem>
                    <SelectItem value="5">5 Attempts</SelectItem>
                    <SelectItem value="6">6 Attempts (Classic)</SelectItem>
                    <SelectItem value="8">8 Attempts (Easy)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Button onClick={startGame} className="w-full gap-2" size="lg">
          <Play className="h-5 w-5" />
          Start Game
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Game Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2">
            Random Word Challenge
            <Badge variant="outline">{selectedMode}</Badge>
          </h2>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Timer className="h-4 w-4" />
              {formatTime(gameState.timeElapsed)}
            </span>
            <span>Attempt {gameState.currentRow + 1} of {gameState.guesses.length}</span>
            <span>Hints: {2 - gameState.hintsUsed} left</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={getHint}
            disabled={gameState.hintsUsed >= 2}
          >
            <Lightbulb className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={resetGame}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Word Error Alert */}
      {showWordError && (
        <Alert className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{wordErrorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Game Grid */}
      <div className="flex justify-center">
        <div 
          className={`
            grid gap-1 sm:gap-2 w-full px-2
            ${wordLength <= 5 ? 'max-w-xs' : 
              wordLength <= 7 ? 'max-w-md' : 
              wordLength <= 9 ? 'max-w-lg' : 'max-w-xl'}
          `}
          style={{ 
            gridTemplateRows: `repeat(${gameState.guesses.length}, 1fr)`,
            gridTemplateColumns: `repeat(${wordLength}, 1fr)`
          }}
        >
          {gameState.guesses.map((guess, rowIndex) => (
            <React.Fragment key={rowIndex}>
              {Array.from({ length: wordLength }).map((_, colIndex) => {
                const letter = rowIndex === gameState.currentRow 
                  ? gameState.currentGuess[colIndex] || '' 
                  : guess[colIndex] || '';
                
                const letterState = rowIndex < gameState.currentRow
                  ? getLetterState(letter, colIndex, guess)
                  : 'empty';

                return (
                  <div
                    key={colIndex}
                    className={`
                      aspect-square border-2 flex items-center justify-center font-bold
                      ${wordLength <= 6 ? 'text-sm sm:text-lg' : 
                        wordLength <= 8 ? 'text-xs sm:text-base' : 'text-xs'}
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
      <div className="space-y-2">
        {[
          ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
          ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
          ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
        ].map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1">
            {row.map((key) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                className={`
                  ${key === 'ENTER' || key === 'BACKSPACE' ? 'px-3' : 'w-8 h-8 p-0'}
                  text-xs
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

      {/* Game Result */}
      {gameState.gameStatus !== 'playing' && (
        <Card>
          <CardContent className="p-6 text-center">
            {gameState.gameStatus === 'won' ? (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-green-600">Congratulations!</h3>
                <p>You solved it in {gameState.currentRow} attempts!</p>
                <p className="text-sm text-muted-foreground">Time: {formatTime(gameState.timeElapsed)}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-red-600">Game Over</h3>
                <p>The word was: <span className="font-bold">{gameState.secretWord}</span></p>
              </div>
            )}
            <div className="flex gap-2 justify-center mt-4">
              <Button onClick={startGame} variant="outline" className="gap-2">
                <Shuffle className="h-4 w-4" />
                New Word
              </Button>
              <Button onClick={resetGame} variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                New Game
              </Button>
              <Button className="gap-2">
                <Share className="h-4 w-4" />
                Share Result
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}