/**
 * HashScan utility functions for Hedera blockchain explorer links
 *
 * HashScan is the official Hedera blockchain explorer
 * Testnet: https://hashscan.io/testnet
 * Mainnet: https://hashscan.io/mainnet
 */

export type HederaNetwork = 'testnet' | 'mainnet';

/**
 * Get the base HashScan URL for a given network
 */
export function getHashScanBaseUrl(network: HederaNetwork = 'testnet'): string {
  return `https://hashscan.io/${network}`;
}

/**
 * Get HashScan URL for a transaction hash
 */
export function getTransactionUrl(
  transactionHash: string,
  network: HederaNetwork = 'testnet'
): string {
  return `${getHashScanBaseUrl(network)}/transaction/${transactionHash}`;
}

/**
 * Get HashScan URL for an account/address
 */
export function getAccountUrl(
  address: string,
  network: HederaNetwork = 'testnet'
): string {
  return `${getHashScanBaseUrl(network)}/account/${address}`;
}

/**
 * Get HashScan URL for a contract
 */
export function getContractUrl(
  contractAddress: string,
  network: HederaNetwork = 'testnet'
): string {
  return `${getHashScanBaseUrl(network)}/contract/${contractAddress}`;
}

/**
 * Get HashScan URL for a token
 */
export function getTokenUrl(
  tokenId: string,
  network: HederaNetwork = 'testnet'
): string {
  return `${getHashScanBaseUrl(network)}/token/${tokenId}`;
}

/**
 * Get the current network from environment variables
 */
export function getCurrentNetwork(): HederaNetwork {
  const network = import.meta.env.VITE_HEDERA_NETWORK;
  return network === 'mainnet' ? 'mainnet' : 'testnet';
}

/**
 * Format network name for display
 */
export function formatNetworkName(network: HederaNetwork): string {
  return network === 'mainnet' ? 'Mainnet' : 'Testnet';
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    // Fallback for older browsers
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch (fallbackError) {
      console.error('Fallback copy failed:', fallbackError);
      return false;
    }
  }
}

/**
 * Truncate transaction hash for display
 */
export function truncateHash(hash: string, startLength: number = 8, endLength: number = 6): string {
  if (hash.length <= startLength + endLength) {
    return hash;
  }
  return `${hash.slice(0, startLength)}...${hash.slice(-endLength)}`;
}
