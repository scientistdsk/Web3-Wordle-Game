# PHASE 2: Smart Contract Infrastructure Completion

**Status:** Not Started
**Priority:** HIGH
**Depends On:** PHASE_1

## Overview

Phase 2 completes the smart contract development infrastructure by adding build scripts, deployment automation, and contract verification tooling. This phase ensures reproducible deployments and proper contract management.

## Objectives

1. ✅ Add complete npm/pnpm scripts for contract workflow
2. ✅ Create deployment automation scripts
3. ✅ Implement contract verification on HashScan
4. ✅ Set up contract compilation pipeline
5. ✅ Create contract upgrade/migration tools
6. ✅ Add gas optimization utilities

## Components

### 1. Package.json Scripts Enhancement

**Current State:**
```json
{
  "dev": "vite",
  "build": "vite build"
}
```

**Target State:**
```json
{
  "dev": "vite",
  "build": "vite build",
  "compile": "hardhat compile",
  "test:contracts": "hardhat test",
  "test:escrow": "hardhat test tests/unit/WordleBountyEscrow.test.js",
  "test:contracts:coverage": "hardhat coverage",
  "deploy:testnet": "hardhat run scripts/deploy.js --network testnet",
  "deploy:mainnet": "hardhat run scripts/deploy.js --network mainnet",
  "verify:testnet": "hardhat run scripts/verify.js --network testnet",
  "verify:mainnet": "hardhat run scripts/verify.js --network mainnet",
  "clean": "hardhat clean",
  "node:testnet": "hardhat node --fork https://testnet.hashio.io/api",
  "console:testnet": "hardhat console --network testnet",
  "flatten": "hardhat flatten contracts/WordleBountyEscrow.sol > flattened.sol",
  "size": "hardhat size-contracts",
  "gas-report": "REPORT_GAS=true hardhat test"
}
```

### 2. Deployment Script (scripts/deploy.js)

**Purpose:** Automated deployment to Hedera networks

**Features:**
- Pre-deployment validation
- Contract deployment with constructor args
- Post-deployment configuration
- Deployment artifact saving
- Address output for .env.local update
- Transaction confirmation waiting
- Error handling and rollback

**Process:**
```javascript
1. Load environment variables
2. Validate operator account and key
3. Compile contracts (if needed)
4. Connect to Hedera network
5. Deploy WordleBountyEscrow contract
6. Wait for deployment confirmation
7. Save deployment address to deployments/
8. Initialize contract (set initial state)
9. Output deployment summary
10. Update .env.local instructions
```

**Output:**
```
Deploying WordleBountyEscrow to Hedera Testnet...
Network: testnet (Chain ID: 296)
Deployer: 0xabc...
Contract: WordleBountyEscrow
Gas Limit: 3000000
Deployment TX: 0x123...
Contract Address: 0x7842a8BdBfCA535467b0AA517332D9564838542f
Block: 12345
Gas Used: 2450123
Cost: 0.5 HBAR

✅ Deployment successful!

Add to .env.local:
VITE_ESCROW_CONTRACT_ADDRESS=0x7842a8BdBfCA535467b0AA517332D9564838542f
```

**Deployment Artifacts:**
- `deployments/testnet.json` - Testnet deployment info
- `deployments/mainnet.json` - Mainnet deployment info
- `deployments/history.json` - All deployment history

### 3. Verification Script (scripts/verify.js)

**Purpose:** Verify deployed contracts on HashScan explorer

**Features:**
- Automatic contract flattening
- Source code upload to HashScan
- Constructor arguments encoding
- Verification status polling
- Multi-network support

**Process:**
```javascript
1. Load deployment address from deployments/
2. Read constructor arguments
3. Flatten contract source code
4. Encode constructor arguments
5. Submit to HashScan API
6. Poll verification status
7. Output verification URL
```

