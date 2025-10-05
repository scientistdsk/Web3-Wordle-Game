import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { useCompleteBounty, useVerifyTransaction } from '../utils/payment/payment-hooks';
import { useWallet } from './WalletContext';
import {
  Trophy,
  Gift,
  Clock,
  Target,
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
  Coins
} from 'lucide-react';

interface PrizeClaimModalProps {
  open: boolean;
  onClose: () => void;
  bountyData: {
    id: string;
    name: string;
    prize_amount: number;
    prize_currency: string;
    bounty_type: string;
  };
  winnerStats: {
    attempts: number;
    timeElapsed: number;
    wordsCompleted: number;
    totalWords: number;
    finalScore?: number;
  };
  onClaimComplete?: (transactionHash?: string) => void;
}

export function PrizeClaimModal({
  open,
  onClose,
  bountyData,
  winnerStats,
  onClaimComplete
}: PrizeClaimModalProps) {
  const { walletAddress } = useWallet();
  const { completeBounty, loading: isProcessing, error: claimError } = useCompleteBounty();
  const { verifyTransaction, loading: isVerifying } = useVerifyTransaction();

  const [claimStatus, setClaimStatus] = useState<'ready' | 'claiming' | 'claimed' | 'error'>('ready');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClaimPrize = async () => {
    if (!walletAddress || !bountyData.id) return;

    try {
      setClaimStatus('claiming');

      const result = await completeBounty(bountyData.id, walletAddress);

      if (result.success && result.transactionHash) {
        setTransactionHash(result.transactionHash);
        setClaimStatus('claimed');
        onClaimComplete?.(result.transactionHash);

        // Start verification process
        if (result.transactionHash) {
          const verified = await verifyTransaction(result.transactionHash);
          setIsVerified(verified);
        }
      } else {
        setClaimStatus('error');
      }
    } catch (error) {
      console.error('Prize claim failed:', error);
      setClaimStatus('error');
    }
  };

  const getHederaExplorerUrl = (txHash: string) => {
    const network = import.meta.env.VITE_HEDERA_NETWORK === 'mainnet' ? '' : 'testnet.';
    return `https://${network}explorer.arkhia.io/transactions/${txHash}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Congratulations!
          </DialogTitle>
          <DialogDescription>
            You've successfully completed the bounty challenge
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bounty Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{bountyData.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Prize Amount</span>
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span className="font-semibold">
                    {bountyData.prize_amount} {bountyData.prize_currency}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bounty Type</span>
                <Badge variant="outline">{bountyData.bounty_type}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Winner Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Your Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Attempts</span>
                <span className="text-sm font-medium">{winnerStats.attempts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Time Taken</span>
                <span className="text-sm font-medium">{formatTime(winnerStats.timeElapsed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Words Completed</span>
                <span className="text-sm font-medium">
                  {winnerStats.wordsCompleted}/{winnerStats.totalWords}
                </span>
              </div>
              {winnerStats.finalScore !== undefined && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Final Score</span>
                  <span className="text-sm font-medium">{winnerStats.finalScore}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Claim Status */}
          {claimStatus === 'ready' && bountyData.prize_amount > 0 && (
            <Alert className="bg-blue-50 border-blue-200">
              <Gift className="h-4 w-4" />
              <AlertDescription className="text-blue-800">
                Your prize is ready to be claimed! Click below to receive {bountyData.prize_amount} {bountyData.prize_currency} to your wallet.
              </AlertDescription>
            </Alert>
          )}

          {claimStatus === 'claiming' && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription className="text-yellow-800">
                Processing your prize claim... This may take a few moments.
              </AlertDescription>
            </Alert>
          )}

          {claimStatus === 'claimed' && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-800">
                Prize claimed successfully! {bountyData.prize_amount} {bountyData.prize_currency} has been sent to your wallet.
              </AlertDescription>
            </Alert>
          )}

          {claimStatus === 'error' && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                {claimError || 'Failed to claim prize. Please try again or contact support.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Transaction Details */}
          {transactionHash && (
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Transaction</span>
                    <div className="flex items-center gap-2">
                      {isVerifying && <Loader2 className="h-3 w-3 animate-spin" />}
                      {isVerified && <CheckCircle className="h-3 w-3 text-green-500" />}
                      <span className="text-xs font-mono">
                        {transactionHash.slice(0, 8)}...{transactionHash.slice(-6)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => window.open(getHederaExplorerUrl(transactionHash), '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                    View on Hedera Explorer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {claimStatus === 'ready' && bountyData.prize_amount > 0 ? (
              <Button
                onClick={handleClaimPrize}
                disabled={isProcessing || !walletAddress}
                className="flex-1 gap-2"
              >
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                Claim {bountyData.prize_amount} {bountyData.prize_currency}
              </Button>
            ) : (
              <Button onClick={onClose} className="flex-1">
                {claimStatus === 'claimed' ? 'Done' : 'Close'}
              </Button>
            )}

            {claimStatus === 'error' && (
              <Button
                variant="outline"
                onClick={handleClaimPrize}
                disabled={isProcessing}
                className="flex-1"
              >
                Retry
              </Button>
            )}
          </div>

          {bountyData.prize_amount === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              This was a practice bounty with no prize amount.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}