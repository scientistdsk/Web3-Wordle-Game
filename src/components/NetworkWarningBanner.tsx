import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { AlertCircle, Network } from 'lucide-react';
import { useWallet } from './WalletContext';

export function NetworkWarningBanner() {
  const { networkId, isCorrectNetwork, switchNetwork } = useWallet();

  const expectedNetwork = import.meta.env.VITE_HEDERA_NETWORK === 'mainnet' ? 'Hedera Mainnet' : 'Hedera Testnet';
  const expectedChainId = import.meta.env.VITE_HEDERA_NETWORK === 'mainnet' ? 295 : 296;

  const getNetworkName = (chainId: number | null) => {
    if (!chainId) return 'Unknown';
    switch (chainId) {
      case 295:
        return 'Hedera Mainnet';
      case 296:
        return 'Hedera Testnet';
      case 1:
        return 'Ethereum Mainnet';
      case 5:
        return 'Goerli Testnet';
      default:
        return `Network ${chainId}`;
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      await switchNetwork(expectedChainId);
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  // Don't show banner if on correct network or not connected
  if (isCorrectNetwork || !networkId) {
    return null;
  }

  return (
    <Alert variant="destructive" className="border-2">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Network className="h-4 w-4" />
          <span>
            You're on <strong>{getNetworkName(networkId)}</strong>.
            Please switch to <strong>{expectedNetwork}</strong> to use this app.
          </span>
        </div>
        <Button
          onClick={handleSwitchNetwork}
          variant="secondary"
          size="sm"
          className="shrink-0"
        >
          Switch to {expectedNetwork}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
