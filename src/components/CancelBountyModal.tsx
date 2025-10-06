import React, { useState } from 'react';
import { X, AlertCircle, DollarSign } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { BountyWithCreator } from '../utils/supabase/api';

interface CancelBountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  bounty: BountyWithCreator;
  onConfirm: () => Promise<void>;
}

export function CancelBountyModal({ isOpen, onClose, bounty, onConfirm }: CancelBountyModalProps) {
  const [isCancelling, setIsCancelling] = useState(false);

  if (!isOpen) return null;

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Cancel failed:', error);
    } finally {
      setIsCancelling(false);
    }
  };

  // Calculate refund amounts
  const platformFeeRate = 0.025; // 2.5%
  const prizeAmount = parseFloat(bounty.prize_amount?.toString() || '0');
  const platformFee = prizeAmount * platformFeeRate;
  const refundAmount = prizeAmount - platformFee;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Cancel Bounty</h3>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              disabled={isCancelling}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Warning */}
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Are you sure you want to cancel this bounty? This action cannot be undone.
            </AlertDescription>
          </Alert>

          {/* Bounty Details */}
          <div className="space-y-3 mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Bounty Name</p>
              <p className="font-semibold">{bounty.name}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Participants</p>
              <p className="font-semibold">{bounty.participant_count || 0}</p>
            </div>
          </div>

          {/* Refund Calculation */}
          <div className="bg-muted p-4 rounded-lg space-y-2 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-primary" />
              <h4 className="font-semibold">Refund Calculation</h4>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Original Prize Amount</span>
              <span className="font-medium">{prizeAmount.toFixed(2)} HBAR</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform Fee (2.5%)</span>
              <span className="font-medium text-destructive">-{platformFee.toFixed(2)} HBAR</span>
            </div>

            <div className="h-px bg-border my-2" />

            <div className="flex justify-between">
              <span className="font-semibold">You'll Receive</span>
              <span className="font-bold text-primary">{refundAmount.toFixed(2)} HBAR</span>
            </div>
          </div>

          {/* Note about platform fee */}
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              A 2.5% platform fee is deducted from all bounty cancellations to cover blockchain transaction costs and platform maintenance.
            </AlertDescription>
          </Alert>

          {/* Conditions */}
          {bounty.participant_count && bounty.participant_count > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Cannot cancel: {bounty.participant_count} participant(s) have already joined this bounty.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isCancelling}
            >
              Keep Bounty
            </Button>
            <Button
              onClick={handleCancel}
              variant="destructive"
              className="flex-1"
              disabled={isCancelling || (bounty.participant_count && bounty.participant_count > 0)}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Bounty'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
