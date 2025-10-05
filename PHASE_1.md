# PHASE 1: Core Blockchain Integration

**Status:** In Progress
**Priority:** CRITICAL
**Started:** 2025-10-01

## Overview

Phase 1 restores the missing core blockchain infrastructure required for the Web3 Wordle Bounty Game to function. This phase focuses on wallet connectivity, smart contract deployment, and payment layer implementation.

## Objectives

Implement the critical missing components that are blocking all blockchain functionality:

1. ✅ Wallet integration with Reown AppKit
2. ✅ Smart contract development and deployment
3. ✅ Contract interaction service layer
4. ✅ Payment processing infrastructure
5. ✅ Build and deployment tooling

## Components

### 1. WalletContext.tsx
**Location:** `src/components/WalletContext.tsx`

**Purpose:** Global wallet state management and Reown AppKit integration

**Features:**
- WalletProvider component wrapping the app
- useWallet hook for accessing wallet state
- Reown AppKit modal integration
- Connection state management (isConnected, walletAddress, balance)
- HBAR balance tracking
- Network detection (testnet/mainnet)

**Dependencies:**
- @reown/appkit
- @reown/appkit-adapter-ethers
- ethers.js

**Exports:**
```typescript
interface WalletContextType {
  isConnected: boolean;
  walletAddress: string | null;
  balance: string | null;
  networkId: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export const WalletProvider: React.FC
export const useWallet: () => WalletContextType
```

### 2. WordleBountyEscrow.sol
**Location:** `contracts/WordleBountyEscrow.sol`

**Purpose:** Main escrow smart contract managing bounty lifecycle

**Features:**
- HBAR deposit handling for bounty creation
- Bounty state management (Active, Completed, Cancelled, Expired)
- Winner prize distribution with platform fee (2.5%)
- Refund mechanisms for cancelled/expired bounties
- Access control (Ownable pattern)
- Emergency pause functionality
- Hedera Token Service integration

**Key Functions:**
```solidity
function createBounty(
    string memory bountyId,
    bytes32 solutionHash,
    uint256 deadline,
    string memory metadata
) external payable

function joinBounty(string memory bountyId) external

function completeBounty(
    string memory bountyId,
    address winner,
    string memory solution
) external onlyOwner

function cancelBounty(string memory bountyId) external

function claimExpiredBountyRefund(string memory bountyId) external
```

**Security:**
- Reentrancy guards
- Access control modifiers
- State validation checks
- Minimum bounty amount (1 HBAR)
- Deadline enforcement

### 3. EscrowService.ts
**Location:** `src/contracts/EscrowService.ts`

**Purpose:** TypeScript service wrapping smart contract interactions

**Features:**
- ethers.js contract instance management
- Type-safe contract method calls
- Transaction error handling
- Event listening and parsing
- Gas estimation
- Transaction receipt polling

**Methods:**
```typescript
class EscrowService {
  async createBounty(params: CreateBountyParams): Promise<TransactionReceipt>
  async joinBounty(bountyId: string): Promise<TransactionReceipt>
  async completeBounty(params: CompleteBountyParams): Promise<TransactionReceipt>
  async cancelBounty(bountyId: string): Promise<TransactionReceipt>
  async claimRefund(bountyId: string): Promise<TransactionReceipt>
  async getBountyInfo(bountyId: string): Promise<BountyInfo>
}
```

### 4. Payment Layer
**Location:** `src/utils/payment/`

#### payment-service.ts
**Purpose:** Business logic wrapper around EscrowService

**Features:**
- Application-specific payment workflows
- Integration with Supabase for transaction tracking
- User balance management
- Payment validation
- Transaction state machine

#### payment-hooks.ts
**Purpose:** React hooks for payment operations

**Hooks:**
```typescript
useCreateBountyWithPayment(): {
  createBounty: (params) => Promise<void>,
  isLoading: boolean,
  error: Error | null
}

useJoinBounty(): {
  joinBounty: (bountyId) => Promise<void>,
  isLoading: boolean,
  error: Error | null
}

useCompleteBounty(): {
  completeBounty: (params) => Promise<void>,
  isLoading: boolean,
  error: Error | null
}

useRefundBounty(): {
  claimRefund: (bountyId) => Promise<void>,
  isLoading: boolean,
  error: Error | null
}

useVerifyTransaction(): {
  verifyTransaction: (txHash) => Promise<boolean>,
  isLoading: boolean
}
```

### 5. Hardhat Configuration
**Location:** `hardhat.config.js`

**Purpose:** Smart contract compilation and deployment configuration

**Features:**
- Hedera Testnet configuration (Chain ID: 296)
- Hedera Mainnet configuration (Chain ID: 295)
- Solidity compiler settings (0.8.19)
- Network RPC endpoints
- Account management
- Gas settings
- Plugin integrations (@hashgraph/hardhat-hethers)

