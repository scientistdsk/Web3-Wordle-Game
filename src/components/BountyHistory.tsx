import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Clock,
  Users,
  Trophy,
  Target,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  XCircle,
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { getTransactionUrl, getCurrentNetwork } from '../utils/hashscan';

interface Bounty {
  id: string;
  name: string;
  prize_amount: number;
  status: string;
  start_time: string;
  end_time: string;
  word_length?: number;
  max_attempts?: number;
  max_attempts_per_user?: number;
  participant_count?: number;
  transaction_hash?: string;
  winner_id?: string;
  words?: string[];
  creator?: {
    username: string;
  };
}

interface Participation {
  id: string;
  status: string;
  attempts_made: number;
  prize_won?: number;
  joined_at: string;
  bounty: Bounty;
}

interface BountyHistoryProps {
  walletAddress: string;
  onCancelBounty?: (bountyId: string) => void;
}

export function BountyHistory({ walletAddress, onCancelBounty }: BountyHistoryProps) {
  const [createdBounties, setCreatedBounties] = useState<Bounty[]>([]);
  const [participatedBounties, setParticipatedBounties] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('created');

  // Pagination for created bounties
  const [createdPage, setCreatedPage] = useState(1);
  const [createdTotalCount, setCreatedTotalCount] = useState(0);

  // Pagination for participated bounties
  const [participatedPage, setParticipatedPage] = useState(1);
  const [participatedTotalCount, setParticipatedTotalCount] = useState(0);

  const itemsPerPage = 10;

  useEffect(() => {
    if (walletAddress) {
      fetchBounties();
    }
  }, [walletAddress, createdPage, participatedPage]);

  const fetchBounties = async () => {
    setLoading(true);
    try {
      // Get user ID first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single();

      if (userError || !userData) {
        console.error('User not found:', userError);
        setCreatedBounties([]);
        setParticipatedBounties([]);
        return;
      }

      // Fetch created bounties - use participant_count field from bounties table
      const createdFrom = (createdPage - 1) * itemsPerPage;
      const createdTo = createdFrom + itemsPerPage - 1;

      const { data: created, error: createdError, count: createdCount } = await supabase
        .from('bounties')
        .select('*', { count: 'exact' })
        .eq('creator_id', userData.id)
        .order('created_at', { ascending: false })
        .range(createdFrom, createdTo);

      if (createdError) {
        console.error('Error fetching created bounties:', createdError);
      } else {
        setCreatedBounties(created || []);
        setCreatedTotalCount(createdCount || 0);
      }

      // Fetch participated bounties
      const participatedFrom = (participatedPage - 1) * itemsPerPage;
      const participatedTo = participatedFrom + itemsPerPage - 1;

      const { data: participated, error: participatedError, count: participatedCount } = await supabase
        .from('bounty_participants')
        .select(`
          *,
          bounty:bounties (
            *,
            creator:users!bounties_creator_id_fkey (
              username
            )
          )
        `, { count: 'exact' })
        .eq('user_id', userData.id)
        .order('joined_at', { ascending: false })
        .range(participatedFrom, participatedTo);

      if (participatedError) {
        console.error('Error fetching participated bounties:', participatedError);
      } else {
        setParticipatedBounties(participated || []);
        setParticipatedTotalCount(participatedCount || 0);
      }
    } catch (error) {
      console.error('Error in fetchBounties:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'expired':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'won':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'lost':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (endTime: string) => {
    return new Date(endTime) < new Date();
  };

  const canCancelBounty = (bounty: Bounty) => {
    return bounty.status === 'active' &&
           (bounty.participant_count === 0 || bounty.participant_count === undefined);
  };

  const createdTotalPages = Math.ceil(createdTotalCount / itemsPerPage);
  const participatedTotalPages = Math.ceil(participatedTotalCount / itemsPerPage);

  if (loading && createdBounties.length === 0 && participatedBounties.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bounty History</CardTitle>
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
    <Card>
      <CardHeader>
        <CardTitle>Bounty History</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="created">Created ({createdTotalCount})</TabsTrigger>
            <TabsTrigger value="participated">Participated ({participatedTotalCount})</TabsTrigger>
          </TabsList>

          {/* Created Bounties Tab */}
          <TabsContent value="created" className="space-y-4">
            {createdBounties.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No bounties created yet</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {createdBounties.map((bounty) => (
                    <div
                      key={bounty.id}
                      className="flex flex-col gap-3 p-4 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{bounty.name}</h3>
                            <Badge
                              variant="outline"
                              className={getStatusColor(bounty.status)}
                            >
                              {bounty.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Trophy className="h-3.5 w-3.5" />
                              <span>{bounty.prize_amount} HBAR</span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              <span>{bounty.participant_count || 0} players</span>
                            </div>
                            {bounty.words && bounty.words.length > 0 && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Target className="h-3.5 w-3.5" />
                                <span>{bounty.words[0].length} letters</span>
                              </div>
                            )}
                            {bounty.max_attempts_per_user && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{bounty.max_attempts_per_user} attempts</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {formatDate(bounty.start_time)} - {formatDate(bounty.end_time)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:items-end gap-2">
                          {bounty.transaction_hash && (
                            <a
                              href={getTransactionUrl(bounty.transaction_hash, getCurrentNetwork())}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              View on HashScan
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}

                          {canCancelBounty(bounty) && onCancelBounty && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onCancelBounty(bounty.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Cancel Bounty
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {createdTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                    <div className="text-sm text-muted-foreground">
                      Showing {(createdPage - 1) * itemsPerPage + 1} to{' '}
                      {Math.min(createdPage * itemsPerPage, createdTotalCount)} of {createdTotalCount} bounties
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCreatedPage((p) => Math.max(1, p - 1))}
                        disabled={createdPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="text-sm font-medium">
                        Page {createdPage} of {createdTotalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCreatedPage((p) => Math.min(createdTotalPages, p + 1))}
                        disabled={createdPage === createdTotalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Participated Bounties Tab */}
          <TabsContent value="participated" className="space-y-4">
            {participatedBounties.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No bounties participated in yet</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {participatedBounties.map((participation) => {
                    const bounty = participation.bounty as any;
                    const isWinner = participation.status === 'won';

                    return (
                      <div
                        key={participation.id}
                        className="flex flex-col gap-3 p-4 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{bounty.name}</h3>
                              <Badge
                                variant="outline"
                                className={getStatusColor(participation.status)}
                              >
                                {participation.status}
                              </Badge>
                            </div>

                            <div className="text-sm text-muted-foreground">
                              Created by {bounty.creator?.username || 'Unknown'}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Trophy className="h-3.5 w-3.5" />
                                <span>{bounty.prize_amount} HBAR</span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Target className="h-3.5 w-3.5" />
                                <span>{participation.attempts_made} attempts</span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(participation.joined_at)}</span>
                              </div>
                              {isWinner && participation.prize_won && (
                                <div className="flex items-center gap-1 text-purple-600 font-semibold">
                                  <Trophy className="h-3.5 w-3.5" />
                                  <span>Won {participation.prize_won} HBAR</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col sm:items-end gap-2">
                            {bounty.transaction_hash && (
                              <a
                                href={getTransactionUrl(bounty.transaction_hash, getCurrentNetwork())}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                View on HashScan
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {participatedTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                    <div className="text-sm text-muted-foreground">
                      Showing {(participatedPage - 1) * itemsPerPage + 1} to{' '}
                      {Math.min(participatedPage * itemsPerPage, participatedTotalCount)} of {participatedTotalCount} bounties
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setParticipatedPage((p) => Math.max(1, p - 1))}
                        disabled={participatedPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="text-sm font-medium">
                        Page {participatedPage} of {participatedTotalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setParticipatedPage((p) => Math.min(participatedTotalPages, p + 1))}
                        disabled={participatedPage === participatedTotalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
