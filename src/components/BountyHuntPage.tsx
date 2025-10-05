import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BountyCard } from './BountyCard';
import { Grid, List, Search, Filter, Loader2 } from 'lucide-react';
import { useBounties } from '../utils/supabase/hooks';

export type BountyType = 'All' | 'Simple' | 'Multistage' | 'Time-based' | 'Random words' | 'Limited trials';
export type SortOption = 'price-high' | 'price-low' | 'ending-soon' | 'latest';
export type BountyMode = 'All' | 'No Price' | 'With Price';

export interface Bounty {
  id: string;
  name: string;
  prize: string;
  type: Exclude<BountyType, 'All'>;
  participants: number;
  endTime: Date;
  createdAt: Date;
  creator: string;
  status: 'active' | 'ended';
  result?: 'accomplished' | 'failed';
  words: string[];
  description?: string;
  hints: string[];
  shareableLink?: string;
}

// Mock bounty data for fallback
const mockBounties: Bounty[] = [
  {
    id: '1',
    name: 'Daily Word Challenge',
    prize: '50 HBAR',
    type: 'Simple' as const,
    participants: 24,
    endTime: new Date(Date.now() + 86400000), // 24 hours from now
    createdAt: new Date(Date.now() - 86400000), // 1 day ago
    creator: 'WordMaster',
    status: 'active' as const,
    words: ['PUZZLE'],
    hints: ['A challenging game or problem']
  },
  {
    id: '2',
    name: 'Speed Demon',
    prize: '100 HBAR',
    type: 'Time-based' as const,
    participants: 15,
    endTime: new Date(Date.now() + 43200000), // 12 hours from now
    createdAt: new Date(Date.now() - 43200000), // 12 hours ago
    creator: 'QuickSolver',
    status: 'active' as const,
    words: ['SPEED'],
    hints: ['Moving very fast']
  },
  {
    id: '3',
    name: 'Triple Threat',
    prize: '200 HBAR',
    type: 'Multistage' as const,
    participants: 8,
    endTime: new Date(Date.now() + 172800000), // 48 hours from now
    createdAt: new Date(Date.now() - 172800000), // 2 days ago
    creator: 'PuzzlePro',
    status: 'active' as const,
    words: ['TRIPLE', 'THREAT', 'MASTER'],
    hints: ['Three times', 'A danger', 'Expert level']
  },
  {
    id: '4',
    name: 'Mystery Words',
    prize: '75 HBAR',
    type: 'Random words' as const,
    participants: 18,
    endTime: new Date(Date.now() + 259200000), // 72 hours from now
    createdAt: new Date(Date.now() - 3600000), // 1 hour ago
    creator: 'RandomGen',
    status: 'active' as const,
    words: ['MYSTERY'],
    hints: ['Something unknown']
  }
];

const userBounties: Bounty[] = [
  {
    id: '5',
    name: 'My First Challenge',
    prize: '25 HBAR',
    type: 'Simple' as const,
    participants: 5,
    endTime: new Date(Date.now() + 86400000),
    createdAt: new Date(Date.now() - 7200000), // 2 hours ago
    creator: 'You',
    status: 'active' as const,
    words: ['FIRST'],
    hints: ['The beginning']
  },
  {
    id: '6',
    name: 'Speed Test',
    prize: '0 HBAR',
    type: 'Time-based' as const,
    participants: 12,
    endTime: new Date(Date.now() - 86400000), // Ended
    createdAt: new Date(Date.now() - 172800000), // 2 days ago
    creator: 'SpeedRunner',
    status: 'ended' as const,
    result: 'accomplished' as const,
    words: ['SPEED'],
    hints: ['How fast you move']
  }
];

interface BountyHuntPageProps {
  onNavigateToGameplay?: (bountyId: string) => void;
}