**Output:**
```
Verifying WordleBountyEscrow on HashScan...
Network: testnet
Contract: 0x7842a8BdBfCA535467b0AA517332D9564838542f
Compiler: 0.8.19
Optimization: enabled

Flattening contract...
Encoding constructor args...
Submitting to HashScan...

✅ Verification successful!

View on HashScan:
https://hashscan.io/testnet/contract/0x7842a8BdBfCA535467b0AA517332D9564838542f
```

### 4. Contract Upgrade Script (scripts/upgrade.js)

**Purpose:** Handle contract upgrades and migrations

**Features:**
- State migration from old to new contract
- Pause old contract
- Deploy new contract
- Transfer ownership
- Update frontend configuration

**Use Cases:**
- Bug fixes requiring contract redeployment
- Feature additions
- Security patches
- Gas optimizations

### 5. Gas Reporter Configuration

**Purpose:** Analyze and optimize contract gas usage

**Configuration in hardhat.config.js:**
```javascript
gasReporter: {
  enabled: process.env.REPORT_GAS === 'true',
  currency: 'USD',
  coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  outputFile: 'gas-report.txt',
  noColors: false
}
```

**Reports:**
- Gas used per contract function
- Cost estimates in HBAR and USD
- Comparison with previous runs
- Optimization recommendations

### 6. Contract Size Checker

**Purpose:** Ensure contracts don't exceed EVM size limits

**Configuration:**
```javascript
plugins: [
  '@nomiclabs/hardhat-ethers',
  'hardhat-contract-sizer'
]
```

**Output:**
```
Contract Size Report:
WordleBountyEscrow: 18.5 KB / 24 KB (77%)
✅ All contracts within size limit
```

### 7. Local Development Node

**Purpose:** Local Hedera network fork for testing

**Script:** `pnpm run node:testnet`

**Features:**
- Fork Hedera Testnet state
- Fast mining for rapid testing
- Reset state between tests
- Console access for debugging

### 8. Deployment Documentation Generator

**Purpose:** Auto-generate deployment documentation

**Script:** `scripts/generate-docs.js`

**Output:** `DEPLOYMENT_HISTORY.md`
- All deployments with timestamps
- Contract addresses by network
- Deployment transaction hashes
- Verification status
- Upgrade history

## Environment Setup

### Required .env Variables

```bash
# Hedera Network Configuration
HEDERA_TESTNET_OPERATOR_ID=0.0.xxxxx
HEDERA_TESTNET_OPERATOR_KEY=0xabc...
HEDERA_TESTNET_RPC_URL=https://testnet.hashio.io/api

HEDERA_MAINNET_OPERATOR_ID=0.0.xxxxx
HEDERA_MAINNET_OPERATOR_KEY=0xabc...
HEDERA_MAINNET_RPC_URL=https://mainnet.hashio.io/api

# Contract Verification
HASHSCAN_API_KEY=your_hashscan_api_key

# Gas Reporting
REPORT_GAS=false
COINMARKETCAP_API_KEY=your_cmc_api_key

# Deployment Settings
MIN_DEPLOYMENT_BALANCE=100
GAS_PRICE_GWEI=1
```

## CI/CD Integration

### GitHub Actions Workflow

**File:** `.github/workflows/contracts.yml`

**Triggers:**
- Push to main branch (contracts/ changes)
- Pull requests modifying contracts/
- Manual workflow dispatch

**Jobs:**

1. **Contract Tests**
```yaml
- Checkout code
- Install dependencies (pnpm install)
- Compile contracts (pnpm run compile)
- Run tests (pnpm run test:contracts)
- Generate coverage report
- Upload coverage to Codecov
```

2. **Contract Linting**
```yaml
- Run Solhint linter
- Check formatting with Prettier
- Validate contract size
- Check gas usage
```

3. **Testnet Deployment** (main branch only)
```yaml
- Deploy to testnet
- Verify contract
- Update deployment artifacts
- Create GitHub release
- Notify team in Discord/Slack
```

## Testing Enhancements

