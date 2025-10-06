import React, { useState, useEffect } from 'react';
import { X, Award, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { BountyWithCreator } from '../utils/supabase/api';
import { escrowService } from '../contracts/EscrowService';
import { useWallet } from './WalletContext';
import { supabase } from '../utils/supabase/client';
import { TransactionStatus } from './TransactionStatus';

interface CompleteBountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  bounty: BountyWithCreator;
  onSuccess: () => void;
}

interface Participant {
  id: string;
  user_id: string;
  wallet_address: string;
  username?: string;
  display_name?: string;
  total_attempts: number;
  words_completed: number;
  total_time_seconds: number;
  joined_at: string;
}

export function CompleteBountyModal({ isOpen, onClose, bounty, onSuccess }: CompleteBountyModalProps) {
  const { getEthersSigner, refreshBalance } = useWallet();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch participants when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchParticipants = async () => {
      try {
        setIsLoadingParticipants(true);
        setError(null);

        // Fetch participations with user details
        const { data, error: fetchError } = await supabase
          .from('bounty_participants')
          .select(`
            id,
            user_id,
            total_attempts,
            words_completed,
            total_time_seconds,
            joined_at,
            users!inner (
              wallet_address,
              username,
              display_name
            )
          `)
          .eq('bounty_id', bounty.id)
          .order('words_completed', { ascending: false })
          .order('total_time_seconds', { ascending: true });

        if (fetchError) throw fetchError;

        // Transform data to include user details at top level
        const participantsData = (data || []).map(p => ({
          id: p.id,
          user_id: p.user_id,
          wallet_address: (p.users as any).wallet_address,
          username: (p.users as any).username,
          display_name: (p.users as any).display_name,
          total_attempts: p.total_attempts,
          words_completed: p.words_completed,
          total_time_seconds: p.total_time_seconds,
          joined_at: p.joined_at,
        }));

        console.log('📊 Participants data from database:', participantsData);
        console.log('📊 First participant detailed stats:', participantsData[0] ? {
          total_attempts: participantsData[0].total_attempts,
          words_completed: participantsData[0].words_completed,
          total_time_seconds: participantsData[0].total_time_seconds
        } : 'No participants');
        setParticipants(participantsData);
      } catch (err: any) {
        console.error('Error fetching participants:', err);
        setError(err.message || 'Failed to load participants');
      } finally {
        setIsLoadingParticipants(false);
      }
    };

    fetchParticipants();
  }, [isOpen, bounty.id]);

  const handleComplete = async () => {
    if (!selectedWinner) {
      setError('Please select a winner');
      return;
    }

    const winner = participants.find(p => p.wallet_address === selectedWinner);
    if (!winner) {
      setError('Invalid winner selected');
      return;
    }

    try {
      setIsCompleting(true);
      setError(null);

      // Initialize escrow service
      const signer = await getEthersSigner();
      await escrowService.initialize(signer);

      // Get the solution (first word from bounty)
      const solution = bounty.words[0] || 'unknown';

      // Show pending toast
      const toastId = TransactionStatus.pending('Distributing prize to winner...');

      // Complete bounty on smart contract (hybrid model: no on-chain registration needed)
      console.log('📤 Completing bounty on smart contract...');
      const result = await escrowService.completeBounty({
        bountyId: bounty.id,
        winnerAddress: winner.wallet_address,
        solution: solution,
      });

      if (!result.success) {
        TransactionStatus.dismiss(toastId);
        throw new Error(result.error || 'Transaction failed');
      }

      // Dismiss pending and show success
      TransactionStatus.dismiss(toastId);
      TransactionStatus.success(
        result.transactionHash || '',
        `Prize distributed to ${winner.display_name || winner.username}!`,
        import.meta.env.VITE_HEDERA_NETWORK as 'testnet' | 'mainnet'
      );

      // Update Supabase
      // 1. Mark bounty as completed
      const { error: bountyError } = await supabase
        .from('bounties')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bounty.id);

      if (bountyError) throw bountyError;

      // 2. Mark winner's participation
      const { error: participationError } = await supabase
        .from('bounty_participants')
        .update({
          is_winner: true,
          status: 'completed',
          prize_amount_won: bounty.prize_amount,
          completed_at: new Date().toISOString(),
        })
        .eq('id', winner.id);

      if (participationError) throw participationError;

      // 3. Record payment transaction
      const { error: txError } = await supabase.rpc('record_payment_transaction', {
        bounty_uuid: bounty.id,
        user_uuid: winner.user_id,
        tx_type: 'prize_payment',
        tx_amount: bounty.prize_amount,
        tx_currency: 'HBAR',
        tx_hash: result.transactionHash || '',
      });

      if (txError) throw txError;

      // Refresh admin wallet balance after prize distribution
      console.log('💰 Refreshing balance after prize distribution...');
      await refreshBalance();

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error('Error completing bounty:', err);
      const errorMessage = err.message || 'Failed to complete bounty';
      setError(errorMessage);

      // Show error toast
      TransactionStatus.error(errorMessage);
    } finally {
      setIsCompleting(false);
    }
  };

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <Award className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Complete Bounty</h2>
                <p className="text-sm text-muted-foreground">{bounty.name}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isCompleting}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    Bounty Completed Successfully!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Prize has been distributed to the winner
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-100">Error</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Bounty Info */}
          <div className="mb-6 p-4 bg-accent/50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Prize Amount</p>
                <p className="font-semibold text-lg">{bounty.prize_amount} HBAR</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Participants</p>
                <p className="font-semibold text-lg">{participants.length}</p>
              </div>
            </div>
          </div>

          {/* Participants List */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Select Winner</h3>

            {isLoadingParticipants ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading participants...</p>
              </div>
            ) : participants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No participants found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {participants.map((participant) => (
                  <button
                    key={participant.id}
                    onClick={() => setSelectedWinner(participant.wallet_address)}
                    disabled={isCompleting}
                    className={`
                      w-full text-left p-4 rounded-lg border-2 transition-all
                      ${selectedWinner === participant.wallet_address
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-accent/50'
                      }
                      ${isCompleting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold">
                          {participant.display_name || participant.username || 'Anonymous'}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono mb-2">
                          {participant.wallet_address.slice(0, 10)}...{participant.wallet_address.slice(-8)}
                        </p>
                        <div className="flex flex-wrap gap-3 text-sm">
                          <span className="text-muted-foreground">
                            Words: <span className="font-medium text-foreground">{participant.words_completed}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Attempts: <span className="font-medium text-foreground">{participant.total_attempts}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Time: <span className="font-medium text-foreground">{formatTime(participant.total_time_seconds)}</span>
                          </span>
                        </div>
                      </div>
                      {selectedWinner === participant.wallet_address && (
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isCompleting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={!selectedWinner || isCompleting || success}
              className="flex-1"
            >
              {isCompleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Completed
                </>
              ) : (
                'Complete Bounty & Distribute Prize'
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
