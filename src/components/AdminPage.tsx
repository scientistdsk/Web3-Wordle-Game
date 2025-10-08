import React, { useState, useEffect } from 'react';
import { Shield, AlertCircle, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useWallet } from './WalletContext';
import { getBounties, BountyWithCreator } from '../utils/supabase/api';
import { escrowService } from '../contracts/EscrowService';
import { Card } from './ui/card';
import { CompleteBountyModal } from './CompleteBountyModal';
import { AdminAnalytics } from './admin/AdminAnalytics';
import { AdminFeeManagement } from './admin/AdminFeeManagement';
import { AdminEmergencyControls } from './admin/AdminEmergencyControls';
import { AdminUserManagement } from './admin/AdminUserManagement';
import { Button } from './ui/button';
import { Users, CheckCircle } from 'lucide-react';

export function AdminPage() {
  const { walletAddress, isConnected, getEthersSigner } = useWallet();
  const [isContractOwner, setIsContractOwner] = useState(false);
  const [isCheckingOwner, setIsCheckingOwner] = useState(true);
  const [activeBounties, setActiveBounties] = useState<BountyWithCreator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBounty, setSelectedBounty] = useState<BountyWithCreator | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // Check if connected wallet is contract owner
  useEffect(() => {
    const checkOwnership = async () => {
      if (!isConnected || !walletAddress) {
        setIsCheckingOwner(false);
        setIsContractOwner(false);
        return;
      }

      try {
        setIsCheckingOwner(true);
        const signer = await getEthersSigner();
        await escrowService.initialize(signer);

        const contract = escrowService.getContract();
        if (!contract) {
          setIsContractOwner(false);
          return;
        }

        const owner = await contract.owner();
        const isOwner = owner.toLowerCase() === walletAddress.toLowerCase();
        setIsContractOwner(isOwner);
      } catch (error) {
        console.error('Error checking contract ownership:', error);
        setIsContractOwner(false);
      } finally {
        setIsCheckingOwner(false);
      }
    };

    checkOwnership();
  }, [isConnected, walletAddress, getEthersSigner]);

  // Fetch active bounties awaiting completion
  useEffect(() => {
    const fetchActiveBounties = async () => {
      try {
        setIsLoading(true);
        const bounties = await getBounties({
          status: 'active',
          is_public: true,
        });
        setActiveBounties(bounties);
      } catch (error) {
        console.error('Error fetching bounties:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isContractOwner) {
      fetchActiveBounties();
    }
  }, [isContractOwner]);

  const handleCompleteClick = (bounty: BountyWithCreator) => {
    setSelectedBounty(bounty);
    setShowCompleteModal(true);
  };

  const handleCompletionSuccess = () => {
    setShowCompleteModal(false);
    setSelectedBounty(null);
    // Refresh bounties list
    getBounties({
      status: 'active',
      is_public: true,
    }).then(setActiveBounties);
  };

  // Loading state while checking ownership
  if (isCheckingOwner) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Checking permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not connected
  if (!isConnected || !walletAddress) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card className="p-8">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Wallet Not Connected</h3>
              <p className="text-muted-foreground mb-4">
                Please connect your wallet to access the admin dashboard.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Not contract owner
  if (!isContractOwner) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card className="p-8">
          <div className="flex items-start gap-4">
            <Shield className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground mb-2">
                Only the contract owner can access this admin dashboard.
              </p>
              <p className="text-sm text-muted-foreground">
                Your address: <code className="bg-muted px-2 py-1 rounded">{walletAddress}</code>
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Admin dashboard with tabs
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage platform, bounties, and users</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="flex w-full">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="bounties">Bounty Management</TabsTrigger>
          <TabsTrigger value="fees">Fee Management</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Controls</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <AdminAnalytics />
        </TabsContent>

        {/* Bounty Management Tab */}
        <TabsContent value="bounties" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Active Bounties</h2>

            {isLoading ? (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading bounties...</p>
              </div>
            ) : activeBounties.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active bounties found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeBounties.map((bounty) => (
                  <div
                    key={bounty.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{bounty.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {bounty.description}
                        </p>

                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{bounty.participant_count} participants</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{bounty.prize_amount} HBAR</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              Created by: {bounty.creator.display_name || bounty.creator.username ||
                              `${bounty.creator.wallet_address.slice(0, 6)}...${bounty.creator.wallet_address.slice(-4)}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => handleCompleteClick(bounty)}
                          disabled={bounty.participant_count === 0}
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Complete Bounty
                        </Button>
                        {bounty.participant_count === 0 && (
                          <p className="text-xs text-muted-foreground text-center">
                            No participants yet
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Fee Management Tab */}
        <TabsContent value="fees" className="space-y-6">
          <AdminFeeManagement />
        </TabsContent>

        {/* Emergency Controls Tab */}
        <TabsContent value="emergency" className="space-y-6">
          <AdminEmergencyControls />
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-6">
          <AdminUserManagement />
        </TabsContent>
      </Tabs>

      {/* Complete Bounty Modal */}
      {selectedBounty && (
        <CompleteBountyModal
          isOpen={showCompleteModal}
          onClose={() => {
            setShowCompleteModal(false);
            setSelectedBounty(null);
          }}
          bounty={selectedBounty}
          onSuccess={handleCompletionSuccess}
        />
      )}
    </div>
  );
}