### Contract Test Coverage

**Tool:** hardhat-coverage

**Script:** `pnpm run test:contracts:coverage`

**Output:**
```
Contract Coverage Report:
WordleBountyEscrow.sol: 92.5%
  - Statements: 95%
  - Branches: 88%
  - Functions: 100%
  - Lines: 93%

Coverage threshold: 80% ✅
```

### Gas Usage Tests

**Purpose:** Prevent gas regression

**Example Test:**
```javascript
it('should create bounty within gas limit', async () => {
  const tx = await escrow.createBounty(...args);
  const receipt = await tx.wait();
  expect(receipt.gasUsed).to.be.lt(500000); // Max 500k gas
});
```

### Fuzz Testing

**Tool:** Hardhat with Chai

**Purpose:** Test contracts with random inputs

```javascript
describe('Fuzz Tests', () => {
  it('should handle random bounty amounts', async () => {
    for (let i = 0; i < 100; i++) {
      const amount = randomHBAR(1, 10000);
      await testBountyCreation(amount);
    }
  });
});
```

## Contract Management Tools

### 1. Contract Inspector

**Script:** `scripts/inspect.js`

**Features:**
- View deployed contract state
- Query bounty information
- Check balances
- List active bounties
- Verify contract integrity

**Usage:**
```bash
pnpm run inspect:testnet --contract 0x7842...
```

### 2. Emergency Tools

**Script:** `scripts/emergency.js`

**Features:**
- Pause contract (emergency stop)
- Unpause contract
- Withdraw funds (owner only)
- Transfer ownership

**Usage:**
```bash
pnpm run emergency:pause --network testnet
pnpm run emergency:unpause --network testnet
```

### 3. State Migration Tool

**Script:** `scripts/migrate-state.js`

**Features:**
- Export bounties from old contract
- Import bounties to new contract
- Validate data integrity
- Generate migration report

## Documentation Automation

### Auto-generated Docs

**Tool:** solidity-docgen

**Configuration in hardhat.config.js:**
```javascript
docgen: {
  path: './docs/contracts',
  clear: true,
  runOnCompile: true
}
```

**Output:**
- API documentation from NatSpec comments
- Function signatures
- Event descriptions
- State variable documentation

## Success Criteria

Phase 2 is complete when:

- ✅ All npm scripts functional and documented
- ✅ Deployment script successfully deploys to testnet
- ✅ Verification script verifies contract on HashScan
- ✅ Contract tests achieve >80% coverage
- ✅ Gas reporting enabled and optimized
- ✅ CI/CD pipeline running successfully
- ✅ Deployment artifacts saved and versioned
- ✅ Emergency tools tested and working
- ✅ Documentation auto-generated from contracts
- ✅ Local development node functional

## Testing Checklist

- [ ] Run `pnpm run compile` - contracts compile successfully
- [ ] Run `pnpm run test:contracts` - all tests pass
- [ ] Run `pnpm run test:contracts:coverage` - >80% coverage
- [ ] Run `pnpm run deploy:testnet` - deploys successfully
- [ ] Run `pnpm run verify:testnet` - verifies on HashScan
- [ ] Run `pnpm run clean` - cleans build artifacts
- [ ] Run `pnpm run gas-report` - generates gas report
- [ ] Run `pnpm run size` - all contracts under size limit
- [ ] Test emergency pause/unpause
- [ ] Test contract upgrade process

## Next Phase

After Phase 2 completion, proceed to [PHASE_3.md](./PHASE_3.md) for integration testing and quality assurance.

## Resources

- Hardhat Tasks: https://hardhat.org/guides/create-task.html
- HashScan API: https://hashscan.io/api-docs
- Solidity Coverage: https://github.com/sc-forks/solidity-coverage
- Gas Reporter: https://github.com/cgewecke/hardhat-gas-reporter
- Contract Sizer: https://github.com/ItsNickBarry/hardhat-contract-sizer
