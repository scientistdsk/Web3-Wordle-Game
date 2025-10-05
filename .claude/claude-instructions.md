# Claude Code Instructions

This file provides AI coding agents with essential patterns and architectural knowledge for the Web3 Wordle Bounty Game codebase.

## Architecture Overview

### Three-Layer Architecture
The app follows a strict separation of concerns:

1. **Smart Contract Layer** ([WordleBountyEscrow.sol](contracts/WordleBountyEscrow.sol))
   - Single source of truth for HBAR custody and bounty state
   - Platform fee: 2.5% (250 basis points), max 10%
   - Minimum bounty: 1 HBAR (100000000 tinybars internally)
   - All amounts in contract stored as wei (1 HBAR = 10^18 wei for ethers.js compatibility)

2. **Service Layer** ([EscrowService.ts](src/contracts/EscrowService.ts) → [payment-service.ts](src/utils/payment/payment-service.ts))
   - `EscrowService`: Direct blockchain interaction via ethers.js v6, wraps contract ABI
   - `PaymentService`: Business logic wrapper that syncs blockchain state to Supabase
   - Pattern: Every blockchain transaction triggers corresponding database update

3. **Database Layer** (Supabase PostgreSQL)
   - Stores bounty metadata, user profiles, game attempts, transaction history
   - **NOT** source of truth for payments - blockchain is authoritative
   - RLS policies enforce wallet-based access control

### Critical Data Flow: Bounty Creation
```
CreateBountyPage → PaymentService.createBountyWithPayment() →
  EscrowService.createBounty() → Smart Contract (HBAR locked) →
  PaymentService.recordTransaction() → Supabase (metadata stored)
```

