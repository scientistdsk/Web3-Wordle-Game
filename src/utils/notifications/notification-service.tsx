import React from 'react';
import { toast } from 'sonner';
import { ExternalLink, CheckCircle2, XCircle, Loader2, Trophy, Target, Sparkles, Info, AlertTriangle, PartyPopper } from 'lucide-react';
import { getTransactionUrl, getCurrentNetwork, truncateHash, formatNetworkName } from '../hashscan';
import { ConfettiEffects } from '../confetti';

export type NotificationType = 'success' | 'error' | 'info' | 'warning' | 'loading';
export type NotificationCategory = 'transaction' | 'game' | 'bounty' | 'system' | 'achievement';

interface NotificationOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  description?: string;
  icon?: React.ReactNode;
}

interface GameEventOptions {
  wordLength?: number;
  attempts?: number;
  prize?: number;
}

interface BountyEventOptions {
  bountyName?: string;
  prizeAmount?: number;
  participants?: number;
}

/**
 * Centralized Notification Service
 * Provides consistent notifications across the entire app
 */
export const NotificationService = {
  // ========== TRANSACTION NOTIFICATIONS ==========

  transaction: {
    pending: (message = 'Processing transaction...') => {
      return toast.loading(
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{message}</span>
        </div>,
        { duration: Infinity }
      );
    },

    success: (hash: string, message?: string) => {
      const network = getCurrentNetwork();
      const hashScanUrl = getTransactionUrl(hash, network);

      return toast.success(
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="font-semibold">{message || 'Transaction Confirmed'}</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {truncateHash(hash, 10, 8)}
            </code>
            <a
              href={hashScanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>,
        { duration: 10000 }
      );
    },

    error: (error: string, onRetry?: () => void) => {
      return toast.error(
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="font-semibold">Transaction Failed</span>
          </div>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>,
        {
          duration: 8000,
          action: onRetry ? { label: 'Retry', onClick: onRetry } : undefined,
        }
      );
    },
  },

  // ========== GAME EVENT NOTIFICATIONS ==========

  game: {
    win: (options: GameEventOptions = {}) => {
      const { wordLength = 5, attempts = 0, prize = 0 } = options;

      // Trigger confetti animation
      ConfettiEffects.win();

      return toast.success(
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="font-bold text-lg">🎉 You Won!</span>
          </div>
          <p className="text-sm">
            Solved the {wordLength}-letter word in {attempts} attempt{attempts !== 1 ? 's' : ''}!
          </p>
          {prize > 0 && (
            <p className="text-sm font-semibold text-green-600">
              Prize: {prize} HBAR 🏆
            </p>
          )}
        </div>,
        { duration: 8000 }
      );
    },

    loss: (solution: string, attempts: number) => {
      return toast.error(
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="font-semibold">Game Over</span>
          </div>
          <p className="text-sm">
            No more attempts left! The word was: <span className="font-bold">{solution.toUpperCase()}</span>
          </p>
        </div>,
        { duration: 6000 }
      );
    },

    correctGuess: (word: string, position: number) => {
      // Trigger confetti for correct word
      ConfettiEffects.correctWord();

      return toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>Correct! <span className="font-bold">{word.toUpperCase()}</span></span>
        </div>,
        { duration: 3000 }
      );
    },

    hint: (hint: string) => {
      return toast.info(
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-500" />
          <span>Hint: {hint}</span>
        </div>,
        { duration: 5000 }
      );
    },

    invalidWord: (word: string) => {
      return toast.error(
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4" />
          <span><span className="font-semibold">{word.toUpperCase()}</span> is not in the word list</span>
        </div>,
        { duration: 3000 }
      );
    },
  },

  // ========== BOUNTY EVENT NOTIFICATIONS ==========

  bounty: {
    created: (options: BountyEventOptions = {}) => {
      const { bountyName = 'Bounty', prizeAmount = 0 } = options;

      // Trigger confetti for bounty creation
      ConfettiEffects.bountyCreated();

      return toast.success(
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            <span className="font-semibold">Bounty Created!</span>
          </div>
          <p className="text-sm">{bountyName}</p>
          {prizeAmount > 0 && (
            <p className="text-sm font-medium">Prize: {prizeAmount} HBAR</p>
          )}
        </div>,
        { duration: 6000 }
      );
    },

    joined: (bountyName: string) => {
      return toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>Successfully joined <span className="font-semibold">{bountyName}</span>!</span>
        </div>,
        { duration: 4000 }
      );
    },

    completed: (bountyName: string, winner?: string) => {
      // Trigger bounty complete celebration
      ConfettiEffects.bountyComplete();

      return toast.success(
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-purple-500" />
            <span className="font-semibold">Bounty Completed!</span>
          </div>
          <p className="text-sm">{bountyName}</p>
          {winner && <p className="text-sm">Winner: {winner}</p>}
        </div>,
        { duration: 8000 }
      );
    },

    cancelled: (bountyName: string) => {
      return toast.info(
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          <span>Bounty <span className="font-semibold">{bountyName}</span> has been cancelled</span>
        </div>,
        { duration: 5000 }
      );
    },

    refund: (amount: number) => {
      return toast.success(
        <div className="flex items-col gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="font-semibold">Refund Processed</span>
          </div>
          <p className="text-sm">Received {amount} HBAR back to your wallet</p>
        </div>,
        { duration: 6000 }
      );
    },
  },

  // ========== SYSTEM NOTIFICATIONS ==========

  system: {
    success: (message: string, options?: NotificationOptions) => {
      return toast.success(message, {
        duration: options?.duration || 4000,
        action: options?.action,
        description: options?.description,
      });
    },

    error: (message: string, options?: NotificationOptions) => {
      return toast.error(message, {
        duration: options?.duration || 6000,
        action: options?.action,
        description: options?.description,
      });
    },

    info: (message: string, options?: NotificationOptions) => {
      return toast.info(message, {
        duration: options?.duration || 4000,
        description: options?.description,
      });
    },

    warning: (message: string, options?: NotificationOptions) => {
      return toast.warning(
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span>{message}</span>
        </div>,
        {
          duration: options?.duration || 5000,
          description: options?.description,
        }
      );
    },

    walletNotConnected: () => {
      return toast.error(
        <div className="flex flex-col gap-2">
          <span className="font-semibold">Wallet Not Connected</span>
          <span className="text-sm">Please connect your wallet to continue</span>
        </div>,
        { duration: 4000 }
      );
    },

    networkChange: (network: string) => {
      return toast.info(
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          <span>Switched to <span className="font-semibold">{formatNetworkName(network as any)}</span></span>
        </div>,
        { duration: 3000 }
      );
    },

    copied: (item = 'Item') => {
      return toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{item} copied to clipboard!</span>
        </div>,
        { duration: 2000 }
      );
    },
  },

  // ========== UTILITY METHODS ==========

  dismiss: (toastId: string | number) => {
    toast.dismiss(toastId);
  },

  dismissAll: () => {
    toast.dismiss();
  },

  loading: (message: string) => {
    return toast.loading(message, { duration: Infinity });
  },
};

// Export a simpler alias for backward compatibility
export const notify = NotificationService;
