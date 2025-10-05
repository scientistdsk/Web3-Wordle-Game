import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '../../components/WalletContext';
import { PaymentService, paymentService as defaultPaymentService } from './payment-service';
import { CreateBountyParams, CompleteBountyParams, TransactionResult } from '../../contracts/EscrowService';

/**
 * Hook for creating bounties with payment
 */
export function useCreateBountyWithPayment(paymentService?: PaymentService) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const { provider, walletAddress, isConnected } = useWallet();
  const service = paymentService || defaultPaymentService;

  // Initialize service when provider is available
  useEffect(() => {
    if (provider && !service['initialized']) {
      service.initialize(provider).then(() => {
        service['initialized'] = true;
      });
    }
  }, [provider, service]);

  const createBounty = useCallback(
    async (params: CreateBountyParams): Promise<TransactionResult> => {
      if (!isConnected || !walletAddress) {
        const error = new Error('Wallet not connected');
        setError(error);
        return { success: false, error: error.message };
      }

      setIsLoading(true);
      setError(null);
      setTransactionHash(null);

      try {
        const result = await service.createBountyWithPayment(params, walletAddress);

        if (result.success && result.transactionHash) {
          setTransactionHash(result.transactionHash);
        } else if (result.error) {
          setError(new Error(result.error));
        }

        return result;
      } catch (err: any) {
        const error = new Error(err.message || 'Failed to create bounty');
        setError(error);
        return { success: false, error: error.message };
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, walletAddress, service]
  );

  return { createBounty, isLoading, error, transactionHash };
}

/**
 * Hook for joining bounties
 */
export function useJoinBounty(paymentService?: PaymentService) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const { provider, walletAddress, isConnected } = useWallet();
  const service = paymentService || defaultPaymentService;

  // Initialize service when provider is available
  useEffect(() => {
    if (provider && !service['initialized']) {
      service.initialize(provider).then(() => {
        service['initialized'] = true;
      });
    }
  }, [provider, service]);

  const joinBounty = useCallback(
    async (bountyId: string): Promise<TransactionResult> => {
      if (!isConnected || !walletAddress) {
        const error = new Error('Wallet not connected');
        setError(error);
        return { success: false, error: error.message };
      }

      setIsLoading(true);
      setError(null);
      setTransactionHash(null);

      try {
        const result = await service.joinBountyWithTracking(bountyId, walletAddress);

        if (result.success && result.transactionHash) {
          setTransactionHash(result.transactionHash);
        } else if (result.error) {
          setError(new Error(result.error));
        }

        return result;
      } catch (err: any) {
        const error = new Error(err.message || 'Failed to join bounty');
        setError(error);
        return { success: false, error: error.message };
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, walletAddress, service]
  );

  return { joinBounty, isLoading, error, transactionHash };
}

/**
 * Hook for completing bounties (admin/owner only)
 */
export function useCompleteBounty(paymentService?: PaymentService) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const { provider, isConnected } = useWallet();
  const service = paymentService || defaultPaymentService;

  // Initialize service when provider is available
  useEffect(() => {
    if (provider && !service['initialized']) {
      service.initialize(provider).then(() => {
        service['initialized'] = true;
      });
    }
  }, [provider, service]);

  const completeBounty = useCallback(
    async (params: CompleteBountyParams): Promise<TransactionResult> => {
      if (!isConnected) {
        const error = new Error('Wallet not connected');
        setError(error);
        return { success: false, error: error.message };
      }

      setIsLoading(true);
      setError(null);
      setTransactionHash(null);

      try {
        const result = await service.completeBountyWithDistribution(params);

        if (result.success && result.transactionHash) {
          setTransactionHash(result.transactionHash);
        } else if (result.error) {
          setError(new Error(result.error));
        }

        return result;
      } catch (err: any) {
        const error = new Error(err.message || 'Failed to complete bounty');
        setError(error);
        return { success: false, error: error.message };
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, service]
  );

  return { completeBounty, isLoading, error, transactionHash };
}

/**
 * Hook for refunding bounties
 */
