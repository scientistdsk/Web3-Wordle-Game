import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useWallet } from './WalletContext';
import { useJoinBounty } from '../utils/supabase/hooks';
import * as api from '../utils/supabase/api';
import { 
  Target, 
  Trophy, 
  Clock, 
  Shuffle, 
  Shield, 
  Users,
  Timer,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface Bounty {
  id: string;
  name: string;
  prize: string;
  type: 'Simple' | 'Multistage' | 'Time-based' | 'Random words' | 'Limited trials';
  participants: number;
  endTime: Date;
  creator: string;
  status: 'active' | 'ongoing' | 'ended';
  result?: 'pending' | 'accomplished' | 'failed';
}

interface BountyCardProps {
  bounty: Bounty;
  viewMode: 'grid' | 'list';
  isUserBounty?: boolean;
  onJoinSuccess?: () => void;
  onPlayBounty?: (bountyId: string) => void;
}

const typeIcons = {
  'Simple': Target,
  'Multistage': Trophy,
  'Time-based': Clock,
  'Random words': Shuffle,
  'Limited trials': Shield
};

const typeColors = {
  'Simple': 'bg-blue-100 text-blue-700',
  'Multistage': 'bg-purple-100 text-purple-700',
  'Time-based': 'bg-orange-100 text-orange-700',
  'Random words': 'bg-green-100 text-green-700',
  'Limited trials': 'bg-red-100 text-red-700'
};

export function BountyCard({ bounty, viewMode, isUserBounty = false, onJoinSuccess, onPlayBounty }: BountyCardProps) {
  const { isConnected, walletAddress } = useWallet();
  const { joinBounty, loading: isJoining, error: joinError } = useJoinBounty();
  const [hasJoined, setHasJoined] = useState(false);
  const [checkingParticipation, setCheckingParticipation] = useState(false);

  // Check for existing participation when component mounts or wallet changes
  useEffect(() => {
    const checkExistingParticipation = async () => {
      if (!walletAddress || !isConnected) {
        setHasJoined(false);
        return;
      }

      try {
        setCheckingParticipation(true);
        console.log('🔍 Checking existing participation for:', { bountyId: bounty.id, walletAddress });

        const participations = await api.getUserParticipations(walletAddress);
        const existingParticipation = participations.find(p => p.bounty_id === bounty.id);

        if (existingParticipation) {
          console.log('✅ Found existing participation:', existingParticipation.id);
          setHasJoined(true);
        } else {
          console.log('✅ No existing participation found');
          setHasJoined(false);
        }
      } catch (error) {
        console.error('❌ Error checking participation:', error);
        setHasJoined(false);
      } finally {
        setCheckingParticipation(false);
      }
    };

    checkExistingParticipation();
  }, [bounty.id, walletAddress, isConnected]);

  // Debug logging
  console.log('🔍 BountyCard render:', {
    bountyId: bounty.id,
    bountyName: bounty.name,
    hasJoined,
    isUserBounty,
    walletAddress,
    isConnected,
    checkingParticipation
  });
  // Safety check for bounty data
  if (!bounty || !bounty.endTime || !bounty.name) {
    return null;
  }

  const Icon = typeIcons[bounty.type];
  const timeLeft = bounty.endTime.getTime() - Date.now();
  const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
  
  const handleJoinBounty = async () => {
    console.log('🔍 handleJoinBounty called:', { bountyId: bounty.id, walletAddress, isConnected });

    if (!isConnected || !walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      console.log('🔍 Calling joinBounty API...');
      const participationId = await joinBounty(bounty.id, walletAddress);
      console.log('✅ joinBounty successful, participation ID:', participationId);

      // Set hasJoined to true immediately
      setHasJoined(true);
      console.log('✅ hasJoined state set to true');

      // Call success callback but don't let it reset our state
      onJoinSuccess?.();
      console.log('✅ onJoinSuccess callback called');

      // Show success message
      alert('Successfully joined the bounty! You can now play.');
    } catch (error) {
      console.error('❌ Failed to join bounty:', error);
      alert(error instanceof Error ? error.message : 'Failed to join bounty');
    }
  };

  const handlePlayBounty = () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    onPlayBounty?.(bounty.id);
  };

  const renderActionButton = (size: 'sm' | 'default') => {
    const buttonClass = size === 'sm' ? '' : 'w-full';

    if (bounty.status === 'ended') {
      return (
        <Button size={size} className={buttonClass} disabled>
          Ended
        </Button>
      );
    }

    if (isUserBounty) {
      return (
        <Button size={size} className={buttonClass} onClick={handlePlayBounty}>
          Continue
        </Button>
      );
    }

    if (hasJoined) {
      return (
        <Button size={size} className={buttonClass} onClick={handlePlayBounty}>
          Play Now
        </Button>
      );
    }

    return (
      <Button
        size={size}
        className={buttonClass}
        onClick={handleJoinBounty}
        disabled={isJoining || checkingParticipation}
      >
        {checkingParticipation ? 'Checking...' : isJoining ? 'Joining...' : 'Join Bounty'}
      </Button>
    );
  };

  const getStatusBadge = () => {
    if (isUserBounty) {
      if (bounty.status === 'ended') {
        return (
          <Badge variant={bounty.result === 'accomplished' ? 'default' : 'destructive'}>
            {bounty.result === 'accomplished' ? (
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
        );
      }
      return <Badge variant="secondary">Ongoing</Badge>;
    }
    return null;
  };

  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className={typeColors[bounty.type]}>
                  <Icon className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-1">
                <h3 className="font-medium">{bounty.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{bounty.type}</Badge>
                  {getStatusBadge()}
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {bounty.participants} hunters
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right space-y-2">
              <div className="font-semibold text-lg">{bounty.prize}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {hoursLeft}h left
              </div>
              {renderActionButton('sm')}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <Avatar className="h-12 w-12">
            <AvatarFallback className={typeColors[bounty.type]}>
              <Icon className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          {getStatusBadge()}
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">{bounty.name}</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{bounty.type}</Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              {bounty.participants}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Prize</span>
            <span className="font-semibold">{bounty.prize}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Time left</span>
            <span className="text-sm flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {hoursLeft}h
            </span>
          </div>
        </div>

        {renderActionButton('default')}
      </CardContent>
    </Card>
  );
}