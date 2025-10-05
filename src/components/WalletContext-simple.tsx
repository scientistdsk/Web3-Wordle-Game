import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BrowserProvider } from 'ethers';

// Wallet context type
interface WalletContextType {
  isConnected: boolean;
  walletAddress: string | null;
  balance: string | null;
  networkId: number | null;
  isCorrectNetwork: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: (chainId: number) => Promise<void>;
  provider: BrowserProvider | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [networkId, setNetworkId] = useState<number | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  const expectedNetwork = import.meta.env.VITE_HEDERA_NETWORK === 'mainnet' ? 295 : 296;
  const isCorrectNetwork = networkId === expectedNetwork;

  // Update wallet state
  const updateWalletState = async () => {
    if (!window.ethereum) {
      console.warn('No ethereum provider found');
      return;
    }

    try {
      const ethersProvider = new BrowserProvider(window.ethereum);
      const accounts = await ethersProvider.listAccounts();

      if (accounts.length > 0) {
        const account = accounts[0];
        const address = account.address;
        const network = await ethersProvider.getNetwork();

        setIsConnected(true);
        setWalletAddress(address);
        setNetworkId(Number(network.chainId));
        setProvider(ethersProvider);

        // Fetch balance
        try {
          const balanceWei = await ethersProvider.getBalance(address);
          const balanceHBAR = (Number(balanceWei) / 1e18).toFixed(4);
          setBalance(balanceHBAR);
        } catch (error) {
          console.error('Error fetching balance:', error);
          setBalance(null);
        }
      } else {
        setIsConnected(false);
        setWalletAddress(null);
        setBalance(null);
        setNetworkId(null);
        setProvider(null);
      }
    } catch (error) {
      console.error('Error updating wallet state:', error);
    }
  };

  // Connect wallet
  const connect = async () => {
    if (!window.ethereum) {
      alert('Please install a Hedera-compatible wallet (HashPack, Blade, MetaMask, etc.)');
      return;
    }

    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      await updateWalletState();
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      if (error.code === 4001) {
        alert('Wallet connection rejected');
      } else {
        alert('Failed to connect wallet: ' + error.message);
      }
    }
  };

  // Disconnect wallet
  const disconnect = async () => {
    setIsConnected(false);
    setWalletAddress(null);
    setBalance(null);
    setNetworkId(null);
    setProvider(null);
  };

  // Switch network
  const switchNetwork = async (chainId: number) => {
    if (!window.ethereum) return;

    try {
      const chainIdHex = `0x${chainId.toString(16)}`;

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to the wallet
        if (switchError.code === 4902) {
          const networkConfig = chainId === 296
            ? {
                chainId: '0x128',
                chainName: 'Hedera Testnet',
                nativeCurrency: {
                  name: 'HBAR',
                  symbol: 'HBAR',
                  decimals: 18
                },
                rpcUrls: [import.meta.env.VITE_HEDERA_TESTNET_RPC || 'https://testnet.hashio.io/api'],
                blockExplorerUrls: ['https://hashscan.io/testnet']
              }
            : {
                chainId: '0x127',
                chainName: 'Hedera Mainnet',
                nativeCurrency: {
                  name: 'HBAR',
                  symbol: 'HBAR',
                  decimals: 18
                },
                rpcUrls: [import.meta.env.VITE_HEDERA_MAINNET_RPC || 'https://mainnet.hashio.io/api'],
                blockExplorerUrls: ['https://hashscan.io/mainnet']
              };

          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkConfig],
          });
        } else {
          throw switchError;
        }
      }
    } catch (error) {
      console.error('Error switching network:', error);
      throw error;
    }
  };

  // Subscribe to account and network changes
  useEffect(() => {
    if (!window.ethereum) return;

    // Check initial connection
    updateWalletState();

    // Subscribe to accounts change
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        updateWalletState();
      }
    };

    // Subscribe to network change
    const handleChainChanged = () => {
      updateWalletState();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    // Cleanup
    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  // Refresh balance periodically
  useEffect(() => {
    if (!isConnected || !walletAddress) return;

    const interval = setInterval(() => {
      updateWalletState();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, walletAddress]);

  const value: WalletContextType = {
    isConnected,
    walletAddress,
    balance,
    networkId,
    isCorrectNetwork,
    connect,
    disconnect,
    switchNetwork,
    provider
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

// Custom hook to use wallet context
export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export default WalletContext;
