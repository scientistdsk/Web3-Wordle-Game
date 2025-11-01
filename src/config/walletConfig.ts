/**
 * Reown AppKit Configuration for Hedera Network
 *
 * This configuration enables multi-wallet support including:
 * - MetaMask, Coinbase Wallet, Trust Wallet (via injected providers)
 * - WalletConnect v2 (mobile wallets)
 * - HashPack, Blade (Hedera-specific wallets)
 */

import { createAppKit } from '@reown/appkit';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';

// Hedera Network Configuration
export const HEDERA_TESTNET = {
  chainId: 296,
  name: 'Hedera Testnet',
  currency: 'HBAR',
  explorerUrl: 'https://hashscan.io/testnet',
  rpcUrl: import.meta.env.VITE_HEDERA_TESTNET_RPC || 'https://testnet.hashio.io/api',
};

export const HEDERA_MAINNET = {
  chainId: 295,
  name: 'Hedera Mainnet',
  currency: 'HBAR',
  explorerUrl: 'https://hashscan.io/mainnet',
  rpcUrl: import.meta.env.VITE_HEDERA_MAINNET_RPC || 'https://mainnet.hashio.io/api',
};

// Get network based on environment
export const getHederaNetwork = () => {
  const isMainnet = import.meta.env.VITE_HEDERA_NETWORK === 'mainnet';
  return isMainnet ? HEDERA_MAINNET : HEDERA_TESTNET;
};

// Reown Project ID (get from https://cloud.reown.com)
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || '';

if (!projectId || projectId === 'YOUR_PROJECT_ID') {
  console.warn(
    '⚠️ VITE_REOWN_PROJECT_ID not configured. ' +
    'Get your Project ID from https://cloud.reown.com ' +
    'and add it to your .env file. ' +
    'WalletConnect features will be limited.'
  );
}

// Metadata for the dApp
const metadata = {
  name: 'Web3 Wordle Bounty Game',
  description: 'Play Wordle, earn HBAR! Create and compete in word puzzles with cryptocurrency bounties.',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://web3wordlegame.vercel.app',
  icons: [
    typeof window !== 'undefined'
      ? `${window.location.origin}/favicon.ico`
      : 'https://web3wordlegame.vercel.app/favicon.ico'
  ],
};

// Initialize Reown AppKit
let appKit: ReturnType<typeof createAppKit> | null = null;

export const initializeAppKit = () => {
  // Only initialize if we have a valid project ID and haven't initialized yet
  if (!projectId || projectId === 'YOUR_PROJECT_ID' || appKit) {
    return appKit;
  }

  try {
    const network = getHederaNetwork();

    appKit = createAppKit({
      adapters: [new EthersAdapter()],
      networks: [
        {
          id: network.chainId,
          name: network.name,
          nativeCurrency: {
            name: network.currency,
            symbol: network.currency,
            decimals: 18, // Hedera uses 18 decimals for EVM compatibility
          },
          rpcUrls: {
            default: { http: [network.rpcUrl] },
            public: { http: [network.rpcUrl] },
          },
          blockExplorers: {
            default: {
              name: 'HashScan',
              url: network.explorerUrl,
            },
          },
        },
      ],
      projectId,
      metadata,
      features: {
        analytics: true, // Enable analytics
        email: false, // Disable email login (we want wallet-only)
        socials: [], // Disable social logins
        swaps: false, // Disable swaps (not needed for our use case)
        onramp: false, // Disable on-ramp (not needed)
      },
      themeMode: 'light', // Can be 'light' or 'dark'
      themeVariables: {
        '--w3m-accent': '#6366f1', // Primary color (indigo-500)
        '--w3m-border-radius-master': '8px',
      },
    });

    console.log('✅ Reown AppKit initialized successfully');
    return appKit;
  } catch (error) {
    console.error('❌ Failed to initialize Reown AppKit:', error);
    return null;
  }
};

// Get the AppKit instance (lazy initialization)
export const getAppKit = () => {
  if (!appKit) {
    return initializeAppKit();
  }
  return appKit;
};

// Check if AppKit is available
export const isAppKitAvailable = () => {
  return !!(projectId && projectId !== 'YOUR_PROJECT_ID');
};

// Wallet types
export type WalletType = 'injected' | 'walletconnect';

// Supported wallets metadata
export const SUPPORTED_WALLETS = {
  metamask: {
    name: 'MetaMask',
    icon: '🦊',
    type: 'injected' as WalletType,
    description: 'Connect with MetaMask browser extension',
  },
  hashpack: {
    name: 'HashPack',
    icon: '🔷',
    type: 'injected' as WalletType,
    description: 'Hedera-native wallet',
  },
  blade: {
    name: 'Blade',
    icon: '⚔️',
    type: 'injected' as WalletType,
    description: 'Hedera-native wallet',
  },
  walletconnect: {
    name: 'WalletConnect',
    icon: '🔗',
    type: 'walletconnect' as WalletType,
    description: 'Scan with mobile wallet',
  },
  coinbase: {
    name: 'Coinbase Wallet',
    icon: '💙',
    type: 'injected' as WalletType,
    description: 'Connect with Coinbase Wallet',
  },
};

export default {
  initializeAppKit,
  getAppKit,
  isAppKitAvailable,
  getHederaNetwork,
  HEDERA_TESTNET,
  HEDERA_MAINNET,
  SUPPORTED_WALLETS,
};
