import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  AlertTriangle,
  Pause,
  Play,
  Shield,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { escrowService } from '../../contracts/EscrowService';
import { TransactionStatus } from '../TransactionStatus';
import { toast } from 'sonner';
import { getCurrentNetwork } from '../../utils/hashscan';

export function AdminEmergencyControls() {
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showUnpauseModal, setShowUnpauseModal] = useState(false);

  useEffect(() => {
    fetchContractStatus();
  }, []);

  const fetchContractStatus = async () => {
    setIsLoading(true);
    try {
      const paused = await escrowService.isPaused();
      setIsPaused(paused);
    } catch (error) {
      console.error('Error fetching contract status:', error);
      toast.error('Failed to load contract status');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseClick = () => {
    setShowPauseModal(true);
  };

  const handleUnpauseClick = () => {
    setShowUnpauseModal(true);
  };

  const handlePauseConfirm = async () => {
    setIsProcessing(true);
    setShowPauseModal(false);

    const toastId = TransactionStatus.pending('Pausing contract...');

    try {
      const contract = escrowService.getContract();
      if (!contract) {
        throw new Error('Contract not initialized');
      }

      const tx = await contract.pause();
      await tx.wait();

      TransactionStatus.dismiss(toastId);
      TransactionStatus.success(
        tx.hash,
        'Contract paused successfully!',
        getCurrentNetwork()
      );

      // Refresh status
      await fetchContractStatus();
    } catch (error) {
      console.error('Pause error:', error);
      TransactionStatus.error(
        error instanceof Error ? error.message : 'Failed to pause contract'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnpauseConfirm = async () => {
    setIsProcessing(true);
    setShowUnpauseModal(false);

    const toastId = TransactionStatus.pending('Unpausing contract...');

    try {
      const contract = escrowService.getContract();
      if (!contract) {
        throw new Error('Contract not initialized');
      }

      const tx = await contract.unpause();
      await tx.wait();

      TransactionStatus.dismiss(toastId);
      TransactionStatus.success(
        tx.hash,
        'Contract unpaused successfully!',
        getCurrentNetwork()
      );

      // Refresh status
      await fetchContractStatus();
    } catch (error) {
      console.error('Unpause error:', error);
      TransactionStatus.error(
        error instanceof Error ? error.message : 'Failed to unpause contract'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Emergency Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className={isPaused ? 'border-red-500' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Emergency Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Contract Status */}
          <div className={`p-6 rounded-lg border-2 ${
            isPaused
              ? 'bg-red-500/10 border-red-500/50'
              : 'bg-green-500/10 border-green-500/50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${
                  isPaused ? 'bg-red-500/20' : 'bg-green-500/20'
                }`}>
                  {isPaused ? (
                    <Pause className="h-6 w-6 text-red-600" />
                  ) : (
                    <Play className="h-6 w-6 text-green-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contract Status</p>
                  <p className={`text-2xl font-bold ${
                    isPaused ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {isPaused ? 'PAUSED' : 'ACTIVE'}
                  </p>
                </div>
              </div>

              {isPaused ? (
                <Button
                  onClick={handleUnpauseClick}
                  disabled={isProcessing}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Unpause Contract
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handlePauseClick}
                  disabled={isProcessing}
                  variant="destructive"
                  className="gap-2"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4" />
                      Pause Contract
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">
              What happens when paused?
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">All contract operations are suspended</p>
                  <p className="text-muted-foreground">
                    Users cannot create bounties, join bounties, or claim prizes
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Existing bounties remain locked</p>
                  <p className="text-muted-foreground">
                    All HBAR in escrow remains safe and can be withdrawn after unpause
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Admin functions still available</p>
                  <p className="text-muted-foreground">
                    You can still unpause, withdraw fees, and manage the contract
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">Use emergency controls responsibly</p>
              <p className="text-muted-foreground">
                Pausing the contract should only be done in case of security issues or critical bugs.
                It will affect all users and active bounties.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pause Confirmation Modal */}
      <Dialog open={showPauseModal} onOpenChange={setShowPauseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Pause Smart Contract
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to pause the contract? This is a critical action.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg space-y-2">
              <p className="font-semibold text-red-600">⚠️ WARNING: This will immediately:</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Stop all new bounty creations</li>
                <li>Prevent users from joining bounties</li>
                <li>Block all prize claims and refunds</li>
                <li>Affect all active users on the platform</li>
              </ul>
            </div>

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Use this only for:</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Critical security vulnerabilities</li>
                <li>Smart contract bugs discovered</li>
                <li>Emergency maintenance</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPauseModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handlePauseConfirm} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Pausing...
                </>
              ) : (
                'Yes, Pause Contract'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unpause Confirmation Modal */}
      <Dialog open={showUnpauseModal} onOpenChange={setShowUnpauseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Play className="h-5 w-5" />
              Unpause Smart Contract
            </DialogTitle>
            <DialogDescription>
              Resume normal contract operations?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-muted-foreground">
                This will restore all contract functionality. Users will be able to create bounties,
                join bounties, and claim prizes again.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnpauseModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUnpauseConfirm}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Unpausing...
                </>
              ) : (
                'Yes, Unpause Contract'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