**Key pattern**: Transaction hash from blockchain always recorded in Supabase for audit trail. See [payment-service.ts:26-57](src/utils/payment/payment-service.ts#L26-L57).

## Development Workflow

### Smart Contract Development
```bash
pnpm run compile              # Always run after .sol changes
pnpm run test:escrow         # Test escrow contract in isolation
pnpm run deploy:testnet      # Deploys to Hedera Testnet (chainId: 296)
```

**Post-deployment checklist**:
1. Copy deployed contract address from console
2. Update `VITE_ESCROW_CONTRACT_ADDRESS` in `.env.local`
3. Restart Vite dev server (`pnpm run dev`)
4. Verify on HashScan: `pnpm run verify:testnet`

### Frontend Development
- Vite hot-reloads automatically for React/TypeScript changes
- Use [PaymentTestPage.tsx](src/components/PaymentTestPage.tsx) to test payment flows without UI navigation
- All HBAR amounts in UI are standard denomination (e.g., "5.5 HBAR"), converted to wei internally

### Database Migrations
- **Sequential naming**: `001_initial_schema.sql`, `002_rls_policies.sql`, etc.
- **Never skip numbers** - migrations run in order
- Dictionary system (words validation) in migrations [012](supabase/migrations/012_dictionary_system.sql) and [013](supabase/migrations/013_dictionary_seed.sql)

## Key Integration Points

### Wallet Connection Flow
```typescript
// WalletContext.tsx provides global wallet state
const { walletAddress, getEthersSigner, isConnected } = useWallet();

// Initialize EscrowService with signer
const signer = await getEthersSigner();
await escrowService.initialize(signer);
```

**Critical**: Hedera requires ECDSA keys (not ED25519). See `HEDERA_KEY_TYPES_GUIDE.md` for conversion. JsonRpcSigner constructed manually with `new JsonRpcSigner(provider, walletAddress)` for Hedera compatibility - see [WalletContext.tsx:228-256](src/components/WalletContext.tsx#L228-L256).

### Contract Interaction Pattern
```typescript
// ALWAYS use EscrowService, never instantiate Contract directly
const tx = await escrowService.createBounty(
  bountyId,        // string
  solution,        // plaintext word (hashed internally)
  prizeAmount,     // number in HBAR
  durationHours,   // number
  metadata         // JSON stringified
);
// Returns tx response (not receipt) - wait for it in calling code
const receipt = await tx.wait();
```

See [EscrowService.ts:132-163](src/contracts/EscrowService.ts#L132-L163) for implementation.

### Supabase API Patterns
```typescript
// User creation bypasses RLS via function
const user = await getOrCreateUser(walletAddress);

// Bounty creation uses wallet address (creates user if needed)
const bounty = await createBounty({
  creator_id: walletAddress,  // NOT user.id - function handles lookup
  name: "My Bounty",
  // ...
});

// Join bounty - handles user creation + participation record
const participationId = await joinBounty(bountyId, walletAddress);
```

**RLS Bypass Functions**: For operations requiring cross-user access (e.g., platform creating users), use `supabase.rpc()` functions defined in migrations (e.g., `get_or_create_user`, `create_bounty_with_wallet`). See [api.ts:97-122](src/utils/supabase/api.ts#L97-L122).

## Project-Specific Conventions

### Environment Variables
- **Two `.env` files**: `.env` for Hardhat (contract deployment), `.env.local` for Vite (frontend)
- **Hedera Networks**: testnet (chainId 296), mainnet (chainId 295)
- **Contract address**: Must be manually copied from deployment output to `.env.local`

### HBAR Amount Conversions
```typescript
// Frontend → Contract: multiply by 10^18
const prizeWei = BigInt(Math.floor(prizeAmount * 1e18));

// Contract → Frontend: divide by 10^18
const prizeHBAR = Number(bountyInfo.prizeAmount) / 1e18;
```

Always use `BigInt` for wei amounts to avoid precision loss.

### Bounty ID Format
- **Blockchain**: `bytes32` (keccak256 hash or encodeBytes32String)
- **Database**: UUID string
- **Conversion**: Use `encodeBytes32String(uuidString)` when calling contract - see [EscrowService.ts:145](src/contracts/EscrowService.ts#L145)

### Error Handling
- Wallet connection timeouts after 60 seconds with user-friendly message - see [WalletContext.tsx:94-96](src/components/WalletContext.tsx#L94-L96)
- Contract errors return `{ success: false, error: string }` - never throw from service layer
- Database errors log to console but don't block transaction completion (e.g., recording transaction in DB failing won't revert blockchain tx)

## Testing Strategy

### Smart Contracts
- Hardhat tests in `tests/unit/WordleBountyEscrow.test.js`
- Timeout: 2 minutes (configured in `hardhat.config.js:52`)
- Run specific suite: `pnpm run test:escrow`

### Frontend Testing
- **Manual testing**: Use PaymentTestPage with small HBAR amounts (0.1-1 HBAR)
- **Get test HBAR**: https://portal.hedera.com/faucet (10,000 HBAR daily limit)
- **View transactions**: HashScan testnet explorer

### Database Testing
- Use [TestDatabaseConnection.tsx](src/components/TestDatabaseConnection.tsx) to verify Supabase connectivity
- Check RLS policies by testing as different wallets

## Common Pitfalls

1. **Forgetting to update contract address**: After `pnpm run deploy:testnet`, must update `.env.local` and restart dev server
2. **Using ED25519 keys**: Hedera accounts default to ED25519, but JSON-RPC requires ECDSA keys
3. **Mixing bounty ID formats**: Always convert UUID to bytes32 when calling smart contract
4. **RLS blocking writes**: For platform operations, use `supabase.rpc()` functions that bypass RLS
5. **Not waiting for transaction receipts**: `EscrowService.createBounty()` returns tx response - must call `.wait()` to get receipt
6. **Precision loss with HBAR amounts**: Use `BigInt` for wei, only convert to `Number` for display

## File Organization

- **UI Components**: `src/components/*Page.tsx` (page-level), `src/components/ui/*` (shadcn primitives)
- **Utilities**: `src/utils/payment/` (blockchain), `src/utils/supabase/` (database), `src/utils/dictionary.ts` (word validation)
- **Smart Contracts**: `contracts/` (Solidity source), `artifacts/` (compiled output, gitignored)
- **Migrations**: `supabase/migrations/` (sequential SQL files)

## Debugging Commands

```bash
# Check contract compilation
pnpm run compile && cat artifacts/contracts/WordleBountyEscrow.sol/WordleBountyEscrow.json | grep '"abi"'

# Verify wallet network
# Check window.ethereum.request({ method: 'eth_chainId' }) in browser console

# Test contract interaction without UI
node -e "const { escrowService } = require('./src/contracts/EscrowService'); ..."
```

## External Dependencies

- **Hedera JSON-RPC**: testnet.hashio.io/api (rate limited, use sparingly)
- **WalletConnect**: Requires `VITE_REOWN_PROJECT_ID` from cloud.reown.com
- **Supabase**: Connection URL/anon key in `.env.local`, RLS enforces security

## Resources

- Contract deployment guide: [SMART_CONTRACT_README.md](SMART_CONTRACT_README.md)
- Implementation phases: [PHASE_1.md](PHASE_1.md), [PHASE_2.md](PHASE_2.md), etc.
- Database setup: [setup-database.md](setup-database.md)