export function BountyHuntPage({ onNavigateToGameplay }: BountyHuntPageProps = {}) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [bountyTypeFilter, setBountyTypeFilter] = useState<BountyType>('All');
  const [bountyModeFilter, setBountyModeFilter] = useState<BountyMode>('All');
  // Fetch bounties from Supabase using custom hook
  const { data: bounties, loading, error: apiError, refetch } = useBounties({
    status: 'active',
    bounty_type: bountyTypeFilter === 'All' ? undefined : bountyTypeFilter,
    limit: 50
  });

  const handleJoinSuccess = () => {
    // Refetch bounties to update participant counts
    refetch();
  };

  const handlePlayBounty = (bountyId: string) => {
    onNavigateToGameplay?.(bountyId);
  };

  const filteredBounties = bounties.filter(bounty => {
    if (!bounty || !bounty.name) return false;
    const matchesSearch = bounty.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = bountyTypeFilter === 'All' || bounty.bounty_type === bountyTypeFilter;
    return matchesSearch && matchesType;
  }).sort((a, b) => {
    try {
      switch (sortBy) {
        case 'price-high':
          return (b.prize_amount || 0) - (a.prize_amount || 0);
        case 'price-low':
          return (a.prize_amount || 0) - (b.prize_amount || 0);
        case 'ending-soon':
          return new Date(a.end_time || '').getTime() - new Date(b.end_time || '').getTime();
        case 'latest':
        default:
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
      }
    } catch (error) {
      console.warn('Error sorting bounties:', error);
      return 0;
    }
  }).map(bounty => ({
    ...bounty,
    id: bounty.id,
    name: bounty.name,
    prize: `${bounty.prize_amount} ${bounty.prize_currency || 'HBAR'}`,
    type: bounty.bounty_type,
    participants: bounty.participant_count,
    endTime: new Date(bounty.end_time || Date.now() + 86400000),
    createdAt: new Date(bounty.created_at || Date.now()),
    creator: bounty.creator?.display_name || bounty.creator?.username || 'Unknown',
    status: bounty.status as 'active' | 'ended',
    words: bounty.words || [],
    hints: bounty.hints || [],
    description: bounty.description
  }));

  const filteredUserBounties = userBounties.filter(bounty => {
    const matchesSearch = bounty.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = bountyTypeFilter === 'All' || bounty.type === bountyTypeFilter;
    const matchesMode = bountyModeFilter === 'All' || 
      (bountyModeFilter === 'No Price' && bounty.prize === '0 HBAR') ||
      (bountyModeFilter === 'With Price' && bounty.prize !== '0 HBAR');
    return matchesSearch && matchesType && matchesMode;
  }).sort((a, b) => {
    try {
      switch (sortBy) {
        case 'price-high':
          return parseInt(b.prize?.replace(' HBAR', '') || '0') - parseInt(a.prize?.replace(' HBAR', '') || '0');
        case 'price-low':
          return parseInt(a.prize?.replace(' HBAR', '') || '0') - parseInt(b.prize?.replace(' HBAR', '') || '0');
        case 'ending-soon':
          return (a.endTime?.getTime() || 0) - (b.endTime?.getTime() || 0);
        case 'latest':
        default:
          return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
      }
    } catch (error) {
      console.warn('Error sorting user bounties:', error);
      return 0;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>Bounty Hunt</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bounties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              <SelectItem value="price-high">Price High-Low</SelectItem>
              <SelectItem value="price-low">Price Low-High</SelectItem>
              <SelectItem value="ending-soon">Ending Soon</SelectItem>
            </SelectContent>
          </Select>

          <Select value={bountyTypeFilter} onValueChange={(value) => setBountyTypeFilter(value as BountyType)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Bounty Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              <SelectItem value="Simple">Simple</SelectItem>
              <SelectItem value="Multistage">Multistage</SelectItem>
              <SelectItem value="Time-based">Time-based</SelectItem>
              <SelectItem value="Random words">Random words</SelectItem>
              <SelectItem value="Limited trials">Limited trials</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="bounty" className="w-full">
        <TabsList>
          <TabsTrigger value="bounty">Bounty</TabsTrigger>
          <TabsTrigger value="bountiless">Bountiless Bounty</TabsTrigger>
          <TabsTrigger value="your-hunt">Your Hunt</TabsTrigger>
        </TabsList>

        <TabsContent value="bounty" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading bounties...</span>
            </div>
          ) : apiError ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Failed to load live bounties</p>
              <p className="text-sm text-muted-foreground">Showing demo data instead</p>
            </div>
          ) : bounties.length === 0 && !loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No bounties found matching your criteria</p>
            </div>
          ) : null}
          
          {!loading && (
            <div className={`
              ${viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                : 'space-y-4'
              }
            `}>
              {filteredBounties.map((bounty) => (
                <BountyCard
                  key={bounty.id}
                  bounty={bounty}
                  viewMode={viewMode}
                  onJoinSuccess={handleJoinSuccess}
                  onPlayBounty={handlePlayBounty}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bountiless" className="space-y-4">
          <div className={`
            ${viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
              : 'space-y-4'
            }
          `}>
            {filteredBounties.filter(b => b.prize === '0 HBAR').map((bounty) => (
              <BountyCard
                key={bounty.id}
                bounty={bounty}
                viewMode={viewMode}
                onJoinSuccess={handleJoinSuccess}
                onPlayBounty={handlePlayBounty}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="your-hunt" className="space-y-4">
          <div className="flex justify-end">
            <Select value={bountyModeFilter} onValueChange={(value) => setBountyModeFilter(value as BountyMode)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Bounty Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="No Price">No Price</SelectItem>
                <SelectItem value="With Price">With Price</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className={`
            ${viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
              : 'space-y-4'
            }
          `}>
            {filteredUserBounties.map((bounty) => (
              <BountyCard
                key={bounty.id}
                bounty={bounty}
                viewMode={viewMode}
                isUserBounty={true}
                onJoinSuccess={handleJoinSuccess}
                onPlayBounty={handlePlayBounty}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}