export function useRefundBounty(paymentService?: PaymentService) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const { provider, walletAddress, isConnected } = useWallet();
  const service = paymentService || defaultPaymentService;

  // Initialize service when provider is available
  useEffect(() => {
    if (provider && !service['initialized']) {
      service.initialize(provider).then(() => {
        service['initialized'] = true;
      });
    }
  }, [provider, service]);

  const claimRefund = useCallback(
    async (bountyId: string): Promise<TransactionResult> => {
      if (!isConnected || !walletAddress) {
        const error = new Error('Wallet not connected');
        setError(error);
        return { success: false, error: error.message };
      }

      setIsLoading(true);
      setError(null);
      setTransactionHash(null);

      try {
        const result = await service.requestRefund(bountyId, walletAddress);

        if (result.success && result.transactionHash) {
          setTransactionHash(result.transactionHash);
        } else if (result.error) {
          setError(new Error(result.error));
        }

        return result;
      } catch (err: any) {
        const error = new Error(err.message || 'Failed to claim refund');
        setError(error);
        return { success: false, error: error.message };
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, walletAddress, service]
  );

  const cancelBounty = useCallback(
    async (bountyId: string): Promise<TransactionResult> => {
      if (!isConnected || !walletAddress) {
        const error = new Error('Wallet not connected');
        setError(error);
        return { success: false, error: error.message };
      }

      setIsLoading(true);
      setError(null);
      setTransactionHash(null);

      try {
        const result = await service.cancelBountyWithRefund(bountyId, walletAddress);

        if (result.success && result.transactionHash) {
          setTransactionHash(result.transactionHash);
        } else if (result.error) {
          setError(new Error(result.error));
        }

        return result;
      } catch (err: any) {
        const error = new Error(err.message || 'Failed to cancel bounty');
        setError(error);
        return { success: false, error: error.message };
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, walletAddress, service]
  );

  return { claimRefund, cancelBounty, isLoading, error, transactionHash };
}

/**
 * Hook for verifying transactions
 */
export function useVerifyTransaction(paymentService?: PaymentService) {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const service = paymentService || defaultPaymentService;

  const verifyTransaction = useCallback(
    async (txHash: string): Promise<boolean> => {
      setIsLoading(true);

      try {
        const verified = await service.verifyTransaction(txHash);
        setIsVerified(verified);
        return verified;
      } catch (error) {
        console.error('Error verifying transaction:', error);
        setIsVerified(false);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [service]
  );

  return { verifyTransaction, isLoading, isVerified };
}

/**
 * Hook for fetching transaction history
 */
export function useTransactionHistory() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { walletAddress, isConnected } = useWallet();
  const service = defaultPaymentService;

  const fetchTransactions = useCallback(async () => {
    if (!isConnected || !walletAddress) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const history = await service.getTransactionHistory(walletAddress);
      setTransactions(history);
    } catch (err: any) {
      setError(new Error(err.message || 'Failed to fetch transaction history'));
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, isConnected, service]);

  // Auto-fetch on wallet connection
  useEffect(() => {
    if (isConnected && walletAddress) {
      fetchTransactions();
    }
  }, [isConnected, walletAddress, fetchTransactions]);

  return { transactions, isLoading, error, refetch: fetchTransactions };
}

/**
 * Hook for bounty prize calculation
 */
export function usePrizeCalculation() {
  const [netPrize, setNetPrize] = useState<string | null>(null);
  const [platformFee, setPlatformFee] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { provider } = useWallet();
  const service = defaultPaymentService;

  // Initialize service when provider is available
  useEffect(() => {
    if (provider && !service['initialized']) {
      service.initialize(provider).then(() => {
        service['initialized'] = true;
      });
    }
  }, [provider, service]);

  const calculatePrize = useCallback(
    async (grossPrize: string) => {
      setIsLoading(true);

      try {
        const escrowService = service.getEscrowService();
        const result = await escrowService.calculateNetPrize(grossPrize);

        if (result) {
          const netHBAR = (Number(result.netPrize) / 1e18).toFixed(4);
          const feeHBAR = (Number(result.platformFee) / 1e18).toFixed(4);

          setNetPrize(netHBAR);
          setPlatformFee(feeHBAR);
        }
      } catch (error) {
        console.error('Error calculating prize:', error);
        setNetPrize(null);
        setPlatformFee(null);
      } finally {
        setIsLoading(false);
      }
    },
    [service]
  );

  return { calculatePrize, netPrize, platformFee, isLoading };
}
