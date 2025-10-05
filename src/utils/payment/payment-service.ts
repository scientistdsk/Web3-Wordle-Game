import { BrowserProvider } from 'ethers';
import { EscrowService, CreateBountyParams, CompleteBountyParams, TransactionResult } from '../../contracts/EscrowService';
import { supabase } from '../supabase/client';

/**
 * PaymentService - Business logic wrapper around EscrowService
 * Integrates blockchain transactions with Supabase database
 */
export class PaymentService {
  private escrowService: EscrowService;

  constructor(escrowService?: EscrowService) {
    this.escrowService = escrowService || new EscrowService();
  }

  /**
   * Initialize with wallet provider
   */
  async initialize(provider: BrowserProvider): Promise<void> {
    await this.escrowService.initialize(provider);
  }

  /**
   * Create bounty with payment and database tracking
   */
  async createBountyWithPayment(
    params: CreateBountyParams,
    walletAddress: string
  ): Promise<TransactionResult> {
    try {
      // Create bounty on blockchain
      const result = await this.escrowService.createBounty(params);

      if (result.success && result.transactionHash) {
        // Record transaction in database
        await this.recordTransaction({
          transactionHash: result.transactionHash,
          bountyId: params.bountyId,
          fromAddress: walletAddress,
          amount: parseFloat(params.prizeAmount),
          transactionType: 'bounty_creation',
          status: 'confirmed'
        });

        // Update bounty status in database
        await this.updateBountyBlockchainStatus(params.bountyId, 'created', result.transactionHash);
      }

      return result;
    } catch (error: any) {
      console.error('Error in createBountyWithPayment:', error);
      return {
        success: false,
        error: error.message || 'Failed to create bounty with payment'
      };
    }
  }

  /**
   * Join bounty and record participation
   */
  async joinBountyWithTracking(bountyId: string, walletAddress: string): Promise<TransactionResult> {
    try {
      // Join bounty on blockchain
      const result = await this.escrowService.joinBounty(bountyId);

      if (result.success && result.transactionHash) {
        // Record transaction in database
        await this.recordTransaction({
          transactionHash: result.transactionHash,
          bountyId,
          fromAddress: walletAddress,
          amount: 0, // No payment for joining
          transactionType: 'bounty_join',
          status: 'confirmed'
        });

        // Update participation in database
        await this.recordParticipation(bountyId, walletAddress);
      }

      return result;
    } catch (error: any) {
      console.error('Error in joinBountyWithTracking:', error);
      return {
        success: false,
        error: error.message || 'Failed to join bounty'
      };
    }
  }

  /**
   * Complete bounty and distribute prize
   */
  async completeBountyWithDistribution(params: CompleteBountyParams): Promise<TransactionResult> {
    try {
      // Complete bounty on blockchain
      const result = await this.escrowService.completeBounty(params);

      if (result.success && result.transactionHash) {
        // Get prize info from contract
        const bountyInfo = await this.escrowService.getBountyInfo(params.bountyId);

        if (bountyInfo) {
          const prizeHBAR = Number(bountyInfo.prizeAmount) / 1e18;

          // Record prize distribution
          await this.recordTransaction({
            transactionHash: result.transactionHash,
            bountyId: params.bountyId,
            fromAddress: this.escrowService.getContractAddress(),
            toAddress: params.winnerAddress,
            amount: prizeHBAR,
            transactionType: 'prize_distribution',
            status: 'confirmed'
          });

          // Update bounty as completed
          await this.updateBountyBlockchainStatus(params.bountyId, 'completed', result.transactionHash);

          // Mark winner in database
          await this.markBountyWinner(params.bountyId, params.winnerAddress);
        }
      }

      return result;
    } catch (error: any) {
      console.error('Error in completeBountyWithDistribution:', error);
      return {
        success: false,
        error: error.message || 'Failed to complete bounty'
      };
    }
  }

  /**
   * Request refund for expired or cancelled bounty
   */
  async requestRefund(bountyId: string, walletAddress: string): Promise<TransactionResult> {
    try {
      // Claim refund on blockchain
      const result = await this.escrowService.claimRefund(bountyId);

      if (result.success && result.transactionHash) {
        // Get bounty info for amount
        const bountyInfo = await this.escrowService.getBountyInfo(bountyId);

        if (bountyInfo) {
          const refundHBAR = Number(bountyInfo.prizeAmount) / 1e18;

          // Record refund transaction
          await this.recordTransaction({
            transactionHash: result.transactionHash,
            bountyId,
            fromAddress: this.escrowService.getContractAddress(),
            toAddress: walletAddress,
            amount: refundHBAR,
            transactionType: 'refund',
            status: 'confirmed'
          });

          // Update bounty status
          await this.updateBountyBlockchainStatus(bountyId, 'refunded', result.transactionHash);
        }
      }

      return result;
    } catch (error: any) {
      console.error('Error in requestRefund:', error);
      return {
        success: false,
        error: error.message || 'Failed to request refund'
      };
    }
  }

