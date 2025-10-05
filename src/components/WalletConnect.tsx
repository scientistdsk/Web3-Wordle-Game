import React from 'react';
import { useWallet } from './WalletContext';
import { Button } from './ui/button';
import { Wallet, LogOut, AlertCircle } from 'lucide-react';

export function WalletConnect() {
  const { isConnected, walletAddress, balance, isCorrectNetwork, connect, disconnect, networkId } = useWallet();

  // Format wallet address for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Handle connect/disconnect
  const handleClick = async () => {
    try {
      console.log('Button clicked, isConnected:', isConnected);
      if (isConnected) {
        await disconnect();
      } else {
        console.log('Calling connect...');
        await connect();
      }
    } catch (error) {
      console.error('Error in handleClick:', error);
    }
  };

  if (!isConnected) {
    return (
      <Button
        onClick={handleClick}
        className="w-full justify-start gap-3 bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Wallet className="h-5 w-5" />
        <span>Connect Wallet</span>
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      {/* Wallet Info Card */}
      <div className="bg-sidebar-accent rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-sidebar-accent-foreground" />
            <span className="text-sm font-medium text-sidebar-accent-foreground">
              {formatAddress(walletAddress || '')}
            </span>
          </div>
        </div>

        {/* Balance */}
        {balance && (
          <div className="text-xs text-sidebar-accent-foreground/70">
            Balance: <span className="font-semibold">{balance} HBAR</span>
          </div>
        )}

        {/* Network Warning */}
        {!isCorrectNetwork && (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            <span>Wrong network (expected {networkId === 295 ? 'mainnet' : 'testnet'})</span>
          </div>
        )}
      </div>

      {/* Disconnect Button */}
      <Button
        onClick={handleClick}
        variant="ghost"
        className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
      >
        <LogOut className="h-5 w-5" />
        <span>Disconnect</span>
      </Button>
    </div>
  );
}
