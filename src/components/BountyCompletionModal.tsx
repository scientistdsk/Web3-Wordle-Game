import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { PrizeClaimModal } from './PrizeClaimModal';
import { Trophy, Share, ArrowLeft, Copy, Gift } from 'lucide-react';

interface BountyCompletionModalProps {
  open: boolean;
  onClose: () => void;
  onBackToBountyHunt: () => void;
  bountyData: {
    id?: string;
    name: string;
    prize_amount: number;
    prize_currency: string;
    bounty_type: string;
  };
  gameStats: {
    attempts: number;
    timeElapsed: number;
    wordsCompleted: number;
    totalWords: number;
  };
  isWinner: boolean;
}

export function BountyCompletionModal({
  open,
  onClose,
  onBackToBountyHunt,
  bountyData,
  gameStats,
  isWinner
}: BountyCompletionModalProps) {
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleShareResult = () => {
    const shareText = `🎯 Just ${isWinner ? 'completed' : 'played'} "${bountyData.name}" bounty!\n` +
      `📊 ${gameStats.attempts} attempts in ${formatTime(gameStats.timeElapsed)}\n` +
      `💰 Prize: ${bountyData.prize_amount} ${bountyData.prize_currency}\n` +
      `🎮 Play at Web3 Wordle Bounty Game!`;

    if (navigator.share) {
      navigator.share({ text: shareText });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Result copied to clipboard!');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {isWinner ? (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <Trophy className="h-6 w-6" />
                Bounty Completed! 🎉
              </div>
            ) : (
              <div className="text-orange-600">
                Bounty Attempted
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bounty Info */}
          <Card>
            <CardContent className="p-4">
              <div className="text-center space-y-2">
                <h3 className="font-semibold">{bountyData.name}</h3>
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="outline">{bountyData.bounty_type}</Badge>
                  <span className="text-lg font-bold">
                    {bountyData.prize_amount} {bountyData.prize_currency}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Game Stats */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="font-medium text-center">Your Performance</h4>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-lg">{gameStats.attempts}</div>
                  <div className="text-muted-foreground">Attempts</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-lg">{formatTime(gameStats.timeElapsed)}</div>
                  <div className="text-muted-foreground">Time</div>
                </div>
              </div>

              <div className="text-center">
                <div className="font-semibold text-lg">
                  {gameStats.wordsCompleted}/{gameStats.totalWords}
                </div>
                <div className="text-muted-foreground">Words Completed</div>
              </div>

              {isWinner && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-green-800 font-medium">
                    🏆 Congratulations! You've won this bounty!
                  </p>
                  {bountyData.prize_amount > 0 ? (
                    <p className="text-green-600 text-sm mt-1">
                      Click "Claim Prize" to receive your {bountyData.prize_amount} {bountyData.prize_currency}
                    </p>
                  ) : (
                    <p className="text-green-600 text-sm mt-1">
                      Well done on completing this challenge!
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleShareResult} variant="outline" className="flex-1 gap-2">
              <Share className="h-4 w-4" />
              Share
            </Button>
            {isWinner && bountyData.prize_amount > 0 && bountyData.id && (
              <Button
                onClick={() => setShowPrizeModal(true)}
                className="flex-1 gap-2 bg-yellow-600 hover:bg-yellow-700"
              >
                <Gift className="h-4 w-4" />
                Claim Prize
              </Button>
            )}
            <Button onClick={onBackToBountyHunt} className="flex-1 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Hunt
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Prize Claim Modal */}
      {showPrizeModal && bountyData.id && (
        <PrizeClaimModal
          open={showPrizeModal}
          onClose={() => setShowPrizeModal(false)}
          bountyData={{
            id: bountyData.id,
            name: bountyData.name,
            prize_amount: bountyData.prize_amount,
            prize_currency: bountyData.prize_currency,
            bounty_type: bountyData.bounty_type
          }}
          winnerStats={{
            attempts: gameStats.attempts,
            timeElapsed: gameStats.timeElapsed,
            wordsCompleted: gameStats.wordsCompleted,
            totalWords: gameStats.totalWords
          }}
          onClaimComplete={(txHash) => {
            console.log('Prize claimed successfully:', txHash);
            setShowPrizeModal(false);
          }}
        />
      )}
    </Dialog>
  );
}