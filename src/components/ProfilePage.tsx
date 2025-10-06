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
  DollarSign
} from 'lucide-react';
import { useRefundBounty } from '../utils/payment/payment-hooks';
import { getBounties } from '../utils/supabase/api';

interface ProfilePageProps {
  onCreateBounty: () => void;
}

// Mock user data
const userData = {
  name: 'WordMaster',
  rank: 'Expert Hunter',
  stats: {
    totalBountyCreated: 12,
    totalBountyEntered: 34,
    totalTries: 156,
    totalWins: 28,
    totalLosses: 6,
    successRate: 82.4
  },
  walletBalance: '450.75 HBAR'
};

const createdBounties = [
  {
    id: '1',
    name: 'Daily Word Challenge',
    prize: '50 HBAR',
    hunters: 24,
    type: 'Simple'
  },
  {
    id: '2',
    name: 'Speed Master',
    prize: '100 HBAR',
    hunters: 15,
    type: 'Time-based'
  },
  {
    id: '3',
    name: 'Triple Threat',
    prize: '200 HBAR',
    hunters: 8,
    type: 'Multistage'
  }
];

const participatedBounties = [
  {
    id: '1',
    name: 'Morning Challenge',
    type: 'Simple',
    prize: '25 HBAR',
    status: 'Ended',
    result: 'Accomplished'
  },
  {
    id: '2',
    name: 'Speed Test',
    type: 'Time-based',
    prize: '75 HBAR',
    status: 'Ongoing',
    result: 'Pending'
  },
  {
    id: '3',
    name: 'Word Expert',
    type: 'Multistage',
    prize: '150 HBAR',
    status: 'Ended',
    result: 'Failed'
  }
];

export function ProfilePage({ onCreateBounty }: ProfilePageProps) {
  const { isConnected, walletAddress, userName, updateUserName, refreshBalance } = useWallet();
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
  const [expiredBounties, setExpiredBounties] = useState<any[]>([]);
  const [refundingBountyId, setRefundingBountyId] = useState<string | null>(null);
  const { refundBounty, loading: refundLoading, error: refundError } = useRefundBounty();

  useEffect(() => {
    if (isConnected && walletAddress) {
      fetchUserData();
      fetchExpiredBounties();
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
    } catch (error) {
      console.error('Error fetching user data:', error);
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
        updateUserName(newUserName);
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
        <TabsList className="grid w-full grid-cols-5">
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

          <div className="space-y-3">
            {createdBounties.map((bounty) => (
              <Card key={bounty.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium">{bounty.name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{bounty.type}</Badge>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {bounty.hunters} hunters
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{bounty.prize}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="hunts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3>Bounties You've Joined</h3>
            <Button variant="outline" className="gap-2">
              <Target className="h-4 w-4" />
              Join New Bounty
            </Button>
          </div>

          <div className="space-y-3">
            {participatedBounties.map((bounty) => (
              <Card key={bounty.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium">{bounty.name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{bounty.type}</Badge>
                        <Badge variant={bounty.status === 'Ended' ? 'secondary' : 'default'}>
                          {bounty.status === 'Ended' ? (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              Ended
                            </>
                          ) : (
                            'Ongoing'
                          )}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="font-semibold">{bounty.prize}</div>
                      {bounty.status === 'Ended' && (
                        <Badge 
                          variant={bounty.result === 'Accomplished' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {bounty.result === 'Accomplished' ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Accomplished
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Failed
                            </>
                          )}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
                <div className="text-2xl font-bold">{userData.stats.totalBountyCreated}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Bounty Entered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userData.stats.totalBountyEntered}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Tries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userData.stats.totalTries}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Wins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{userData.stats.totalWins}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Losses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{userData.stats.totalLosses}</div>
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
                  {userData.stats.successRate}%
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
                {userData.rank}
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
                  <div className="text-3xl font-bold">{userData.walletBalance}</div>
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
              <div className="flex justify-between items-center">
                <span className="text-sm">Bounty Win - "Daily Challenge"</span>
                <span className="text-sm font-medium text-green-600">+50 HBAR</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Created Bounty - "Speed Master"</span>
                <span className="text-sm font-medium text-red-600">-100 HBAR</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Bounty Win - "Word Expert"</span>
                <span className="text-sm font-medium text-green-600">+200 HBAR</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}