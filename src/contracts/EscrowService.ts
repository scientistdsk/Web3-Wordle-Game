import { BrowserProvider, Contract, ContractTransactionReceipt, keccak256, toUtf8Bytes, encodeBytes32String, JsonRpcSigner, zeroPadValue, toBeHex } from 'ethers';

// Contract ABI - matches WordleBountyEscrow.sol
const ESCROW_ABI = [
  // Read functions
  "function owner() view returns (address)",
  "function platformFeeBps() view returns (uint256)",
  "function MIN_BOUNTY_AMOUNT() view returns (uint256)",
  "function accumulatedFees() view returns (uint256)",
  "function paused() view returns (bool)",
  "function getBounty(bytes32 bountyId) view returns (tuple(bytes32 bountyId, address creator, uint256 prizeAmount, uint256 deadline, bytes32 solutionHash, string metadata, address winner, bool isActive, bool isCompleted, uint256 participantCount, uint8 status))",
  "function isParticipant(bytes32 bountyId, address participant) view returns (bool)",
  "function getBountyParticipants(bytes32 bountyId) view returns (address[])",
  "function getContractBalance() view returns (uint256)",
  "function calculateNetPrize(uint256 grossPrize) view returns (uint256 netPrize, uint256 platformFee)",

  // Write functions
  "function createBounty(bytes32 bountyId, bytes32 solutionHash, uint256 deadline, string metadata) payable",
  "function joinBounty(bytes32 bountyId)",
  "function completeBounty(bytes32 bountyId, address winnerAddress, string solution)",
  "function cancelBounty(bytes32 bountyId)",
  "function claimExpiredBountyRefund(bytes32 bountyId)",
  "function updatePlatformFee(uint256 newFeeBps)",
  "function withdrawFees()",
  "function pause()",
  "function unpause()",
  "function emergencyWithdraw()",
  "function transferOwnership(address newOwner)",

  // Events
  "event BountyCreated(bytes32 indexed bountyId, address indexed creator, uint256 prizeAmount, uint256 deadline, bytes32 solutionHash)",
  "event ParticipantJoined(bytes32 indexed bountyId, address indexed participant)",
  "event BountyCompleted(bytes32 indexed bountyId, address indexed winner, uint256 netPrize, uint256 platformFee)",
  "event BountyCancelled(bytes32 indexed bountyId, address indexed creator)",
  "event BountyRefunded(bytes32 indexed bountyId, address indexed creator, uint256 amount)",
  "event PlatformFeeUpdated(uint256 newFeeBps)",
  "event FeesWithdrawn(address indexed owner, uint256 amount)",
  "event Paused(address indexed owner)",
  "event Unpaused(address indexed owner)"
];

// Bounty status enum (matches Solidity)
export enum BountyStatus {
  Active = 0,
  Completed = 1,
  Cancelled = 2,
  Expired = 3
}

// Type definitions
export interface BountyInfo {
  bountyId: string;
  creator: string;
  prizeAmount: bigint;
  deadline: bigint;
  solutionHash: string;
  metadata: string;
  winner: string;
  isActive: boolean;
  isCompleted: boolean;
  participantCount: bigint;
  status: BountyStatus;
}

export interface CreateBountyParams {
  bountyId: string;
  solution: string;
  deadline: number;
  metadata: string;
  prizeAmount: string; // HBAR amount as string
}

export interface CompleteBountyParams {
  bountyId: string;
  winnerAddress: string;
  solution: string;
}

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  receipt?: ContractTransactionReceipt;
  error?: string;
}

/**
 * Convert UUID string to bytes32 format for smart contract
 * UUIDs are too long for encodeBytes32String (36 chars > 31 limit)
 * So we hash them to get a consistent bytes32 value
 */
function uuidToBytes32(uuid: string): string {
  // Remove hyphens and convert to lowercase
  const cleanUuid = uuid.replace(/-/g, '').toLowerCase();

  // If it's already a valid hex string (32 bytes = 64 hex chars), pad it
  if (cleanUuid.length === 32) {
    return zeroPadValue('0x' + cleanUuid, 32);
  }

  // Otherwise, hash the UUID to get a deterministic bytes32 value
  return keccak256(toUtf8Bytes(uuid));
}

/**
 * EscrowService - TypeScript service for interacting with WordleBountyEscrow smart contract
 */
export class EscrowService {
  private contract: Contract | null = null;
  private provider: BrowserProvider | null = null;
  private contractAddress: string;

