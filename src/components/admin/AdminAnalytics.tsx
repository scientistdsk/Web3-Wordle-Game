import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  Activity,
  Trophy,
  XCircle,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { escrowService } from '../../contracts/EscrowService';

interface AnalyticsData {
  totalBounties: number;
  activeBounties: number;
  completedBounties: number;
  cancelledBounties: number;
  totalUsers: number;
  totalTransactions: number;
  totalHbarLocked: number;
  totalFeesCollected: number;
  averageBountySize: number;
  popularBountyType: string;
}

export function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalBounties: 0,
    activeBounties: 0,
    completedBounties: 0,
    cancelledBounties: 0,
    totalUsers: 0,
    totalTransactions: 0,
    totalHbarLocked: 0,
    totalFeesCollected: 0,
    averageBountySize: 0,
    popularBountyType: 'Simple',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch bounty stats
      const { data: bountiesData } = await supabase
        .from('bounties')
        .select('status, prize_amount, bounty_type');

      // Fetch user count
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Fetch transaction count
      const { count: transactionCount } = await supabase
        .from('payment_transactions')
        .select('*', { count: 'exact', head: true });

      // Calculate bounty stats
      const totalBounties = bountiesData?.length || 0;
      const activeBounties = bountiesData?.filter(b => b.status === 'active').length || 0;
      const completedBounties = bountiesData?.filter(b => b.status === 'completed').length || 0;
      const cancelledBounties = bountiesData?.filter(b => b.status === 'cancelled').length || 0;

      // Calculate HBAR locked (active bounties)
      const totalHbarLocked = bountiesData
        ?.filter(b => b.status === 'active')
        .reduce((sum, b) => sum + parseFloat(b.prize_amount), 0) || 0;

      // Calculate average bounty size
      const averageBountySize = totalBounties > 0
        ? bountiesData.reduce((sum, b) => sum + parseFloat(b.prize_amount), 0) / totalBounties
        : 0;

      // Find most popular bounty type
      const bountyTypeCounts: Record<string, number> = {};
      bountiesData?.forEach(b => {
        bountyTypeCounts[b.bounty_type] = (bountyTypeCounts[b.bounty_type] || 0) + 1;
      });
      const popularBountyType = Object.keys(bountyTypeCounts).reduce((a, b) =>
        bountyTypeCounts[a] > bountyTypeCounts[b] ? a : b, 'Simple'
      );

      // Get fees from contract
      let totalFeesCollected = 0;
      try {
        const contract = escrowService.getContract();
        if (contract) {
          const fees = await contract.accumulatedFees();
          totalFeesCollected = parseFloat(fees.toString()) / 1e8; // Convert from tinybars
        }
      } catch (error) {
        console.error('Error fetching fees:', error);
      }

      setAnalytics({
        totalBounties,
        activeBounties,
        completedBounties,
        cancelledBounties,
        totalUsers: userCount || 0,
        totalTransactions: transactionCount || 0,
        totalHbarLocked,
        totalFeesCollected,
        averageBountySize,
        popularBountyType,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      icon: Target,
      label: 'Total Bounties',
      value: analytics.totalBounties,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Activity,
      label: 'Active Bounties',
      value: analytics.activeBounties,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: CheckCircle,
      label: 'Completed',
      value: analytics.completedBounties,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
    },
    {
      icon: XCircle,
      label: 'Cancelled',
      value: analytics.cancelledBounties,
      color: 'text-red-600',
      bgColor: 'bg-red-500/10',
    },
    {
      icon: Users,
      label: 'Total Users',
      value: analytics.totalUsers,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-500/10',
    },
    {
      icon: TrendingUp,
      label: 'Transactions',
      value: analytics.totalTransactions,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
    },
    {
      icon: DollarSign,
      label: 'HBAR Locked',
      value: `${analytics.totalHbarLocked.toFixed(2)} ℏ`,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
    },
    {
      icon: Trophy,
      label: 'Fees Collected',
      value: `${analytics.totalFeesCollected.toFixed(2)} ℏ`,
      color: 'text-pink-600',
      bgColor: 'bg-pink-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Platform Analytics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className={`flex flex-col gap-2 p-4 rounded-lg border border-border ${stat.bgColor} transition-all hover:scale-105`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-full ${stat.bgColor}`}>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                      {stat.label}
                    </span>
                  </div>
                  <div className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Average Bounty Size</p>
              <p className="text-xl font-bold">{analytics.averageBountySize.toFixed(2)} HBAR</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Most Popular Type</p>
              <p className="text-xl font-bold">{analytics.popularBountyType}</p>
            </div>
          </div>

          {/* Platform Health */}
          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Platform Health</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completion Rate</span>
                <span className="font-medium">
                  {analytics.totalBounties > 0
                    ? ((analytics.completedBounties / analytics.totalBounties) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-600"
                  style={{
                    width: `${analytics.totalBounties > 0
                      ? (analytics.completedBounties / analytics.totalBounties) * 100
                      : 0}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-sm pt-2">
                <span className="text-muted-foreground">Cancellation Rate</span>
                <span className="font-medium">
                  {analytics.totalBounties > 0
                    ? ((analytics.cancelledBounties / analytics.totalBounties) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-red-600"
                  style={{
                    width: `${analytics.totalBounties > 0
                      ? (analytics.cancelledBounties / analytics.totalBounties) * 100
                      : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
