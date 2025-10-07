import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Trophy, Target, TrendingUp, Coins, Award, Percent } from 'lucide-react';

interface UserStats {
  total_bounties_created: number;
  total_bounties_participated: number;
  total_bounties_won: number;
  total_prize_money_earned: number;
  total_prize_money_spent: number;
  win_rate: number;
  average_attempts: number;
  best_word_length: number;
}

interface StatsCardProps {
  stats: UserStats;
  loading?: boolean;
}

export function StatsCard({ stats, loading }: StatsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statItems = [
    {
      icon: Target,
      label: 'Bounties Created',
      value: stats.total_bounties_created,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Trophy,
      label: 'Bounties Participated',
      value: stats.total_bounties_participated,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
    },
    {
      icon: Award,
      label: 'Bounties Won',
      value: stats.total_bounties_won,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: Percent,
      label: 'Win Rate',
      value: `${stats.win_rate.toFixed(1)}%`,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
    },
    {
      icon: Coins,
      label: 'Total Earned',
      value: `${stats.total_prize_money_earned.toFixed(2)} HBAR`,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
    },
    {
      icon: Coins,
      label: 'Total Spent',
      value: `${stats.total_prize_money_spent.toFixed(2)} HBAR`,
      color: 'text-red-600',
      bgColor: 'bg-red-500/10',
    },
    {
      icon: TrendingUp,
      label: 'Avg Attempts',
      value: stats.average_attempts > 0 ? stats.average_attempts.toFixed(1) : '0',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-500/10',
    },
    {
      icon: Target,
      label: 'Best Word Length',
      value: stats.best_word_length > 0 ? `${stats.best_word_length} letters` : 'N/A',
      color: 'text-pink-600',
      bgColor: 'bg-pink-500/10',
    },
  ];

  // Calculate net profit
  const netProfit = stats.total_prize_money_earned - stats.total_prize_money_spent;
  const isProfitable = netProfit > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Net Profit/Loss Banner */}
        <div
          className={`p-4 rounded-lg border ${
            isProfitable
              ? 'bg-green-500/10 border-green-500/20 text-green-700'
              : netProfit < 0
              ? 'bg-red-500/10 border-red-500/20 text-red-700'
              : 'bg-muted border-border text-muted-foreground'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">Net Profit/Loss</span>
            <span className="text-lg font-bold">
              {isProfitable ? '+' : ''}
              {netProfit.toFixed(2)} HBAR
            </span>
          </div>
          <p className="text-xs mt-1 opacity-80">
            {isProfitable
              ? 'You are in profit! 🎉'
              : netProfit < 0
              ? 'Keep playing to improve your earnings'
              : 'Break even - start playing to earn!'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {statItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className={`flex flex-col gap-2 p-4 rounded-lg border border-border ${item.bgColor} transition-all hover:scale-105`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-full ${item.bgColor}`}>
                    <Icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {item.label}
                  </span>
                </div>
                <div className={`text-2xl font-bold ${item.color}`}>
                  {item.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress Bars for Visual Insight */}
        <div className="space-y-3 pt-4 border-t border-border">
          <h4 className="text-sm font-semibold text-muted-foreground">Performance Overview</h4>

          {/* Win Rate Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Win Rate</span>
              <span className="font-medium">{stats.win_rate.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all"
                style={{ width: `${Math.min(stats.win_rate, 100)}%` }}
              />
            </div>
          </div>

          {/* Participation Progress */}
          {stats.total_bounties_participated > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Wins / Participated</span>
                <span className="font-medium">
                  {stats.total_bounties_won} / {stats.total_bounties_participated}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all"
                  style={{
                    width: `${(stats.total_bounties_won / stats.total_bounties_participated) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Average Attempts (lower is better) */}
          {stats.average_attempts > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Avg Attempts (lower is better)</span>
                <span className="font-medium">{stats.average_attempts.toFixed(1)} / 6</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all"
                  style={{
                    width: `${(stats.average_attempts / 6) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Quick Insights */}
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">Quick Insights</h4>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {stats.total_bounties_created > 0 && (
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                You've created {stats.total_bounties_created} bounty{stats.total_bounties_created !== 1 ? 'ies' : 'y'}
              </li>
            )}
            {stats.total_bounties_won > 0 && (
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                You've won {stats.total_bounties_won} bounty{stats.total_bounties_won !== 1 ? 'ies' : 'y'}
              </li>
            )}
            {stats.win_rate >= 50 && stats.total_bounties_participated > 5 && (
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Great win rate! You're in the top performers
              </li>
            )}
            {netProfit > 0 && (
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                You're profitable by {netProfit.toFixed(2)} HBAR
              </li>
            )}
            {stats.average_attempts > 0 && stats.average_attempts < 4 && (
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                Excellent average attempts - you're very efficient!
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
