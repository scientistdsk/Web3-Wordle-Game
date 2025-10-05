import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Trophy, Medal, Award, TrendingUp, Crown, Loader2 } from 'lucide-react';
import { useLeaderboard } from '../utils/supabase/hooks';
import { getTopCreators, type TopCreator } from '../utils/supabase/api';

type LeaderboardType = 'global' | 'weekly' | 'monthly' | 'bounty-specific';

export function LeaderboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardType>('global');
  const { data: leaderboardData, loading: leaderboardLoading, error: leaderboardError } = useLeaderboard(100);
  const [creatorsData, setCreatorsData] = useState<TopCreator[]>([]);
  const [creatorsLoading, setCreatorsLoading] = useState(true);

  useEffect(() => {
    const fetchCreators = async () => {
      try {
        setCreatorsLoading(true);
        const creators = await getTopCreators(10);
        setCreatorsData(creators);
      } catch (error) {
        console.error('Failed to fetch creators:', error);
      } finally {
        setCreatorsLoading(false);
      }
    };
    fetchCreators();
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Trophy className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <Award className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getRankBadgeVariant = (rank: number) => {
    if (rank <= 3) return 'default';
    return 'secondary';
  };

  const getDisplayName = (player: any) => {
    return player.display_name || player.username || player.wallet_address?.slice(0, 8) || 'Anonymous';
  };

  const getSuccessRate = (player: any) => {
    const participated = player.bounties_participated || 0;
    const won = player.bounties_won || 0;
    return participated > 0 ? ((won / participated) * 100).toFixed(1) : '0.0';
  };

  if (leaderboardLoading || creatorsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (leaderboardError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Error loading leaderboard: {leaderboardError.message}</p>
      </div>
    );
  }

  const topPlayers = leaderboardData.slice(0, 3);
  const allPlayers = leaderboardData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Leaderboard</h1>
          <p className="text-muted-foreground">Top performers in the Wordle Bounty community</p>
        </div>

        <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as LeaderboardType)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">All Time</SelectItem>
            <SelectItem value="monthly">This Month</SelectItem>
            <SelectItem value="weekly">This Week</SelectItem>
            <SelectItem value="bounty-specific">By Bounty</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="players" className="w-full">
        <TabsList>
          <TabsTrigger value="players">Top Players</TabsTrigger>
          <TabsTrigger value="creators">Top Creators</TabsTrigger>
          <TabsTrigger value="earnings">Top Earners</TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="space-y-4">
          {/* Top 3 Showcase */}
          {topPlayers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {topPlayers.map((player, index) => (
                <Card key={player.user_id} className={`
                  ${index === 0 ? 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100' : ''}
                  ${index === 1 ? 'border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100' : ''}
                  ${index === 2 ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100' : ''}
                `}>
                  <CardContent className="p-6 text-center">
                    <div className="flex justify-center mb-3">
                      {getRankIcon(player.global_rank || index + 1)}
                    </div>
                    <Avatar className="h-16 w-16 mx-auto mb-3">
                      <AvatarFallback className="text-lg">
                        {getDisplayName(player).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold">{getDisplayName(player)}</h3>
                    <div className="text-2xl font-bold mt-2">{player.bounties_won || 0}</div>
                    <p className="text-sm text-muted-foreground">wins</p>
                    <div className="mt-3 space-y-1">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Win Rate:</span> {getSuccessRate(player)}%
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Avg:</span> {player.avg_attempts ? Number(player.avg_attempts).toFixed(1) : 'N/A'} attempts
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Full Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle>Global Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              {allPlayers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No players yet. Be the first to join a bounty!</p>
              ) : (
                <div className="space-y-3">
                  {allPlayers.map((player, index) => (
                    <div
                      key={player.user_id}
                      className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Badge variant={getRankBadgeVariant(player.global_rank || index + 1)} className="w-12 justify-center">
                          #{player.global_rank || index + 1}
                        </Badge>

                        <Avatar>
                          <AvatarFallback>
                            {getDisplayName(player).slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <h4 className="font-medium">{getDisplayName(player)}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{player.bounties_won || 0} wins</span>
                            <span>{getSuccessRate(player)}% success</span>
                            <span>{player.avg_attempts ? Number(player.avg_attempts).toFixed(1) : 'N/A'} avg attempts</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-semibold">{player.bounties_won || 0}</div>
                        <div className="text-sm text-muted-foreground">wins</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="creators" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Bounty Creators</CardTitle>
            </CardHeader>
            <CardContent>
              {creatorsData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No bounty creators yet. Create your first bounty!</p>
              ) : (
                <div className="space-y-3">
                  {creatorsData.map((creator, index) => (
                    <div
                      key={creator.user_id}
                      className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Badge variant={getRankBadgeVariant(index + 1)} className="w-12 justify-center">
                          #{index + 1}
                        </Badge>

                        <Avatar>
                          <AvatarFallback>
                            {getDisplayName(creator).slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <h4 className="font-medium">{getDisplayName(creator)}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{creator.bounties_created} bounties</span>
                            <span>{creator.total_participants} total participants</span>
                            <span>{creator.avg_participants.toFixed(1)} avg per bounty</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-semibold">{creator.total_prize_pool.toFixed(2)} HBAR</div>
                        <div className="text-sm text-muted-foreground">total prizes</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Earners</CardTitle>
            </CardHeader>
            <CardContent>
              {allPlayers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No earnings yet. Win bounties to appear here!</p>
              ) : (
                <div className="space-y-3">
                  {allPlayers.slice(0, 10).map((player, index) => (
                    <div
                      key={player.user_id}
                      className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Badge variant={getRankBadgeVariant(player.global_rank || index + 1)} className="w-12 justify-center">
                          #{player.global_rank || index + 1}
                        </Badge>

                        <Avatar>
                          <AvatarFallback>
                            {getDisplayName(player).slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <h4 className="font-medium">{getDisplayName(player)}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{player.bounties_won || 0} wins</span>
                            <TrendingUp className="h-3 w-3" />
                            <span>{getSuccessRate(player)}% success rate</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-semibold text-green-600">
                          {Number(player.total_hbar_won || 0).toFixed(2)} HBAR
                        </div>
                        <div className="text-sm text-muted-foreground">total earned</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}