**Networks:**
```javascript
{
  testnet: {
    url: "https://testnet.hashio.io/api",
    chainId: 296,
    accounts: [process.env.HEDERA_TESTNET_OPERATOR_KEY]
  },
  mainnet: {
    url: "https://mainnet.hashio.io/api",
    chainId: 295,
    accounts: [process.env.HEDERA_MAINNET_OPERATOR_KEY]
  }
}
```

## Package.json Scripts

Add the following scripts to enable contract development:

```json
{
  "compile": "hardhat compile",
  "test:contracts": "hardhat test",
  "test:escrow": "hardhat test tests/unit/WordleBountyEscrow.test.js",
  "deploy:testnet": "hardhat run scripts/deploy.js --network testnet",
  "verify:testnet": "hardhat verify --network testnet",
  "clean": "hardhat clean"
}
```

## Deployment Scripts

### scripts/deploy.js
**Purpose:** Deploy WordleBountyEscrow contract to Hedera Testnet

**Process:**
1. Load deployment account from .env
2. Compile contracts
3. Deploy WordleBountyEscrow
4. Save deployment address
5. Initialize contract (if needed)
6. Output deployment info

### scripts/verify.js
**Purpose:** Verify contract on HashScan explorer

**Process:**
1. Load contract address
2. Compile contract
3. Submit verification to HashScan
4. Poll for verification status

## Environment Variables

Ensure these are set in `.env` and `.env.local`:

### .env (for deployment)
```
HEDERA_TESTNET_OPERATOR_ID=0.0.xxxxx
HEDERA_TESTNET_OPERATOR_KEY=0xabc...
HEDERA_TESTNET_RPC_URL=https://testnet.hashio.io/api
```

### .env.local (for frontend)
```
VITE_REOWN_PROJECT_ID=your_reown_project_id
VITE_HEDERA_NETWORK=testnet
VITE_HEDERA_TESTNET_RPC=https://testnet.hashio.io/api
VITE_ESCROW_CONTRACT_ADDRESS=0x...
```

## Dependencies

Already installed:
- @reown/appkit ^1.8.4
- @reown/appkit-adapter-ethers ^1.8.4
- ethers ^6.13.5
- @hashgraph/hardhat-hethers ^1.0.4
- @hashgraph/sdk ^2.72.0
- hardhat ^2.26.3

## Testing Strategy

### Unit Tests
- Test each contract function in isolation
- Test access control and permissions
- Test edge cases and error conditions
- Test state transitions

### Integration Tests
- Test full bounty lifecycle
- Test wallet connection
- Test payment flows
- Test transaction confirmations

### Manual Testing
- Use PaymentTestPage component
- Test with small HBAR amounts on testnet
- Verify transactions on HashScan

## Success Criteria

Phase 1 is complete when:

- ✅ Users can connect Hedera wallets via Reown AppKit
- ✅ Smart contract is deployed to testnet
- ✅ Users can create bounties with HBAR deposits
- ✅ Users can join bounties
- ✅ Winners can claim prizes
- ✅ Creators can claim refunds for expired bounties
- ✅ All payment transactions are tracked in Supabase
- ✅ Contract tests pass successfully
- ✅ Integration tests verify end-to-end flow

## Risks & Mitigations

### Risk: Contract Address Mismatch
**Issue:** Deployed contract at 0x7842a8BdBfCA535467b0AA517332D9564838542f may not match new implementation

**Mitigation:**
- Check HashScan to understand deployed contract
- Option 1: Recreate exact same contract
- Option 2: Deploy new contract and update address
- Option 3: Use deployed contract if source code can be recovered

### Risk: Key Type Confusion
**Issue:** Hedera supports ED25519 and ECDSA keys, must use ECDSA for EVM compatibility

**Mitigation:**
- Verify HEDERA_TESTNET_OPERATOR_KEY is ECDSA format
- Add validation in deployment scripts
- Document in HEDERA_KEY_TYPES_GUIDE.md

### Risk: Transaction Failures
**Issue:** Blockchain transactions can fail for various reasons

**Mitigation:**
- Implement comprehensive error handling
- Add retry logic with exponential backoff
- Show clear error messages to users
- Track failed transactions in Supabase

### Risk: Wallet Integration Issues
**Issue:** Different wallets may behave differently

**Mitigation:**
- Test with multiple wallet providers
- Handle connection errors gracefully
- Provide fallback UI states
- Add wallet compatibility documentation

## Next Phase

After Phase 1 completion, proceed to [PHASE_2.md](./PHASE_2.md) for smart contract infrastructure completion.

## Notes

- This phase unblocks all blockchain functionality
- Frontend components already expect these services to exist
- Imports are already in place, just need implementations
- Contract tests exist and can guide implementation
- Deployed contract address suggests prior implementation existed

## Resources

- Hedera Testnet Faucet: https://portal.hedera.com/faucet
- HashScan Testnet Explorer: https://hashscan.io/testnet
- Reown AppKit Docs: https://docs.reown.com/appkit
- Hardhat Docs: https://hardhat.org/docs
- ethers.js Docs: https://docs.ethers.org/v6/
