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
  DollarSign,
  Download,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { escrowService } from '../../contracts/EscrowService';
import { supabase } from '../../utils/supabase/client';
import { TransactionStatus } from '../TransactionStatus';
import { toast } from 'sonner';
import { getTransactionUrl, getCurrentNetwork } from '../../utils/hashscan';

interface WithdrawalHistory {
  id: string;
  amount: number;
  transaction_hash: string;
  created_at: string;
  status: string;
}

export function AdminFeeManagement() {
  const [accumulatedFees, setAccumulatedFees] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalHistory[]>([]);

  useEffect(() => {
    fetchFeeData();
  }, []);

  const fetchFeeData = async () => {
    setIsLoading(true);
    try {
      // Get accumulated fees from contract
      const contract = escrowService.getContract();
      if (contract) {
        const fees = await contract.accumulatedFees();
        setAccumulatedFees(parseFloat(fees.toString()) / 1e8); // Convert from tinybars
      }

      // Fetch withdrawal history from database
      const { data: transactions } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('transaction_type', 'fee_withdrawal')
        .order('created_at', { ascending: false })
        .limit(10);

      if (transactions) {
        setWithdrawalHistory(transactions);
      }
    } catch (error) {
      console.error('Error fetching fee data:', error);
      toast.error('Failed to load fee data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdrawClick = () => {
    if (accumulatedFees <= 0) {
      toast.error('No fees available to withdraw');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleWithdrawConfirm = async () => {
    setIsWithdrawing(true);
    setShowConfirmModal(false);

    const toastId = TransactionStatus.pending('Withdrawing platform fees...');

    try {
      const result = await escrowService.withdrawFees();

      if (!result.success) {
        TransactionStatus.dismiss(toastId);
        throw new Error(result.error || 'Withdrawal failed');
      }

      TransactionStatus.dismiss(toastId);
      TransactionStatus.success(
        result.transactionHash || '',
        `Successfully withdrew ${accumulatedFees.toFixed(2)} HBAR in fees!`,
        getCurrentNetwork()
      );

      // Refresh fee data
      await fetchFeeData();
    } catch (error) {
      console.error('Fee withdrawal error:', error);
      TransactionStatus.error(
        error instanceof Error ? error.message : 'Failed to withdraw fees'
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform Fee Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const canWithdraw = accumulatedFees > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Platform Fee Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Accumulated Fees Display */}
          <div className="p-6 bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-lg border border-emerald-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 rounded-full">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Accumulated Platform Fees</p>
                  <p className="text-3xl font-bold text-emerald-600">
                    {accumulatedFees.toFixed(4)} HBAR
                  </p>
                </div>
              </div>
              <Button
                onClick={handleWithdrawClick}
                disabled={!canWithdraw || isWithdrawing}
                className="gap-2"
                size="lg"
              >
                {isWithdrawing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Withdraw Fees
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Platform fee rate: 2.5% on all prize distributions</span>
            </div>
          </div>

          {/* Info Banner */}
          {!canWithdraw && (
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border border-border">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">No fees available for withdrawal</p>
                <p className="text-muted-foreground">
                  Fees will accumulate as bounties are completed. The platform earns 2.5% of each prize distribution.
                </p>
              </div>
            </div>
          )}

          {/* Withdrawal History */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Withdrawal History
            </h3>

            {withdrawalHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No withdrawals yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {withdrawalHistory.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        withdrawal.status === 'confirmed'
                          ? 'bg-green-500/20'
                          : withdrawal.status === 'pending'
                          ? 'bg-yellow-500/20'
                          : 'bg-red-500/20'
                      }`}>
                        {withdrawal.status === 'confirmed' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : withdrawal.status === 'pending' ? (
                          <Clock className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{parseFloat(withdrawal.amount).toFixed(4)} HBAR</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(withdrawal.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    {withdrawal.transaction_hash && (
                      <a
                        href={getTransactionUrl(withdrawal.transaction_hash, getCurrentNetwork())}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        View on HashScan
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Fee Withdrawal</DialogTitle>
            <DialogDescription>
              You are about to withdraw the accumulated platform fees.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount to withdraw:</span>
                <span className="font-semibold">{accumulatedFees.toFixed(4)} HBAR</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform fee rate:</span>
                <span className="font-semibold">2.5%</span>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p>
                This action will transfer the fees from the smart contract to your wallet.
                Make sure your wallet has sufficient HBAR for gas fees.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleWithdrawConfirm} disabled={isWithdrawing}>
              {isWithdrawing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Withdrawal'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Missing import
import { ExternalLink } from 'lucide-react';