  constructor(contractAddress?: string) {
    this.contractAddress = contractAddress || import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS || '';
    if (!this.contractAddress) {
      console.warn('No escrow contract address provided. Set VITE_ESCROW_CONTRACT_ADDRESS in .env.local');
    }
  }

  /**
   * Initialize contract with signer (already obtained from wallet)
   */
  async initialize(signer: JsonRpcSigner): Promise<void> {
    if (!this.contractAddress) {
      throw new Error('Contract address not configured');
    }

    this.provider = signer.provider as BrowserProvider;
    this.contract = new Contract(this.contractAddress, ESCROW_ABI, signer);
  }

  /**
   * Ensure contract is initialized
   */
  private ensureInitialized(): Contract {
    if (!this.contract) {
      throw new Error('EscrowService not initialized. Call initialize() first.');
    }
    return this.contract;
  }

  /**
   * Create a new bounty with HBAR deposit
   * @param bountyId - Unique identifier for the bounty
   * @param solution - The solution word
   * @param prizeAmount - Prize amount in HBAR
   * @param durationHours - Duration in hours
   * @param metadata - Additional metadata (database ID)
   * @returns Transaction response (not receipt)
   */
  async createBounty(
    bountyId: string,
    solution: string,
    prizeAmount: number,
    durationHours: number,
    metadata: string
  ) {
    const contract = this.ensureInitialized();

    // Convert solution to hash
    const solutionHash = keccak256(toUtf8Bytes(solution));

    // Convert bountyId to bytes32
    const bountyIdBytes32 = uuidToBytes32(bountyId);

    // Calculate deadline (current time + duration in seconds)
    const deadline = Math.floor(Date.now() / 1000) + (durationHours * 3600);

    // Convert HBAR to wei (1 HBAR = 10^18 wei for ethers.js)
    const prizeWei = BigInt(Math.floor(prizeAmount * 1e18));

    // Create bounty transaction and return the transaction response
    const tx = await contract.createBounty(
      bountyIdBytes32,
      solutionHash,
      deadline,
      metadata,
      { value: prizeWei }
    );

    return tx;
  }

