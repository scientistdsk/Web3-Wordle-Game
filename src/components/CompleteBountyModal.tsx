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
  status: string;
}

// ============================================================================
// PHASE 4 INTEGRATION: Winner data from complete_bounty_with_winners()
// ============================================================================
interface Winner {
  winner_user_id: string;
  prize_awarded: number;
  winner_rank: number;
}

export function CompleteBountyModal({ isOpen, onClose, bounty, onSuccess }: CompleteBountyModalProps) {
  const { getEthersSigner, refreshBalance } = useWallet();
  const [participants, setParticipants] = useState<Participant[]>([]);
  // REMOVED: selectedWinner state (no longer needed - automatic winner determination)
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [completionStep, setCompletionStep] = useState<string>(''); // Track progress

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
            status,
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
          .eq('status', 'completed') // Only show participants who completed
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
          status: p.status,
        }));

        console.log('📊 Completed participants:', participantsData);
        setParticipants(participantsData);

        // REMOVED: Auto-select logic (no longer needed - automatic winner determination)
      } catch (err: any) {
        console.error('Error fetching participants:', err);
        setError(err.message || 'Failed to load participants');
      } finally {
        setIsLoadingParticipants(false);
      }
    };

    fetchParticipants();
  }, [isOpen, bounty.id]);

  // ============================================================================
  // PHASE 4: NEW COMPLETION FLOW
  // ============================================================================
  // This integrates Phase 2 functions:
  // 1. complete_bounty_with_winners() - Marks all winners automatically
  // 2. mark_prize_paid() - Records blockchain payment details
  // ============================================================================
  const handleComplete = async () => {
    // REMOVED: Manual winner selection validation (now uses automatic determination)
    // The complete_bounty_with_winners() function determines winners automatically
    // based on bounty.winner_criteria (time, attempts, words-correct, first-to-solve)

    try {
      setIsCompleting(true);
      setError(null);

      // ========================================================================
      // STEP 1: DETERMINE AND MARK WINNERS (Phase 2 Function)
      // ========================================================================
      setCompletionStep('Determining winners based on bounty criteria...');
      console.log('🎯 Step 1: Calling complete_bounty_with_winners()');

      const { data: winners, error: winnersError } = await supabase
        .rpc('complete_bounty_with_winners', {
          bounty_uuid: bounty.id
        });

      if (winnersError) {
        console.error('❌ Error marking winners:', winnersError);
        throw new Error(winnersError.message || 'Failed to mark winners');
      }

      console.log('✅ Winners marked successfully:', winners);
      const winnersData = winners as Winner[];

      if (!winnersData || winnersData.length === 0) {
        throw new Error('No winners were determined. Check completion criteria.');
      }

      // ========================================================================
      // STEP 2: BLOCKCHAIN PAYMENT FOR EACH WINNER
      // ========================================================================
      setCompletionStep('Preparing blockchain transactions...');

      // Initialize escrow service
      const signer = await getEthersSigner();
      await escrowService.initialize(signer);

      // Get the solution (first word from bounty)
      const solution = bounty.words[0] || 'unknown';

      // Process each winner (usually just 1 for winner-take-all, up to 3 for split-winners)
      for (let i = 0; i < winnersData.length; i++) {
        const winnerData = winnersData[i];

        // Find participant details for this winner
        const winnerParticipant = participants.find(p => p.user_id === winnerData.winner_user_id);
        if (!winnerParticipant) {
          console.warn(`⚠️ Winner ${winnerData.winner_user_id} not found in participants list`);
          continue;
        }

        setCompletionStep(`Processing payment ${i + 1}/${winnersData.length} to ${winnerParticipant.display_name || winnerParticipant.username}...`);
        console.log(`💰 Step 2.${i + 1}: Paying winner ${winnerData.winner_rank}:`, {
          address: winnerParticipant.wallet_address,
          amount: winnerData.prize_awarded
        });

        // Show pending toast
        const toastId = TransactionStatus.pending(
          `Sending ${winnerData.prize_awarded} HBAR to ${winnerParticipant.display_name || winnerParticipant.username}...`
        );

        // Execute blockchain transaction
        const result = await escrowService.completeBounty({
          bountyId: bounty.id,
          winnerAddress: winnerParticipant.wallet_address,
          solution: solution,
        });

        if (!result.success) {
          TransactionStatus.dismiss(toastId);
          throw new Error(result.error || `Payment failed for winner ${winnerData.winner_rank}`);
        }

        // Dismiss pending and show success
        TransactionStatus.dismiss(toastId);
        TransactionStatus.success(
          result.transactionHash || '',
          `${winnerData.prize_awarded} HBAR sent to ${winnerParticipant.display_name || winnerParticipant.username}!`,
          import.meta.env.VITE_HEDERA_NETWORK as 'testnet' | 'mainnet'
        );

        // ========================================================================
        // STEP 3: RECORD PAYMENT DETAILS (Phase 2 Function)
        // ========================================================================
        setCompletionStep(`Recording payment ${i + 1}/${winnersData.length} details...`);
        console.log(`📝 Step 3.${i + 1}: Recording payment for winner ${winnerData.winner_rank}`);

        // Add small delay to ensure blockchain has propagated
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { error: paymentError } = await supabase.rpc('mark_prize_paid', {
          bounty_uuid: bounty.id,
          user_uuid: winnerData.winner_user_id,
          tx_hash: result.transactionHash || ''
        });

        if (paymentError) {
          console.error('⚠️ Warning: Failed to record payment details:', paymentError);
          // Don't throw - payment succeeded, just logging failed
        } else {
          console.log(`✅ Payment recorded for winner ${winnerData.winner_rank}`);
        }
      }

      // ========================================================================
      // SUCCESS! Show immediately
      // ========================================================================
      console.log('🎉 Bounty completion successful!');
      setSuccess(true);
      setCompletionStep('Bounty completed successfully!');

      // ========================================================================
      // STEP 4: REFRESH ADMIN BALANCE (Non-blocking, in background)
      // ========================================================================
      // Refresh balance in background so UI is responsive
      setTimeout(async () => {
        try {
          console.log('💰 Refreshing admin balance in background...');
          // Add delay for blockchain finalization (Hedera needs ~2-3 seconds)
          await new Promise(resolve => setTimeout(resolve, 3000));
          await refreshBalance();
          console.log('✅ Balance refreshed successfully');
        } catch (error) {
          console.error('⚠️ Failed to refresh balance:', error);
          // Don't throw - balance refresh is non-critical
        }
      }, 0);

      // Close modal after showing success message
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (err: any) {
      console.error('❌ Error completing bounty:', err);
      const errorMessage = err.message || 'Failed to complete bounty';
      setError(errorMessage);
      setCompletionStep('');

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
                    Winners have been marked and prizes distributed
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          {isCompleting && completionStep && (
            <div className="mb-6 p-4 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    Processing...
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {completionStep}
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
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Prize Amount</p>
                <p className="font-semibold text-lg">{bounty.prize_amount} HBAR</p>
              </div>
              <div>
                <p className="text-muted-foreground">Completed</p>
                <p className="font-semibold text-lg">{participants.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Winner Criteria</p>
                <p className="font-semibold text-lg capitalize">{bounty.winner_criteria}</p>
              </div>
            </div>
          </div>

          {/* Info Box: Automatic Winner Detection */}
          <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <span className="font-semibold">ℹ️ Automatic Winner Selection:</span> The system will automatically determine the winner(s) based on the bounty's <span className="font-mono">{bounty.winner_criteria}</span> criteria.
              {bounty.prize_distribution === 'split-winners' && ' Top 3 participants will split the prize.'}
            </p>
          </div>

          {/* Participants List */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Preview Top Participants</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Winner(s) will be automatically determined based on {bounty.winner_criteria} when you click Complete.
            </p>

            {isLoadingParticipants ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading participants...</p>
              </div>
            ) : participants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No participants have completed this bounty yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {participants.slice(0, 5).map((participant, index) => (
                  <div
                    key={participant.id}
                    className={`
                      w-full text-left p-4 rounded-lg border-2 transition-all
                      ${index === 0
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-accent/30'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">
                            {participant.display_name || participant.username || 'Anonymous'}
                          </p>
                          {index === 0 && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                              Top Performer
                            </span>
                          )}
                        </div>
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
                      {index === 0 && (
                        <Award className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
                {participants.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    +{participants.length - 5} more participant(s)
                  </p>
                )}
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
              disabled={participants.length === 0 || isCompleting || success}
              className="flex-1"
            >
              {isCompleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
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
