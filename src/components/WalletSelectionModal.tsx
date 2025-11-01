/**
 * Wallet Selection Modal Component
 *
 * Beautiful UI for selecting wallet connection method:
 * - Browser wallets (MetaMask, HashPack, Blade)
 * - WalletConnect (mobile wallets)
 * - Clear instructions and icons
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Wallet, Smartphone, AlertCircle, Check } from 'lucide-react';
import { SUPPORTED_WALLETS } from '../config/walletConfig';

interface WalletSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelectInjected: () => Promise<void>;
  onSelectWalletConnect: () => Promise<void>;
  isConnecting: boolean;
  isAppKitEnabled: boolean;
}

export function WalletSelectionModal({
  open,
  onClose,
  onSelectInjected,
  onSelectWalletConnect,
  isConnecting,
  isAppKitEnabled
}: WalletSelectionModalProps) {
  const [selectedMethod, setSelectedMethod] = React.useState<'injected' | 'walletconnect' | null>(null);

  const handleSelectInjected = async () => {
    setSelectedMethod('injected');
    try {
      await onSelectInjected();
      onClose();
    } catch (error) {
      setSelectedMethod(null);
    }
  };

  const handleSelectWalletConnect = async () => {
    setSelectedMethod('walletconnect');
    try {
      await onSelectWalletConnect();
      onClose();
    } catch (error) {
      setSelectedMethod(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Your Wallet
          </DialogTitle>
          <DialogDescription>
            Choose how you want to connect to Web3 Wordle Bounty Game
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {/* Browser Wallet Option */}
          <Card
            className={`cursor-pointer transition-all hover:border-primary ${
              selectedMethod === 'injected' ? 'border-primary bg-primary/5' : ''
            }`}
            onClick={handleSelectInjected}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">Browser Wallet</h3>
                    <Badge variant="outline" className="text-xs">
                      Recommended
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Connect with a browser extension wallet
                  </p>

                  {/* Supported Browser Wallets */}
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(SUPPORTED_WALLETS)
                      .filter(([_, wallet]) => wallet.type === 'injected')
                      .map(([key, wallet]) => (
                        <div
                          key={key}
                          className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs"
                        >
                          <span>{wallet.icon}</span>
                          <span>{wallet.name}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {selectedMethod === 'injected' && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>

              {isConnecting && selectedMethod === 'injected' && (
                <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Opening wallet...
                </div>
              )}
            </CardContent>
          </Card>

          {/* WalletConnect Option */}
          <Card
            className={`cursor-pointer transition-all ${
              isAppKitEnabled
                ? `hover:border-primary ${selectedMethod === 'walletconnect' ? 'border-primary bg-primary/5' : ''}`
                : 'opacity-50 cursor-not-allowed'
            }`}
            onClick={isAppKitEnabled ? handleSelectWalletConnect : undefined}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Smartphone className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">WalletConnect</h3>
                    {!isAppKitEnabled && (
                      <Badge variant="outline" className="text-xs text-orange-600">
                        Setup Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Scan QR code with your mobile wallet
                  </p>

                  {/* Supported Mobile Wallets */}
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs">
                      <span>📱</span>
                      <span>Trust Wallet</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs">
                      <span>🦊</span>
                      <span>MetaMask Mobile</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs">
                      <span>💙</span>
                      <span>Coinbase Wallet</span>
                    </div>
                    <div className="text-xs text-muted-foreground px-2 py-1">
                      + 300 more
                    </div>
                  </div>
                </div>

                {selectedMethod === 'walletconnect' && isAppKitEnabled && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>

              {!isAppKitEnabled && (
                <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded text-xs">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-orange-900 dark:text-orange-100 font-medium mb-1">
                        Configuration Required
                      </p>
                      <p className="text-orange-700 dark:text-orange-300">
                        Get your Project ID from{' '}
                        <a
                          href="https://cloud.reown.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-orange-900"
                        >
                          cloud.reown.com
                        </a>{' '}
                        and add VITE_REOWN_PROJECT_ID to your .env file.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isConnecting && selectedMethod === 'walletconnect' && isAppKitEnabled && (
                <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Opening WalletConnect...
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Help Text */}
        <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground mb-1">New to Web3?</p>
              <p>
                You'll need a cryptocurrency wallet to play. We recommend{' '}
                <a
                  href="https://www.hashpack.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  HashPack
                </a>{' '}
                for the best Hedera experience.
              </p>
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isConnecting}
          className="w-full mt-2"
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