  /**
   * Join an active bounty
   */
  async joinBounty(bountyId: string): Promise<TransactionResult> {
    try {
      const contract = this.ensureInitialized();
      const bountyIdBytes32 = uuidToBytes32(bountyId);

      const tx = await contract.joinBounty(bountyIdBytes32);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        receipt
      };
    } catch (error: any) {
      console.error('Error joining bounty:', error);
      return {
        success: false,
        error: error.message || 'Unknown error joining bounty'
      };
    }
  }

  /**
   * Complete a bounty and distribute prize (owner only)
   */
  async completeBounty(params: CompleteBountyParams): Promise<TransactionResult> {
    try {
      const contract = this.ensureInitialized();
      const bountyIdBytes32 = uuidToBytes32(params.bountyId);

      const tx = await contract.completeBounty(
        bountyIdBytes32,
        params.winnerAddress,
        params.solution
      );
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        receipt
      };
    } catch (error: any) {
      console.error('Error completing bounty:', error);
      return {
        success: false,
        error: error.message || 'Unknown error completing bounty'
      };
    }
  }

  /**
   * Cancel an active bounty (creator only)
   */
  async cancelBounty(bountyId: string): Promise<TransactionResult> {
    try {
      const contract = this.ensureInitialized();
      const bountyIdBytes32 = uuidToBytes32(bountyId);

      const tx = await contract.cancelBounty(bountyIdBytes32);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        receipt
      };
    } catch (error: any) {
      console.error('Error cancelling bounty:', error);
      return {
        success: false,
        error: error.message || 'Unknown error cancelling bounty'
      };
    }
  }

  /**
   * Claim refund for expired bounty (creator only)
   */
  async claimRefund(bountyId: string): Promise<TransactionResult> {
    try {
      const contract = this.ensureInitialized();
      const bountyIdBytes32 = uuidToBytes32(bountyId);

      const tx = await contract.claimExpiredBountyRefund(bountyIdBytes32);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        receipt
      };
    } catch (error: any) {
      console.error('Error claiming refund:', error);
      return {
        success: false,
        error: error.message || 'Unknown error claiming refund'
      };
    }
  }

  /**
   * Get bounty information
   */
  async getBountyInfo(bountyId: string): Promise<BountyInfo | null> {
    try {
      const contract = this.ensureInitialized();
      const bountyIdBytes32 = uuidToBytes32(bountyId);

      const bounty = await contract.getBounty(bountyIdBytes32);

      return {
        bountyId: bounty.bountyId,
        creator: bounty.creator,
        prizeAmount: bounty.prizeAmount,
        deadline: bounty.deadline,
        solutionHash: bounty.solutionHash,
        metadata: bounty.metadata,
        winner: bounty.winner,
        isActive: bounty.isActive,
        isCompleted: bounty.isCompleted,
        participantCount: bounty.participantCount,
        status: bounty.status
      };
    } catch (error: any) {
      console.error('Error getting bounty info:', error);
      return null;
    }
  }

  /**
   * Check if address is a participant
   */
  async isParticipant(bountyId: string, address: string): Promise<boolean> {
    try {
      const contract = this.ensureInitialized();
      const bountyIdBytes32 = uuidToBytes32(bountyId);

      return await contract.isParticipant(bountyIdBytes32, address);
    } catch (error: any) {
      console.error('Error checking participant:', error);
      return false;
    }
  }

  /**
   * Get all participants for a bounty
   */
  async getBountyParticipants(bountyId: string): Promise<string[]> {
    try {
      const contract = this.ensureInitialized();
      const bountyIdBytes32 = uuidToBytes32(bountyId);

      return await contract.getBountyParticipants(bountyIdBytes32);
    } catch (error: any) {
      console.error('Error getting participants:', error);
      return [];
    }
  }

  /**
   * Calculate net prize after platform fee
   */
  async calculateNetPrize(grossPrize: string): Promise<{ netPrize: bigint; platformFee: bigint } | null> {
    try {
      const contract = this.ensureInitialized();
      const grossPrizeWei = BigInt(Math.floor(parseFloat(grossPrize) * 1e18));

      const result = await contract.calculateNetPrize(grossPrizeWei);

      return {
        netPrize: result.netPrize,
        platformFee: result.platformFee
      };
    } catch (error: any) {
      console.error('Error calculating net prize:', error);
      return null;
    }
  }

  /**
   * Get contract balance
   */
  async getContractBalance(): Promise<bigint> {
    try {
      const contract = this.ensureInitialized();
      return await contract.getContractBalance();
    } catch (error: any) {
      console.error('Error getting contract balance:', error);
      return BigInt(0);
    }
  }

  /**
   * Get platform fee in basis points
   */
  async getPlatformFee(): Promise<number> {
    try {
      const contract = this.ensureInitialized();
      const fee = await contract.platformFeeBps();
      return Number(fee);
    } catch (error: any) {
      console.error('Error getting platform fee:', error);
      return 0;
    }
  }

  /**
   * Get minimum bounty amount
   */
  async getMinBountyAmount(): Promise<bigint> {
    try {
      const contract = this.ensureInitialized();
      return await contract.MIN_BOUNTY_AMOUNT();
    } catch (error: any) {
      console.error('Error getting min bounty amount:', error);
      return BigInt(0);
    }
  }

  /**
   * Check if contract is paused
   */
  async isPaused(): Promise<boolean> {
    try {
      const contract = this.ensureInitialized();
      return await contract.paused();
    } catch (error: any) {
      console.error('Error checking paused status:', error);
      return false;
    }
  }

  /**
   * Listen to contract events
   */
  onBountyCreated(callback: (bountyId: string, creator: string, prizeAmount: bigint, deadline: bigint) => void) {
    const contract = this.ensureInitialized();
    contract.on('BountyCreated', (bountyId, creator, prizeAmount, deadline, solutionHash) => {
      callback(bountyId, creator, prizeAmount, deadline);
    });
  }

  onBountyCompleted(callback: (bountyId: string, winner: string, netPrize: bigint, platformFee: bigint) => void) {
    const contract = this.ensureInitialized();
    contract.on('BountyCompleted', (bountyId, winner, netPrize, platformFee) => {
      callback(bountyId, winner, netPrize, platformFee);
    });
  }

  onParticipantJoined(callback: (bountyId: string, participant: string) => void) {
    const contract = this.ensureInitialized();
    contract.on('ParticipantJoined', (bountyId, participant) => {
      callback(bountyId, participant);
    });
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
  }

  /**
   * Get contract address
   */
  getContractAddress(): string {
    return this.contractAddress;
  }

  /**
   * Get contract instance (for accessing address, etc.)
   */
  getContract(): Contract | null {
    return this.contract;
  }
}

// Export singleton instance
export const escrowService = new EscrowService();

export default EscrowService;
