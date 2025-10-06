import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useWallet } from './WalletContext';
import { useMutation, useApi } from '../utils/supabase/hooks';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  Plus,
  Target,
  Trophy,
  TrendingUp,
  Wallet,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Check,
  X,
  RefreshCw,
  DollarSign,
  ExternalLink,
  Copy
} from 'lucide-react';
import { useRefundBounty } from '../utils/payment/payment-hooks';
import { getBounties, getUserParticipations, BountyWithCreator } from '../utils/supabase/api';
import { CancelBountyModal } from './CancelBountyModal';
import { escrowService } from '../contracts/EscrowService';
import { TransactionStatus } from './TransactionStatus';
import { supabase } from '../utils/supabase/client';
import { getTransactionUrl, getCurrentNetwork, truncateHash, copyToClipboard } from '../utils/hashscan';

interface ProfilePageProps {
  onCreateBounty: () => void;
}

// Transaction Item Component
function TransactionItem({ tx }: { tx: any }) {
  const [copied, setCopied] = useState(false);
  const isIncoming = tx.transaction_type === 'prize_payout' || tx.transaction_type === 'refund';
  const amount = parseFloat(tx.amount);

  const handleCopyHash = async () => {
    const success = await copyToClipboard(tx.transaction_hash);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div key={tx.id} className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <span className="text-sm font-medium">
            {tx.transaction_type === 'prize_payout' && 'Bounty Win'}
            {tx.transaction_type === 'deposit' && 'Created Bounty'}
            {tx.transaction_type === 'refund' && 'Refund'}
          </span>
          {tx.bounty?.name && (
            <span className="text-sm text-muted-foreground"> - "{tx.bounty.name}"</span>
          )}
        </div>
        <span className={`text-sm font-medium ${isIncoming ? 'text-green-600' : 'text-red-600'}`}>
          {isIncoming ? '+' : '-'}{amount.toFixed(2)} {tx.currency}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <code className="bg-muted px-2 py-0.5 rounded">
          {truncateHash(tx.transaction_hash, 8, 6)}
        </code>
        <button
          onClick={handleCopyHash}
          className="hover:text-foreground transition-colors"
          title={copied ? 'Copied!' : 'Copy hash'}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
        <a
          href={getTransactionUrl(tx.transaction_hash, getCurrentNetwork())}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
          title="View on HashScan"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

// No more mock data - we'll fetch real data from Supabase

export function ProfilePage({ onCreateBounty }: ProfilePageProps) {
  const { isConnected, walletAddress, balance, refreshBalance } = useWallet();
  const [userName, setUserName] = useState<string>('Anonymous');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newUserName, setNewUserName] = useState(userName);
  const [userStats, setUserStats] = useState({
    totalBountyCreated: 0,
    totalBountyEntered: 0,
    totalTries: 0,
    totalWins: 0,
    totalLosses: 0,
    successRate: 0
  });
  const [userRank, setUserRank] = useState<string>('Beginner');
  const [createdBounties, setCreatedBounties] = useState<BountyWithCreator[]>([]);
  const [participatedBounties, setParticipatedBounties] = useState<any[]>([]);
  const [expiredBounties, setExpiredBounties] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [refundingBountyId, setRefundingBountyId] = useState<string | null>(null);
  const { refundBounty, loading: refundLoading, error: refundError } = useRefundBounty();
  const [cancellingBounty, setCancellingBounty] = useState<any | null>(null);
  const [isLoadingBounties, setIsLoadingBounties] = useState(true);

  useEffect(() => {
    if (isConnected && walletAddress) {
      fetchUserData();
      fetchCreatedBounties();
      fetchParticipatedBounties();
      fetchExpiredBounties();
      fetchRecentTransactions();
    }
  }, [isConnected, walletAddress]);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-d72b2276/users/${walletAddress}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const data = await response.json();
      if (data.user?.stats) {
        setUserStats(data.user.stats);
      }
      if (data.user?.name) {
        setUserName(data.user.name);
        setNewUserName(data.user.name);
      }
      if (data.user?.rank) {
        setUserRank(data.user.rank);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchCreatedBounties = async () => {
    if (!walletAddress) return;

    try {
      setIsLoadingBounties(true);

      // Get user ID first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single();

      if (userError || !userData) {
        console.error('User not found:', userError);
        setCreatedBounties([]);
        return;
      }

      // Fetch bounties created by this user
      const { data, error } = await supabase
        .from('bounties')
        .select(`
          *,
          creator:users!creator_id (
            id,
            wallet_address,
            username,
            display_name
          )
        `)
        .eq('creator_id', userData.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching created bounties:', error);
        setCreatedBounties([]);
        return;
      }

      setCreatedBounties(data || []);
    } catch (error) {
      console.error('Error in fetchCreatedBounties:', error);
      setCreatedBounties([]);
    } finally {
      setIsLoadingBounties(false);
    }
  };

  const fetchParticipatedBounties = async () => {
    if (!walletAddress) return;

    try {
      const participations = await getUserParticipations(walletAddress);
      setParticipatedBounties(participations || []);
    } catch (error) {
      console.error('Error fetching participated bounties:', error);
      setParticipatedBounties([]);
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

  const fetchRecentTransactions = async () => {
    if (!walletAddress) return;

    try {
      // Get user ID first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single();

      if (userError || !userData) return;

      // Fetch recent transactions for this user
      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          bounty:bounties (
            name
          )
        `)
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }

      setRecentTransactions(data || []);
    } catch (error) {
      console.error('Error in fetchRecentTransactions:', error);
    }
  };

  const handleClaimRefund = async (bountyId: string) => {
    if (!walletAddress) return;

    setRefundingBountyId(bountyId);
    try {
      const result = await refundBounty(bountyId);

      if (result.success) {
        alert(`Refund successful! Transaction: ${result.transactionHash}`);

        // Refresh wallet balance after refund
        console.log('💰 Refreshing balance after refund...');
        await refreshBalance();

        // Refresh expired bounties list
        await fetchExpiredBounties();
      }
    } catch (error) {
      console.error('Refund failed:', error);
      alert(`Refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRefundingBountyId(null);
    }
  };

  const handleCancelBounty = async () => {
    if (!cancellingBounty || !walletAddress) return;

    try {
      const toastId = TransactionStatus.pending('Cancelling bounty...');

      // Initialize escrow service
      const { getEthersSigner } = useWallet();
      const signer = await getEthersSigner();
      await escrowService.initialize(signer);

      // Cancel bounty on smart contract
      const result = await escrowService.cancelBounty(cancellingBounty.id);

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

      // Refresh wallet balance
      await refreshBalance();

      // Close modal
      setCancellingBounty(null);

      // Refresh bounty lists
      await fetchCreatedBounties();
      await fetchExpiredBounties();
    } catch (error) {
      console.error('Cancel bounty failed:', error);
      TransactionStatus.error(error instanceof Error ? error.message : 'Failed to cancel bounty');
    }
  };

  const handleSaveName = async () => {
    if (!isConnected || !walletAddress) return;

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-d72b2276/users/${walletAddress}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          address: walletAddress,
          name: newUserName,
          stats: userStats
        }),
      });

      if (response.ok) {
        setUserName(newUserName);
        setIsEditingName(false);
      }
    } catch (error) {
      console.error('Error updating user name:', error);
    }
  };

  const handleCancelEdit = () => {
    setNewUserName(userName);
    setIsEditingName(false);
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
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary text-primary-foreground text-xl">
            {userName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <>
                <Input
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="max-w-xs"
                  placeholder="Enter your name"
                />
                <Button size="sm" onClick={handleSaveName}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <h1>{userName}</h1>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingName(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{walletAddress}</p>
          <Badge variant="secondary" className="mt-1">
            <Trophy className="h-3 w-3 mr-1" />
            Bounty Hunter
          </Badge>
        </div>
      </div> 

      <Tabs defaultValue="created" className="w-full">
        <TabsList className="flex w-full">
          <TabsTrigger value="created">Created Bounty</TabsTrigger>
          <TabsTrigger value="hunts">My Hunts</TabsTrigger>
          <TabsTrigger value="refunds" className="inline-flex items-center justify-center">
            <span>Refunds</span>
            {expiredBounties.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
                {expiredBounties.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="wallet">Wallet Balance</TabsTrigger>
        </TabsList>

        <TabsContent value="created" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3>Bounties You've Created</h3>
            <Button onClick={onCreateBounty} className="gap-2">
              <Plus className="h-4 w-4" />
              Create New Bounty
            </Button>
          </div>

          {isLoadingBounties ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : createdBounties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>You haven't created any bounties yet.</p>
              <Button onClick={onCreateBounty} variant="outline" className="mt-4">
                Create Your First Bounty
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {createdBounties.map((bounty) => (
                <Card key={bounty.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{bounty.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{bounty.bounty_type}</Badge>
                          <Badge variant={bounty.status === 'active' ? 'default' : 'secondary'}>
                            {bounty.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {bounty.participant_count || 0} participants
                          </span>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="font-semibold">{bounty.prize_amount} {bounty.prize_currency}</div>
                        {bounty.status === 'active' && (!bounty.participant_count || bounty.participant_count === 0) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setCancellingBounty(bounty)}
                          >
                            Cancel Bounty
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Cancel Bounty Modal */}
          <CancelBountyModal
            isOpen={!!cancellingBounty}
            onClose={() => setCancellingBounty(null)}
            bounty={cancellingBounty as any}
            onConfirm={handleCancelBounty}
          />
        </TabsContent>

        <TabsContent value="hunts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3>Bounties You've Joined</h3>
            <Button variant="outline" className="gap-2">
              <Target className="h-4 w-4" />
              Join New Bounty
            </Button>
          </div>

          {participatedBounties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>You haven't joined any bounties yet.</p>
              <p className="text-sm mt-2">Visit the Bounty Hunt to find and join exciting challenges!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {participatedBounties.map((participation: any) => {
                const bounty = participation.bounty;
                const isWinner = participation.is_winner;
                const isCompleted = participation.status === 'completed';

                return (
                  <Card key={participation.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">{bounty.name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{bounty.bounty_type}</Badge>
                            <Badge variant={bounty.status === 'completed' ? 'secondary' : 'default'}>
                              {bounty.status === 'completed' ? (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  Ended
                                </>
                              ) : (
                                'Ongoing'
                              )}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Attempts: {participation.total_attempts} | Words: {participation.words_completed}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="font-semibold">{bounty.prize_amount} {bounty.prize_currency}</div>
                          {isCompleted && (
                            <Badge
                              variant={isWinner ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {isWinner ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Won
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Completed
                                </>
                              )}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

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
                  <span className="text-sm">{refundError}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <h3>Performance Statistics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Bounty Created
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.totalBountyCreated}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Bounty Entered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.totalBountyEntered}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Tries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.totalTries}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Wins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{userStats.totalWins}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Losses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{userStats.totalLosses}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-1">
                  {userStats.successRate}%
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="p-6 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-2 text-primary" />
              <h4 className="font-medium mb-1">Current Rank</h4>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {userRank}
              </Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet" className="space-y-4">
          <h3>Wallet Balance</h3>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Wallet className="h-16 w-16 mx-auto text-primary" />
                  <div className="text-3xl font-bold">{balance || '0'} HBAR</div>
                  <p className="text-muted-foreground">Available Balance</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button className="h-12">
              Add Funds
            </Button>
            <Button variant="outline" className="h-12">
              Withdraw
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No transactions yet
                </p>
              ) : (
                recentTransactions.map((tx: any) => (
                  <TransactionItem key={tx.id} tx={tx} />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}