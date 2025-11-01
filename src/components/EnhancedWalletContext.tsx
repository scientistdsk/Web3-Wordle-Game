/**
 * Enhanced Wallet Context with Reown AppKit Integration
 *
 * Features:
 * - ✅ 100% backward compatible with existing code
 * - ✅ Supports window.ethereum (MetaMask, HashPack, Blade)
 * - ✅ Supports WalletConnect v2 via Reown AppKit
 * - ✅ Multi-wallet selection
 * - ✅ Better error handling
 * - ✅ Network detection and switching
 * - ✅ Balance refresh optimization
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { NotificationService } from '../utils/notifications/notification-service';
import { getAppKit, isAppKitAvailable, getHederaNetwork } from '../config/walletConfig';

// Wallet context type
interface WalletContextType {
  isConnected: boolean;
  walletAddress: string | null;
  balance: string | null;
  networkId: number | null;
  isCorrectNetwork: boolean;
  walletType: 'injected' | 'walletconnect' | null;
  connect: () => Promise<void>;
  connectWithAppKit: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: (chainId: number) => Promise<void>;
  provider: BrowserProvider | null;
  getEthersSigner: () => Promise<JsonRpcSigner>;
  refreshBalance: () => Promise<void>;
  isAppKitEnabled: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

export const EnhancedWalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [networkId, setNetworkId] = useState<number | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [walletType, setWalletType] = useState<'injected' | 'walletconnect' | null>(null);

  const expectedNetwork = import.meta.env.VITE_HEDERA_NETWORK === 'mainnet' ? 295 : 296;
  const isCorrectNetwork = networkId === expectedNetwork;
  const isAppKitEnabled = isAppKitAvailable();

  // Update wallet state (works for both injected and WalletConnect)
  const updateWalletState = useCallback(async (providerSource?: any) => {
    try {
      // Determine provider source
      let ethProvider = providerSource || window.ethereum;

      if (!ethProvider) {
        // Try to get provider from AppKit if available
        const appKit = getAppKit();
        if (appKit) {
          const walletProvider = appKit.getWalletProvider();
          if (walletProvider) {
            ethProvider = walletProvider;
          }
        }
      }

      if (!ethProvider) {
        console.warn('No ethereum provider found');
        return;
      }

      const ethersProvider = new BrowserProvider(ethProvider);
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
        }
      } else if (!isConnected) {
        setIsConnected(false);
        setWalletAddress(null);
        setBalance(null);
        setNetworkId(null);
        setProvider(null);
        setWalletType(null);
      }
    } catch (error) {
      console.error('Error updating wallet state:', error);
    }
  }, [isConnected]);

  // Connect wallet using window.ethereum (BACKWARD COMPATIBLE - Original method)
  const connect = async () => {
    console.log('🔌 Connect function called (injected wallet mode)');

    if (!window.ethereum) {
      NotificationService.system.warning(
        'Please install a Hedera-compatible wallet',
        {
          description: 'Supported: HashPack, Blade, MetaMask, or use WalletConnect',
          duration: 6000
        }
      );
      return;
    }

    try {
      // Check if already connected
      const existingAccounts = await window.ethereum.request({ method: 'eth_accounts' });

      if (existingAccounts && existingAccounts.length > 0) {
        console.log('✅ Wallet already connected, updating state...');
        setWalletType('injected');
        await updateWalletState();
        return;
      }

      // Request connection with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Wallet connection timeout')), 60000);
      });

      const accountsPromise = window.ethereum.request({ method: 'eth_requestAccounts' });
      await Promise.race([accountsPromise, timeoutPromise]);

      console.log('✅ Wallet connected successfully!');
      setWalletType('injected');
      await updateWalletState();
    } catch (error: any) {
      console.error('❌ Error connecting wallet:', error);

      if (error.message?.includes('timeout')) {
        NotificationService.system.warning(
          'Wallet connection timed out',
          { description: 'Check if your wallet extension is enabled', duration: 8000 }
        );
      } else if (error.code === 4001) {
        NotificationService.system.info('Wallet connection rejected');
      } else if (error.code === -32002) {
        NotificationService.system.warning(
          'Connection request already pending',
          { description: 'Please check your wallet extension', duration: 6000 }
        );
      } else if (error.code === -32603) {
        await updateWalletState();
      } else {
        NotificationService.system.error('Failed to connect wallet: ' + error.message);
      }
    }
  };

  // Connect wallet using Reown AppKit (NEW - WalletConnect support)
  const connectWithAppKit = async () => {
    console.log('🔗 Connect function called (AppKit mode)');

    if (!isAppKitEnabled) {
      NotificationService.system.warning(
        'WalletConnect not configured',
        {
          description: 'Add VITE_REOWN_PROJECT_ID to .env file to enable mobile wallet support',
          duration: 6000
        }
      );
      // Fallback to injected wallet
      return connect();
    }

    try {
      const appKit = getAppKit();
      if (!appKit) {
        throw new Error('AppKit initialization failed');
      }

      // Open wallet selection modal
      await appKit.open();

      // AppKit handles the connection UI
      // Subscribe to connection events
      appKit.subscribeProvider(async (state: any) => {
        if (state.isConnected && state.address) {
          console.log('✅ WalletConnect connected:', state.address);
          setWalletType('walletconnect');

          // Get provider from AppKit
          const walletProvider = appKit.getWalletProvider();
          await updateWalletState(walletProvider);
        } else if (!state.isConnected) {
          console.log('❌ WalletConnect disconnected');
          await disconnect();
        }
      });
    } catch (error: any) {
      console.error('❌ Error connecting with AppKit:', error);
      NotificationService.system.error('Failed to connect: ' + error.message);
    }
  };

  // Disconnect wallet (works for both types)
  const disconnect = async () => {
    console.log('🔌 Disconnecting wallet...');

    try {
      // If using AppKit/WalletConnect, disconnect through AppKit
      if (walletType === 'walletconnect') {
        const appKit = getAppKit();
        if (appKit) {
          await appKit.disconnect();
        }
      }

      setIsConnected(false);
      setWalletAddress(null);
      setBalance(null);
      setNetworkId(null);
      setProvider(null);
      setWalletType(null);

      NotificationService.system.info('Wallet disconnected');
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  // Switch network (BACKWARD COMPATIBLE)
  const switchNetwork = async (chainId: number) => {
    if (!window.ethereum) {
      NotificationService.system.warning('No wallet provider found');
      return;
    }

    try {
      const chainIdHex = `0x${chainId.toString(16)}`;

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          const network = getHederaNetwork();
          const networkConfig = {
            chainId: chainIdHex,
            chainName: network.name,
            nativeCurrency: {
              name: network.currency,
              symbol: network.currency,
              decimals: 18
            },
            rpcUrls: [network.rpcUrl],
            blockExplorerUrls: [network.explorerUrl]
          };

          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkConfig],
          });
        } else {
          throw switchError;
        }
      }

      NotificationService.system.success(`Switched to ${chainId === 296 ? 'Testnet' : 'Mainnet'}`);
    } catch (error: any) {
      console.error('Error switching network:', error);
      NotificationService.system.error('Failed to switch network: ' + error.message);
      throw error;
    }
  };

  // Subscribe to account and network changes
  useEffect(() => {
    if (!window.ethereum) return;

    updateWalletState();

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        updateWalletState();
      }
    };

    const handleChainChanged = () => {
      updateWalletState();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [updateWalletState]);

  // Refresh balance periodically
  useEffect(() => {
    if (!isConnected || !walletAddress) return;

    const interval = setInterval(() => {
      updateWalletState();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, walletAddress, updateWalletState]);

  // Get signer for transactions (BACKWARD COMPATIBLE)
  const getEthersSigner = async (): Promise<JsonRpcSigner> => {
    console.log('🖊️ getEthersSigner called');

    if (!isConnected || !walletAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      // Use stored provider if available
      if (provider && walletAddress) {
        console.log('✅ Creating JsonRpcSigner with address:', walletAddress);
        const signer = new JsonRpcSigner(provider, walletAddress);
        return signer;
      }

      // Fallback: create new provider
      if (!window.ethereum) {
        throw new Error('No ethereum provider found');
      }

      console.log('🔄 Creating new BrowserProvider');
      const ethersProvider = new BrowserProvider(window.ethereum);
      const signer = new JsonRpcSigner(ethersProvider, walletAddress);

      return signer;
    } catch (error) {
      console.error('❌ Error getting signer:', error);
      throw error;
    }
  };

  // Refresh balance (BACKWARD COMPATIBLE - Enhanced)
  const refreshBalance = async () => {
    console.log('💰 Manually refreshing balance...');

    if (!walletAddress) {
      console.warn('Cannot refresh: no wallet address');
      return;
    }

    try {
      const oldBalance = balance;
      console.log('📊 Current balance:', oldBalance, 'HBAR');

      // Wait for blockchain finalization
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Retry up to 3 times
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🔄 Attempt ${attempt}/3 to fetch new balance...`);

          // Create fresh provider
          let ethProvider = window.ethereum;
          if (walletType === 'walletconnect') {
            const appKit = getAppKit();
            if (appKit) {
              const walletProvider = appKit.getWalletProvider();
              if (walletProvider) {
                ethProvider = walletProvider;
              }
            }
          }

          if (!ethProvider) {
            throw new Error('No provider available');
          }

          const freshProvider = new BrowserProvider(ethProvider);
          const balanceWei = await freshProvider.getBalance(walletAddress);
          const balanceHBAR = (Number(balanceWei) / 1e18).toFixed(4);

          console.log('💰 Fetched balance:', balanceHBAR, 'HBAR');

          if (balanceHBAR !== oldBalance) {
            console.log('✅ Balance updated:', oldBalance, '→', balanceHBAR, 'HBAR');
            setBalance(balanceHBAR);
            return;
          } else {
            console.log('⚠️ Balance unchanged, retrying...');
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } catch (err) {
          console.error(`❌ Error on attempt ${attempt}:`, err);
          if (attempt === 3) throw err;
        }
      }

      console.warn('⚠️ Balance did not change after 3 attempts');
    } catch (error) {
      console.error('❌ Error refreshing balance:', error);
      await updateWalletState();
    }
  };

  const value: WalletContextType = {
    isConnected,
    walletAddress,
    balance,
    networkId,
    isCorrectNetwork,
    walletType,
    connect, // Original method - still works!
    connectWithAppKit, // New method - WalletConnect support!
    disconnect,
    switchNetwork,
    provider,
    getEthersSigner,
    refreshBalance,
    isAppKitEnabled,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

// Custom hook to use wallet context
export const useEnhancedWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useEnhancedWallet must be used within an EnhancedWalletProvider');
  }
  return context;
};

// Export for backward compatibility
export { WalletContext };
export default WalletContext;