  /**
   * Cancel bounty and get refund
   */
  async cancelBountyWithRefund(bountyId: string, walletAddress: string): Promise<TransactionResult> {
    try {
      // Cancel bounty on blockchain
      const result = await this.escrowService.cancelBounty(bountyId);

      if (result.success && result.transactionHash) {
        // Record cancellation
        await this.recordTransaction({
          transactionHash: result.transactionHash,
          bountyId,
          fromAddress: this.escrowService.getContractAddress(),
          toAddress: walletAddress,
          amount: 0, // Amount tracked in refund event
          transactionType: 'bounty_cancellation',
          status: 'confirmed'
        });

        // Update bounty status
        await this.updateBountyBlockchainStatus(bountyId, 'cancelled', result.transactionHash);
      }

      return result;
    } catch (error: any) {
      console.error('Error in cancelBountyWithRefund:', error);
      return {
        success: false,
        error: error.message || 'Failed to cancel bounty'
      };
    }
  }

  /**
   * Verify transaction on blockchain
   */
  async verifyTransaction(transactionHash: string): Promise<boolean> {
    try {
      // Transaction verification would query Hedera mirror node or HashScan API
      // For now, we'll check if transaction exists in our database
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('status')
        .eq('transaction_hash', transactionHash)
        .single();

      if (error || !data) {
        return false;
      }

      return data.status === 'confirmed';
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return false;
    }
  }

  /**
   * Get transaction history for a wallet
   */
  async getTransactionHistory(walletAddress: string) {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .or(`from_address.eq.${walletAddress},to_address.eq.${walletAddress}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transaction history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTransactionHistory:', error);
      return [];
    }
  }

  /**
   * Record transaction in database
   */
  private async recordTransaction(transaction: {
    transactionHash: string;
    bountyId: string;
    fromAddress: string;
    toAddress?: string;
    amount: number;
    transactionType: string;
    status: string;
  }) {
    try {
      const { error } = await supabase.from('payment_transactions').insert({
        transaction_hash: transaction.transactionHash,
        bounty_id: transaction.bountyId,
        from_address: transaction.fromAddress,
        to_address: transaction.toAddress || null,
        amount: transaction.amount,
        transaction_type: transaction.transactionType,
        status: transaction.status,
        created_at: new Date().toISOString()
      });

      if (error) {
        console.error('Error recording transaction:', error);
      }
    } catch (error) {
      console.error('Error in recordTransaction:', error);
    }
  }

  /**
   * Update bounty blockchain status
   */
  private async updateBountyBlockchainStatus(
    bountyId: string,
    status: string,
    transactionHash?: string
  ) {
    try {
      const updateData: any = {
        blockchain_status: status,
        updated_at: new Date().toISOString()
      };

      if (transactionHash) {
        updateData.blockchain_tx_hash = transactionHash;
      }

      const { error } = await supabase
        .from('bounties')
        .update(updateData)
        .eq('id', bountyId);

      if (error) {
        console.error('Error updating bounty blockchain status:', error);
      }
    } catch (error) {
      console.error('Error in updateBountyBlockchainStatus:', error);
    }
  }

  /**
   * Record participation in database
   */
  private async recordParticipation(bountyId: string, walletAddress: string) {
    try {
      // First, get or create user
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single();

      if (userError || !userData) {
        // Create user if doesn't exist
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({ wallet_address: walletAddress })
          .select('id')
          .single();

        if (createError || !newUser) {
          console.error('Error creating user:', createError);
          return;
        }
        userData = newUser;
      }

      // Record participation
      const { error } = await supabase.from('participations').insert({
        bounty_id: bountyId,
        user_id: userData.id,
        joined_at: new Date().toISOString()
      });

      if (error) {
        console.error('Error recording participation:', error);
      }
    } catch (error) {
      console.error('Error in recordParticipation:', error);
    }
  }

  /**
   * Mark bounty winner in database
   */
  private async markBountyWinner(bountyId: string, winnerAddress: string) {
    try {
      // Get user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', winnerAddress)
        .single();

      if (userError || !userData) {
        console.error('Winner user not found:', userError);
        return;
      }

      // Update bounty with winner
      const { error } = await supabase
        .from('bounties')
        .update({
          winner_id: userData.id,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', bountyId);

      if (error) {
        console.error('Error marking bounty winner:', error);
      }
    } catch (error) {
      console.error('Error in markBountyWinner:', error);
    }
  }

  /**
   * Get escrow service instance
   */
  getEscrowService(): EscrowService {
    return this.escrowService;
  }
}

// Export singleton instance
export const paymentService = new PaymentService();

export default PaymentService;
