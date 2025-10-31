import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useWallet } from './WalletContext';
import {
  Plus,
  Trophy,
  Wallet,
  Edit,
  RefreshCw,
  DollarSign,
  XCircle,
  Clock,
} from 'lucide-react';
import { useRefundBounty } from '../utils/payment/payment-hooks';
import { getBounties, BountyWithCreator } from '../utils/supabase/api';
import { CancelBountyModal } from './CancelBountyModal';
import { escrowService } from '../contracts/EscrowService';
import { TransactionStatus } from './TransactionStatus';
import { supabase } from '../utils/supabase/client';
import { TransactionHistory } from './TransactionHistory';
import { BountyHistory } from './BountyHistory';
import { EditProfileModal } from './EditProfileModal';
import { StatsCard } from './StatsCard';
import { NotificationService } from '../utils/notifications/notification-service';

interface ProfilePageProps {
  onCreateBounty: () => void;
}

export function ProfilePage({ onCreateBounty }: ProfilePageProps) {
  const { isConnected, walletAddress, balance, refreshBalance } = useWallet();
  const [userName, setUserName] = useState<string>('Anonymous');
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [userStats, setUserStats] = useState({
    total_bounties_created: 0,
    total_bounties_participated: 0,
    total_bounties_won: 0,
    total_prize_money_earned: 0,
    total_prize_money_spent: 0,
    win_rate: 0,
    average_attempts: 0,
    best_word_length: 0,
  });
  const [expiredBounties, setExpiredBounties] = useState<any[]>([]);
  const [refundingBountyId, setRefundingBountyId] = useState<string | null>(null);
  const { refundBounty, loading: refundLoading, error: refundError } = useRefundBounty();
  const [cancellingBounty, setCancellingBounty] = useState<any | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (isConnected && walletAddress) {
      fetchUserData();
      fetchExpiredBounties();
    }
  }, [isConnected, walletAddress]);

  const fetchUserData = async () => {
    setIsLoadingStats(true);
    try {
      // Fetch user profile info (without email - field doesn't exist in schema)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('username, display_name')
        .eq('wallet_address', walletAddress)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
      }

      if (userData) {
        const displayName = userData.display_name || userData.username || 'Anonymous';
        setUserName(displayName);
      }

      // Fetch user stats using the database function
      const { data: statsData, error: statsError } = await supabase.rpc('get_user_stats', {
        wallet_addr: walletAddress
      });

      if (statsError) {
        console.error('Error fetching user stats:', statsError);
      } else if (statsData && statsData.length > 0) {
        const stats = statsData[0];

        // Get user ID for additional queries
        const { data: userIdData } = await supabase
          .from('users')
          .select('id, total_hbar_earned, total_hbar_spent')
          .eq('wallet_address', walletAddress)
          .single();

        const userId = userIdData?.id;

        // Calculate average attempts
        const { data: avgAttemptsData } = await supabase
          .from('bounty_participants')
          .select('total_attempts')
          .eq('user_id', userId)
          .eq('is_winner', true);

        const avgAttempts = avgAttemptsData && avgAttemptsData.length > 0
          ? avgAttemptsData.reduce((sum, p) => sum + (p.total_attempts || 0), 0) / avgAttemptsData.length
          : 0;

        // Get best word length (longest word from won bounties)
        const { data: bestWordData } = await supabase
          .from('bounty_participants')
          .select('bounty:bounties(words)')
          .eq('user_id', userId)
          .eq('is_winner', true);

        let bestWordLength = 0;
        if (bestWordData && bestWordData.length > 0) {
          bestWordData.forEach((item: any) => {
            if (item.bounty?.words && Array.isArray(item.bounty.words)) {
              item.bounty.words.forEach((word: string) => {
                if (word.length > bestWordLength) {
                  bestWordLength = word.length;
                }
              });
            }
          });
        }

        setUserStats({
          total_bounties_created: stats.total_bounty_created || 0,
          total_bounties_participated: stats.total_bounty_entered || 0,
          total_bounties_won: stats.total_wins || 0,
          total_prize_money_earned: parseFloat(userIdData?.total_hbar_earned || '0'),
          total_prize_money_spent: parseFloat(userIdData?.total_hbar_spent || '0'),
          win_rate: parseFloat(stats.success_rate || '0'),
          average_attempts: avgAttempts,
          best_word_length: bestWordLength,
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };


  const fetchExpiredBounties = async () => {
    if (!walletAddress) return;

    try {
      // Fetch bounties created by this user that are expired and have prizes
      const bounties = await getBounties({
        status: 'expired'
      });

      // Filter for bounties created by current user with prizes > 0
      const userExpiredBounties = bounties.filter((bounty: any) =>
        bounty.creator_id === walletAddress &&
        parseFloat(bounty.prize_amount) > 0 &&
        bounty.completion_count === 0 // No winner
      );

      setExpiredBounties(userExpiredBounties);
    } catch (error) {
      console.error('Error fetching expired bounties:', error);
    }
  };


  const handleClaimRefund = async (bountyId: string) => {
    if (!walletAddress) return;

    setRefundingBountyId(bountyId);
    try {
      const result = await refundBounty(bountyId);

      if (result.success) {
        NotificationService.transaction.success(
          result.transactionHash || '',
          `Refund successful!`
        );

        // Refresh wallet balance after refund
        console.log('💰 Refreshing balance after refund...');
        await refreshBalance();

        // Refresh expired bounties list
        await fetchExpiredBounties();
      }
    } catch (error) {
      console.error('Refund failed:', error);
      NotificationService.system.error(
        error instanceof Error ? error.message : 'Refund failed'
      );
    } finally {
      setRefundingBountyId(null);
    }
  };

  const handleCancelBounty = async (bountyId: string) => {
    if (!walletAddress) return;

    try {
      const toastId = TransactionStatus.pending('Cancelling bounty...');

      // Initialize escrow service
      const { getEthersSigner } = useWallet();
      const signer = await getEthersSigner();
      await escrowService.initialize(signer);

      // Cancel bounty on smart contract
      const result = await escrowService.cancelBounty(bountyId);

      if (!result.success) {
        TransactionStatus.dismiss(toastId);
        throw new Error(result.error || 'Cancellation failed');
      }

      TransactionStatus.dismiss(toastId);
      TransactionStatus.success(
        result.transactionHash || '',
        'Bounty cancelled successfully!',
        import.meta.env.VITE_HEDERA_NETWORK as 'testnet' | 'mainnet'
      );

      // Refresh wallet balance and data
      await refreshBalance();
      await fetchUserData();
      await fetchExpiredBounties();
    } catch (error) {
      console.error('Cancel bounty failed:', error);
      TransactionStatus.error(error instanceof Error ? error.message : 'Failed to cancel bounty');
    }
  };

  const handleProfileUpdateSuccess = () => {
    fetchUserData();
  };

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Connect Your Wallet</h3>
            <p className="text-muted-foreground mb-4">
              Connect your wallet to view your profile and track your bounty performance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {userName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{userName}</h1>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditProfileModalOpen(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground font-mono">{walletAddress}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  Bounty Hunter
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Wallet className="h-3 w-3" />
                  {balance || '0'} HBAR
                </Badge>
              </div>
            </div>
            <Button onClick={onCreateBounty} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Bounty
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        walletAddress={walletAddress || ''}
        currentUsername={userName}
        onSuccess={handleProfileUpdateSuccess}
      /> 

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="flex w-full">
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="bounties">Bounties</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="refunds" className="inline-flex items-center justify-center gap-1">
            <span>Refunds</span>
            {expiredBounties.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
                {expiredBounties.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-4">
          <StatsCard stats={userStats} loading={isLoadingStats} />
        </TabsContent>

        {/* Bounties Tab */}
        <TabsContent value="bounties" className="space-y-4">
          <BountyHistory
            walletAddress={walletAddress || ''}
            onCancelBounty={handleCancelBounty}
          />
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <TransactionHistory walletAddress={walletAddress || ''} />
        </TabsContent>

        {/* Refunds Tab */}
        <TabsContent value="refunds" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3>Claimable Refunds</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchExpiredBounties}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {expiredBounties.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No expired bounties with claimable refunds
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {expiredBounties.map((bounty: any) => (
                <Card key={bounty.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <h4 className="font-medium">{bounty.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{bounty.bounty_type}</Badge>
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Expired
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            No winner
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            {parseFloat(bounty.prize_amount).toFixed(2)} HBAR
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Refund Available
                          </div>
                        </div>
                        <Button
                          onClick={() => handleClaimRefund(bounty.id)}
                          disabled={refundingBountyId === bounty.id}
                          className="gap-2"
                        >
                          {refundingBountyId === bounty.id ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <DollarSign className="h-4 w-4" />
                              Claim Refund
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {refundError && (
            <Card className="border-destructive">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">
                    {typeof refundError === 'string'
                      ? refundError
                      : refundError?.message || 'Failed to process refund'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}