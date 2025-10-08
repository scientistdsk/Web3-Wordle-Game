import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { NotificationService } from '../utils/notifications/notification-service';

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
  getEthersSigner: () => Promise<JsonRpcSigner>;
  refreshBalance: () => Promise<void>;
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
          // Don't update balance on error, keep previous value
        }
      } else if (!isConnected) {
        // Only set disconnected if we weren't previously connected
        // This prevents false disconnections during wallet provider delays
        setIsConnected(false);
        setWalletAddress(null);
        setBalance(null);
        setNetworkId(null);
        setProvider(null);
      }
    } catch (error) {
      console.error('Error updating wallet state:', error);
      // Don't disconnect on update errors - wallet might still be connected
      // Just log the error and keep previous state
    }
  };

  // Connect wallet
  const connect = async () => {
    console.log('Connect function called');
    console.log('window.ethereum exists:', !!window.ethereum);
    console.log('window.ethereum object:', window.ethereum);

    if (!window.ethereum) {
      NotificationService.system.warning(
        'Please install a Hedera-compatible wallet (HashPack, Blade, MetaMask, etc.)',
        { duration: 6000 }
      );
      return;
    }

    try {
      console.log('Requesting accounts...');

      // First check if already connected
      const existingAccounts = await window.ethereum.request({ method: 'eth_accounts' });

      if (existingAccounts && existingAccounts.length > 0) {
        console.log('Wallet already connected, updating state...');
        await updateWalletState();
        console.log('Wallet connected successfully!');
        return;
      }

      // Add timeout to detect hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Wallet connection timeout - no response from wallet')), 60000);
      });

      const accountsPromise = window.ethereum.request({ method: 'eth_requestAccounts' });

      // Race between the request and timeout
      const accounts = await Promise.race([accountsPromise, timeoutPromise]);

      console.log('Accounts received:', accounts);
      await updateWalletState();
      console.log('Wallet connected successfully!');
    } catch (error: any) {
      console.error('Error connecting wallet:', error);

      if (error.message?.includes('timeout')) {
        NotificationService.system.warning(
          'Wallet connection timed out',
          {
            description: 'Check if your wallet extension is enabled and try again',
            duration: 8000
          }
        );
      } else if (error.code === 4001) {
        NotificationService.system.info('Wallet connection rejected');
      } else if (error.code === -32002) {
        NotificationService.system.warning(
          'Connection request already pending',
          { description: 'Please check your wallet extension', duration: 6000 }
        );
      } else if (error.code === -32603) {
        // This error often means wallet is connected but app state is out of sync
        console.log('Attempting to update wallet state...');
        await updateWalletState();
      } else {
        NotificationService.system.error('Failed to connect wallet: ' + error.message);
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

  // Get signer for transactions
  const getEthersSigner = async (): Promise<JsonRpcSigner> => {
    console.log('getEthersSigner called');

    if (!window.ethereum) {
      throw new Error('No ethereum provider found');
    }

    if (!isConnected || !walletAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      // Use the provider that's already stored in state
      if (provider && walletAddress) {
        console.log('Creating JsonRpcSigner with address:', walletAddress);
        // Manually create JsonRpcSigner with the provider and address
        // This is the Hedera-compatible way as shown in hedera-wallet-connect examples
        const signer = new JsonRpcSigner(provider, walletAddress);
        console.log('Signer created successfully');
        return signer;
      }

      // Fallback: create new provider and signer
      console.log('Creating new BrowserProvider');
      const ethersProvider = new BrowserProvider(window.ethereum);
      const signer = new JsonRpcSigner(ethersProvider, walletAddress);
      console.log('Signer created from new provider');

      return signer;
    } catch (error) {
      console.error('Error getting signer:', error);
      throw error;
    }
  };

  // Expose refresh balance as a public method
  const refreshBalance = async () => {
    console.log('🔄 Manually refreshing balance...');

    if (!window.ethereum || !walletAddress) {
      console.warn('Cannot refresh: no provider or wallet address');
      return;
    }

    try {
      const oldBalance = balance;
      console.log('📊 Current balance:', oldBalance, 'HBAR');

      // Wait for blockchain to finalize (Hedera can take 2-3 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Retry up to 3 times with fresh provider each time
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🔄 Attempt ${attempt}/3 to fetch new balance...`);

          // Create fresh provider to avoid caching
          const freshProvider = new BrowserProvider(window.ethereum);
          const balanceWei = await freshProvider.getBalance(walletAddress);
          const balanceHBAR = (Number(balanceWei) / 1e18).toFixed(4);

          console.log('💰 Fetched balance:', balanceHBAR, 'HBAR');

          // Check if balance actually changed
          if (balanceHBAR !== oldBalance) {
            console.log('✅ Balance updated:', oldBalance, '→', balanceHBAR, 'HBAR');
            setBalance(balanceHBAR);
            return;
          } else {
            console.log('⚠️ Balance unchanged, retrying in 1s...');
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } catch (err) {
          console.error(`Error on attempt ${attempt}:`, err);
          if (attempt === 3) throw err;
        }
      }

      console.warn('⚠️ Balance did not change after 3 attempts');
    } catch (error) {
      console.error('Error refreshing balance:', error);
      // Fallback to full state update
      await updateWalletState();
    }
  };

  const value: WalletContextType = {
    isConnected,
    walletAddress,
    balance,
    networkId,
    isCorrectNetwork,
    connect,
    disconnect,
    switchNetwork,
    provider,
    getEthersSigner,
    refreshBalance
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
