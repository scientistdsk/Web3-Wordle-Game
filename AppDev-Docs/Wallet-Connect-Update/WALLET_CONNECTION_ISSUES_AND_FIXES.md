# Wallet Connection Issues and Implementation Guide

**Analysis Date**: 2025-10-06
**Project**: Web3 Wordle Bounty Game
**Current Implementation**: Direct `window.ethereum` (EIP-1193) with ethers.js v6

---

## Table of Contents

1. [Issue 1: Reown AppKit Not Integrated](#issue-1-reown-appkit-not-integrated)
2. [Issue 2: Missing Hedera Wallet Connect Integration](#issue-2-missing-hedera-wallet-connect-integration)
3. [Issue 3: Signer Creation Approach](#issue-3-signer-creation-approach)
4. [Issue 4: Network Switching Logic](#issue-4-network-switching-logic)
5. [Issue 5: Connection Error Handling](#issue-5-connection-error-handling)
6. [Issue 6: Wallet Type Detection (Enhancement)](#issue-6-wallet-type-detection-enhancement)
7. [Decision Matrix: Implementation Strategy](#decision-matrix-implementation-strategy)

---

## Issue 1: Reown AppKit Not Integrated

### **Severity**: High
### **Status**: Not Implemented
### **Files Affected**:
- `src/main.tsx`
- `src/components/WalletContext.tsx`
- `src/components/WalletConnect.tsx`
- `package.json`

### **Description**

The project has Reown AppKit packages installed (`@reown/appkit`, `@reown/appkit-adapter-ethers`, `@reown/appkit-core`) and a valid project ID configured in `.env.local`, but they are not being used anywhere in the codebase. The current implementation relies solely on `window.ethereum` injection, limiting wallet support to browser extensions only.

### **Current State**

```typescript
// Current: WalletContext.tsx
const connect = async () => {
  if (!window.ethereum) {
    alert('Please install a Hedera-compatible wallet');
    return;
  }
  await window.ethereum.request({ method: 'eth_requestAccounts' });
}
```

### **Impact**

- ❌ No WalletConnect v2 support
- ❌ No mobile wallet connections
- ❌ No Reown modal UI
- ❌ Limited to HashPack, Blade, MetaMask browser extensions
- ❌ Poor mobile user experience

### **Implementation Steps**

#### **Step 1: Create AppKit Configuration File**
1. Create `src/config/appkit.ts`
2. Configure Hedera networks (testnet + mainnet)
3. Set up metadata (name, description, icons)
4. Initialize Reown AppKit with EthersAdapter

#### **Step 2: Update Main Entry Point**
1. Import AppKit config in `src/main.tsx`
2. Initialize AppKit before React render
3. Wrap app with AppKit context provider

#### **Step 3: Refactor WalletContext**
1. Replace `window.ethereum` logic with AppKit hooks
2. Use `useAppKit()` for modal control
3. Use `useAppKitAccount()` for wallet state
4. Use `useAppKitProvider()` for ethers provider

#### **Step 4: Update WalletConnect Component**
1. Replace connect button with AppKit modal trigger
2. Use AppKit account data for display
3. Remove manual wallet address formatting (AppKit handles this)

#### **Step 5: Update EscrowService Integration**
1. Ensure signer retrieval works with AppKit provider
2. Test transaction signing flow
3. Add fallback to direct `window.ethereum` if AppKit unavailable

#### **Step 6: Test Wallet Compatibility**
1. Test HashPack browser extension
2. Test Blade browser extension
3. Test WalletConnect via mobile wallets
4. Test MetaMask as fallback
5. Verify network switching on all wallets

### **Files to Create/Modify**

```
CREATE: src/config/appkit.ts
MODIFY: src/main.tsx
MODIFY: src/components/WalletContext.tsx (major refactor)
MODIFY: src/components/WalletConnect.tsx
MODIFY: src/contracts/EscrowService.ts (minor adjustments)
```

### **Implementation Prompt**

```
Integrate Reown AppKit for WalletConnect support in the Web3 Wordle Bounty Game.

Requirements:
1. Create src/config/appkit.ts with Reown AppKit configuration:
   - Use VITE_REOWN_PROJECT_ID from .env.local
   - Configure Hedera Testnet (chainId 296) and Mainnet (chainId 295)
   - Set up EthersAdapter for ethers.js v6 compatibility
   - Include app metadata (name: "Web3 Wordle Bounty Game", description, icons)

2. Update src/main.tsx:
   - Import and initialize AppKit before rendering React app
   - Ensure AppKit modal is available globally

3. Refactor src/components/WalletContext.tsx:
   - Replace window.ethereum logic with AppKit hooks (useAppKit, useAppKitAccount, useAppKitProvider)
   - Keep getEthersSigner() function but adapt to use AppKit provider
   - Maintain backward compatibility with direct window.ethereum as fallback
   - Keep all existing context exports (isConnected, walletAddress, balance, etc.)

4. Update src/components/WalletConnect.tsx:
   - Use AppKit modal trigger for connection
   - Display wallet info using AppKit account state
   - Keep existing UI design but integrate AppKit data

5. Test and verify:
   - Smart contract interactions still work (EscrowService)
   - Transaction signing functions correctly
   - Network switching works for Hedera testnet/mainnet
   - All existing components using useWallet() continue to work

Constraints:
- Must maintain compatibility with existing code (BountyCard, CreateBountyPage, etc.)
- Do not break EscrowService smart contract integration
- Keep the same WalletContextType interface
- Use ethers.js v6 (not v5)
- Support Hedera Testnet (296) as primary network

Reference the CLAUDE.md file for project architecture details.
```

---

## Issue 2: Missing Hedera Wallet Connect Integration

### **Severity**: High
### **Status**: Not Implemented
### **Files Affected**:
- `src/components/WalletContext.tsx`
- `package.json`

### **Description**

The project has `@hashgraph/hedera-wallet-connect@2.0.4-canary.3ca04e9.0` installed but completely unused. This package provides Hedera-native wallet connection capabilities and better integration with HashPack and other Hedera wallets.

### **Current State**

```typescript
// Currently: No Hedera Wallet Connect usage
// Only using: window.ethereum (EVM compatibility layer)
```

### **Impact**

- ❌ No Hedera-native wallet features
- ❌ Relying on EVM compatibility only
- ❌ Suboptimal HashPack integration
- ❌ Cannot use Hedera-specific transaction types
- ❌ Missing Hedera Account ID integration

### **Implementation Steps**

#### **Step 1: Install and Configure Dependencies**
1. Verify `@hashgraph/hedera-wallet-connect` is at correct version
2. Install peer dependencies if needed (`@hashgraph/sdk`)

#### **Step 2: Create Hedera Wallet Connect Service**
1. Create `src/services/hederaWalletConnect.ts`
2. Initialize DAppConnector with metadata
3. Configure Hedera testnet and mainnet networks
4. Set up session management

#### **Step 3: Integrate with WalletContext**
1. Add Hedera wallet detection logic
2. Provide option to use Hedera native connection OR EVM layer
3. Store Hedera Account ID when available
4. Map Hedera Account ID to EVM address

#### **Step 4: Update EscrowService**
1. Accept both EVM addresses and Hedera Account IDs
2. Convert between formats as needed
3. Use appropriate signing method based on connection type

#### **Step 5: Add Hedera-Specific Features**
1. Display Hedera Account ID in wallet UI
2. Support HTS (Hedera Token Service) if needed
3. Add Hedera transaction explorer links

### **Files to Create/Modify**

```
CREATE: src/services/hederaWalletConnect.ts
MODIFY: src/components/WalletContext.tsx
MODIFY: src/components/WalletConnect.tsx
MODIFY: src/contracts/EscrowService.ts (optional)
```

### **Implementation Prompt**

```
Integrate Hedera Wallet Connect for native Hedera wallet support in the Web3 Wordle Bounty Game.

Requirements:
1. Create src/services/hederaWalletConnect.ts:
   - Initialize DAppConnector from @hashgraph/hedera-wallet-connect
   - Configure with app metadata (name, description, icons)
   - Set up Hedera testnet (296) and mainnet (295) support
   - Implement methods: connect(), disconnect(), getAccountId(), getSigner()

2. Update src/components/WalletContext.tsx:
   - Add Hedera wallet detection (check for window.ethereum.isHashPack)
   - Provide dual connection mode: Hedera-native vs EVM-compatible
   - Store both Hedera Account ID (0.0.xxxxx) and EVM address (0x...)
   - Add hederaAccountId field to WalletContextType interface

3. Update src/components/WalletConnect.tsx:
   - Display Hedera Account ID when connected via Hedera-native mode
   - Show connection method (Hedera Native vs EVM Compatible)
   - Add toggle/preference for connection type

4. Ensure EscrowService compatibility:
   - Smart contract interactions should work with both connection types
   - Use EVM address for contract calls (convert from Account ID if needed)
   - Maintain getEthersSigner() function for both modes

5. Test with HashPack wallet:
   - Verify native Hedera connection works
   - Verify EVM compatibility mode works
   - Ensure smooth fallback between modes

Constraints:
- Must maintain backward compatibility with existing EVM-based flow
- Do not break existing components using useWallet()
- Keep WalletContextType interface extensions optional
- Support both Hedera testnet and mainnet
- Use @hashgraph/hedera-wallet-connect v2.0.4-canary.3ca04e9.0

Reference CLAUDE.md for Hedera integration notes and HEDERA_KEY_TYPES_GUIDE.md for key format details.
```

---

## Issue 3: Signer Creation Approach

### **Severity**: Medium
### **Status**: Implemented (Needs Improvement)
### **Files Affected**:
- `src/components/WalletContext.tsx` (lines 242-275)

### **Description**

The current implementation manually constructs `JsonRpcSigner` instances instead of using the standard ethers.js pattern of calling `provider.getSigner()`. While this works, it bypasses ethers.js internal signer management and could lead to issues with transaction nonce tracking or state synchronization.

### **Current Implementation**

```typescript
// Current: WalletContext.tsx lines 242-275
const getEthersSigner = async (): Promise<JsonRpcSigner> => {
  if (!window.ethereum) {
    throw new Error('No ethereum provider found');
  }

  if (!isConnected || !walletAddress) {
    throw new Error('Wallet not connected');
  }

  try {
    if (provider && walletAddress) {
      // Manual construction - NOT RECOMMENDED
      const signer = new JsonRpcSigner(provider, walletAddress);
      return signer;
    }

    // Fallback: create new provider and manually construct signer
    const ethersProvider = new BrowserProvider(window.ethereum);
    const signer = new JsonRpcSigner(ethersProvider, walletAddress);
    return signer;
  } catch (error) {
    console.error('Error getting signer:', error);
    throw error;
  }
};
```

### **Recommended Implementation**

```typescript
const getEthersSigner = async (): Promise<JsonRpcSigner> => {
  if (!window.ethereum) {
    throw new Error('No ethereum provider found');
  }

  if (!isConnected || !walletAddress) {
    throw new Error('Wallet not connected');
  }

  try {
    // Use stored provider if available
    if (provider) {
      const signer = await provider.getSigner(walletAddress);
      return signer;
    }

    // Fallback: create new provider
    const ethersProvider = new BrowserProvider(window.ethereum);
    const signer = await ethersProvider.getSigner(walletAddress);
    return signer;
  } catch (error) {
    console.error('Error getting signer:', error);
    throw error;
  }
};
```

### **Impact**

- ⚠️ Potential nonce synchronization issues
- ⚠️ May bypass ethers.js internal state management
- ⚠️ Could cause transaction conflicts with concurrent operations
- ✅ Currently working but not following best practices

### **Implementation Steps**

#### **Step 1: Refactor getEthersSigner Method**
1. Replace manual `JsonRpcSigner` construction with `provider.getSigner()`
2. Add proper async/await handling
3. Improve error messages

#### **Step 2: Test Transaction Flow**
1. Test bounty creation (deposits HBAR)
2. Test bounty joining
3. Test concurrent transactions
4. Verify nonce management

#### **Step 3: Add Signer Caching (Optional)**
1. Cache signer instance in state
2. Invalidate cache on account/network change
3. Improve performance for repeated calls

### **Files to Modify**

```
MODIFY: src/components/WalletContext.tsx (lines 242-275)
```

### **Implementation Prompt**

```
Fix the signer creation approach in WalletContext to use standard ethers.js patterns.

Requirements:
1. Update the getEthersSigner() method in src/components/WalletContext.tsx:
   - Replace manual JsonRpcSigner construction with provider.getSigner()
   - Use proper async/await for getSigner() call
   - Keep the same error handling and validation logic
   - Maintain the walletAddress parameter for explicit address specification

2. Improve error messages:
   - Provide clear errors for each failure case
   - Include wallet address in error context for debugging

3. Test the following scenarios:
   - Create bounty (HBAR deposit transaction)
   - Join bounty transaction
   - Multiple sequential transactions
   - Concurrent transaction attempts
   - Network switching during active transactions

4. Optional: Add signer caching
   - Cache the signer instance in state
   - Invalidate cache when wallet address or network changes
   - Improve performance for components that call getEthersSigner() multiple times

Location: src/components/WalletContext.tsx, lines 242-275

Current method signature (DO NOT CHANGE):
const getEthersSigner = async (): Promise<JsonRpcSigner>

Ensure all components using this method continue to work:
- CreateBountyPage (smart contract deposits)
- AdminPage (admin functions)
- Any future components needing transaction signing

Test with HashPack wallet on Hedera Testnet.
```

---

## Issue 4: Network Switching Logic

### **Severity**: Low-Medium
### **Status**: Implemented (Needs Improvement)
### **Files Affected**:
- `src/components/WalletContext.tsx` (lines 144-195)

### **Description**

The current network switching implementation uses standard EVM RPC methods (`wallet_switchEthereumChain`, `wallet_addEthereumChain`) which may not work optimally with all Hedera wallets. Some Hedera wallets like HashPack have specific network switching requirements or limitations.

### **Current Implementation**

```typescript
// Current: WalletContext.tsx lines 144-195
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
      if (switchError.code === 4902) {
        const networkConfig = chainId === 296
          ? { /* Hedera Testnet config */ }
          : { /* Hedera Mainnet config */ };

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
```

### **Issues**

- ⚠️ Not all Hedera wallets support `wallet_switchEthereumChain`
- ⚠️ HashPack may require manual network switching in wallet UI
- ⚠️ No wallet-specific error messages
- ⚠️ No graceful fallback for unsupported wallets

### **Implementation Steps**

#### **Step 1: Add Wallet Detection**
1. Detect wallet type (HashPack, Blade, MetaMask)
2. Store wallet type in context state

#### **Step 2: Implement Wallet-Specific Network Switching**
1. For HashPack: Provide user instructions to switch manually
2. For Blade: Use standard EVM methods
3. For MetaMask: Use standard EVM methods with network addition

#### **Step 3: Improve User Feedback**
1. Show clear messages for each wallet type
2. Provide step-by-step instructions when manual switching needed
3. Add network verification after switch attempt

#### **Step 4: Add Automatic Network Prompt**
1. Check network on connect
2. Auto-prompt network switch if wrong network
3. Remember user's network preference

### **Files to Modify**

```
MODIFY: src/components/WalletContext.tsx (lines 144-195)
ADD: src/utils/walletDetection.ts (new utility)
```

### **Implementation Prompt**

```
Improve network switching logic with wallet-specific handling for Hedera wallets.

Requirements:
1. Create src/utils/walletDetection.ts:
   - detectWalletType(): Detect HashPack, Blade, MetaMask, or Unknown
   - getWalletCapabilities(): Return wallet-specific capabilities
   - supportsNetworkSwitching(): Check if wallet supports programmatic network switching

2. Update src/components/WalletContext.tsx:
   - Add walletType state field to track connected wallet
   - Detect wallet type during connection
   - Implement wallet-specific network switching logic:
     * HashPack: Show user instruction modal to switch manually
     * Blade: Use standard wallet_switchEthereumChain
     * MetaMask: Use standard with wallet_addEthereumChain fallback
     * Unknown: Attempt standard method with clear error message

3. Update switchNetwork method (lines 144-195):
   - Check wallet type before attempting switch
   - Provide clear, wallet-specific error messages
   - Add network verification after switch
   - Implement retry logic for failed switches

4. Add network validation on connect:
   - Check network immediately after wallet connection
   - Show non-blocking warning if on wrong network
   - Provide easy "Switch Network" button in WalletConnect component

5. Create user-friendly dialogs:
   - For HashPack: "Please switch to Hedera Testnet in your HashPack wallet settings"
   - For unsupported wallets: "Please manually switch to Hedera Testnet"
   - Include expected chain ID and RPC URL in messages

Test scenarios:
- Connect with HashPack on mainnet → Should prompt to switch
- Connect with Blade on wrong network → Should auto-switch
- Network switch during active session
- Network change detected via wallet event

Expected networks:
- Hedera Testnet: Chain ID 296 (0x128)
- Hedera Mainnet: Chain ID 295 (0x127)

Maintain backward compatibility with existing switchNetwork() function signature.
```

---

## Issue 5: Connection Error Handling

### **Severity**: Medium
### **Status**: Implemented (Needs Improvement)
### **Files Affected**:
- `src/components/WalletContext.tsx` (lines 80-133)

### **Description**

The current connection error handling has several issues: excessive timeout (60 seconds), generic error messages, workaround logic for error code `-32603`, and no retry mechanism. This leads to poor user experience when connection fails.

### **Current Implementation**

```typescript
// Current: WalletContext.tsx lines 80-133
const connect = async () => {
  if (!window.ethereum) {
    alert('Please install a Hedera-compatible wallet');
    return;
  }

  try {
    // Check existing accounts
    const existingAccounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (existingAccounts && existingAccounts.length > 0) {
      await updateWalletState();
      return;
    }

    // 60 second timeout - TOO LONG
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Wallet connection timeout')), 60000);
    });

    const accountsPromise = window.ethereum.request({ method: 'eth_requestAccounts' });
    const accounts = await Promise.race([accountsPromise, timeoutPromise]);

    await updateWalletState();
  } catch (error: any) {
    console.error('Error connecting wallet:', error);

    // Generic error handling
    if (error.message?.includes('timeout')) {
      alert('Wallet connection timed out. Please try again.');
    } else if (error.code === 4001) {
      alert('Wallet connection rejected');
    } else if (error.code === -32002) {
      alert('Wallet connection request already pending.');
    } else if (error.code === -32603) {
      // WORKAROUND - This shouldn't be necessary
      await updateWalletState();
    } else {
      alert('Failed to connect wallet: ' + error.message);
    }
  }
};
```

### **Issues**

- ❌ 60-second timeout is too long (should be 15-30 seconds)
- ❌ Error code `-32603` workaround indicates underlying issue
- ❌ No retry mechanism for transient failures
- ❌ Generic error messages not helpful for users
- ❌ No wallet-specific error handling
- ❌ Uses `alert()` for errors (should use UI components)

### **Implementation Steps**

#### **Step 1: Reduce and Configure Timeout**
1. Change timeout from 60s to 20-30s
2. Make timeout configurable
3. Show countdown to user during connection

#### **Step 2: Improve Error Classification**
1. Create error type enum (UserRejected, Timeout, AlreadyPending, NetworkError, etc.)
2. Map error codes to error types
3. Provide specific error messages for each type

#### **Step 3: Add Retry Logic**
1. Implement exponential backoff for transient errors
2. Limit retry attempts (max 3)
3. Show retry progress to user

#### **Step 4: Replace alert() with UI Components**
1. Create toast notification system
2. Use Alert component for errors
3. Add connection status indicator

#### **Step 5: Add Wallet-Specific Error Handling**
1. HashPack-specific errors
2. Blade-specific errors
3. MetaMask-specific errors
4. Provide actionable solutions

#### **Step 6: Fix -32603 Root Cause**
1. Investigate why -32603 errors occur
2. Fix underlying state synchronization issue
3. Remove workaround if possible

### **Files to Modify**

```
MODIFY: src/components/WalletContext.tsx (lines 80-133)
CREATE: src/utils/walletErrors.ts (error types and messages)
CREATE: src/components/ui/toast.tsx (if not exists)
```

### **Implementation Prompt**

```
Improve wallet connection error handling with better UX and reliability.

Requirements:
1. Create src/utils/walletErrors.ts:
   - Define WalletErrorType enum (UserRejected, Timeout, AlreadyPending, NetworkError, WalletLocked, etc.)
   - Create getErrorMessage(error): Map error codes to user-friendly messages
   - Create getErrorRecoveryAction(error): Suggest actions for each error type
   - Add wallet-specific error detection (isHashPackError, isBladeError, etc.)

2. Update src/components/WalletContext.tsx connect() method (lines 80-133):
   - Reduce timeout from 60s to 25s
   - Add retry logic with exponential backoff (max 3 attempts)
   - Show connection progress to user (connecting, retrying, etc.)
   - Replace alert() calls with toast notifications
   - Add wallet-specific error handling based on detected wallet type
   - Remove -32603 workaround after fixing root cause

3. Fix the -32603 error root cause:
   - Investigate state synchronization between wallet and app
   - Ensure provider state is updated before checking accounts
   - Add proper promise sequencing to avoid race conditions
   - Test with HashPack to reproduce and verify fix

4. Add connection status UI in src/components/WalletConnect.tsx:
   - Show "Connecting..." spinner during connection
   - Show "Retrying..." with attempt count
   - Display specific error messages in Alert component (not alert())
   - Add "Try Again" button for recoverable errors

5. Improve error messages:
   - User Rejected: "Connection cancelled. Click 'Connect Wallet' to try again."
   - Timeout: "Connection timed out. Please check that your wallet extension is unlocked and try again."
   - Already Pending: "A connection request is already open in your wallet. Please check your wallet extension."
   - Network Error: "Network connection failed. Please check your internet connection and try again."
   - Wallet Locked: "Your wallet is locked. Please unlock your HashPack/Blade wallet and try again."

6. Add retry logic:
   - First attempt: immediate
   - Second attempt: 2s delay
   - Third attempt: 5s delay
   - After 3 failures: show final error with manual retry button

Test scenarios:
- User rejects connection in wallet
- Wallet extension is locked
- Network disconnection during connection
- Multiple rapid connection attempts
- Connection timeout
- HashPack-specific errors
- Blade-specific errors

Install toast notification library if needed (sonner is already in package.json).
```

---

## Issue 6: Wallet Type Detection (Enhancement)

### **Severity**: Low (Enhancement)
### **Status**: Not Implemented
### **Files Affected**:
- `src/components/WalletContext.tsx`
- `src/components/WalletConnect.tsx`

### **Description**

The application currently treats all wallet connections the same way, without detecting the specific wallet type. Adding wallet detection would enable wallet-specific optimizations, better error messages, and improved user experience.

### **Current State**

```typescript
// No wallet detection currently
// All wallets treated as generic window.ethereum
```

### **Proposed Enhancement**

```typescript
const detectWallet = (): WalletType => {
  if (!window.ethereum) return 'none';
  if (window.ethereum.isHashPack) return 'hashpack';
  if (window.ethereum.isBlade) return 'blade';
  if (window.ethereum.isMetaMask) return 'metamask';
  return 'unknown';
};
```

### **Benefits**

- ✅ Display wallet logo and name in UI
- ✅ Wallet-specific connection instructions
- ✅ Optimized network switching for each wallet
- ✅ Better error messages
- ✅ Wallet-specific feature detection
- ✅ Analytics: Track which wallets users prefer

### **Implementation Steps**

#### **Step 1: Create Wallet Detection Utility**
1. Create `src/utils/walletDetection.ts`
2. Add wallet type enum and detection functions
3. Add wallet metadata (names, logos, capabilities)

#### **Step 2: Integrate with WalletContext**
1. Add `walletType` to context state
2. Detect wallet on connection
3. Update wallet type on account change

#### **Step 3: Update UI Components**
1. Show wallet logo in WalletConnect component
2. Display wallet name
3. Add wallet-specific connection tips

#### **Step 4: Add Wallet-Specific Features**
1. HashPack: Link to HashPack-specific features
2. Blade: Link to Blade-specific features
3. MetaMask: Show "Better experience with HashPack" tip

### **Files to Create/Modify**

```
CREATE: src/utils/walletDetection.ts
MODIFY: src/components/WalletContext.tsx
MODIFY: src/components/WalletConnect.tsx
CREATE: src/assets/wallet-logos/ (add wallet logos)
```

### **Implementation Prompt**

```
Add wallet type detection and wallet-specific UI enhancements.

Requirements:
1. Create src/utils/walletDetection.ts:
   - Define WalletType enum: 'none' | 'hashpack' | 'blade' | 'metamask' | 'unknown'
   - Implement detectWalletType(): Detect connected wallet using window.ethereum properties
   - Create getWalletMetadata(walletType): Return name, logo URL, homepage, etc.
   - Add getWalletCapabilities(walletType): Return capabilities (supportsNetworkSwitch, supportsHTS, etc.)

2. Update src/components/WalletContext.tsx:
   - Add walletType: WalletType to context state
   - Add walletType to WalletContextType interface
   - Detect wallet type in connect() method after successful connection
   - Update walletType in accountsChanged event handler
   - Reset walletType to 'none' in disconnect()

3. Update src/components/WalletConnect.tsx:
   - Import wallet metadata utility
   - Display wallet logo next to wallet address when connected
   - Show wallet name (e.g., "Connected with HashPack")
   - Add wallet-specific icons/badges

4. Create wallet logo assets (or use external URLs):
   - HashPack logo: src/assets/wallet-logos/hashpack.svg
   - Blade logo: src/assets/wallet-logos/blade.svg
   - MetaMask logo: src/assets/wallet-logos/metamask.svg
   - Generic wallet icon for unknown wallets

5. Add wallet-specific messaging:
   - If MetaMask detected: Show tip "For best Hedera experience, try HashPack"
   - If HashPack detected: Show "Connected with HashPack" badge
   - If Blade detected: Show "Connected with Blade" badge

6. Optional: Add analytics tracking
   - Track wallet type on connection
   - Log to console for debugging (remove in production)

Example wallet detection logic:
```typescript
export const detectWalletType = (): WalletType => {
  if (!window.ethereum) return 'none';

  // HashPack detection
  if (window.ethereum.isHashPack) return 'hashpack';

  // Blade detection
  if (window.ethereum.isBlade) return 'blade';

  // MetaMask detection (check last as it's most generic)
  if (window.ethereum.isMetaMask && !window.ethereum.isHashPack && !window.ethereum.isBlade) {
    return 'metamask';
  }

  return 'unknown';
};
```

Test with:
- HashPack browser extension
- Blade browser extension
- MetaMask browser extension
- No wallet installed (show "Install wallet" message)
```

---

## Decision Matrix: Implementation Strategy

### **Option A: Simplify Current Implementation** (Recommended for MVP)

**Goal**: Remove unused packages, improve existing `window.ethereum` implementation

#### **Pros**
- ✅ Faster to implement (1-2 days)
- ✅ Less code to maintain
- ✅ Works with current browser extension wallets
- ✅ Lower risk of breaking changes
- ✅ Easier debugging

#### **Cons**
- ❌ No mobile wallet support
- ❌ No WalletConnect
- ❌ Limited to browser extensions

#### **Action Items**
1. Remove `@reown/*` packages from package.json
2. Optionally remove `@hashgraph/hedera-wallet-connect` if not using native mode
3. Fix Issue 3 (Signer Creation)
4. Fix Issue 5 (Error Handling)
5. Implement Issue 6 (Wallet Detection)
6. Improve Issue 4 (Network Switching)

#### **Implementation Prompt for Option A**

```
Simplify and improve the current wallet connection implementation.

Objective: Clean up unused dependencies and enhance the existing window.ethereum-based wallet connection system.

Tasks:
1. Remove unused Reown packages:
   - Uninstall: @reown/appkit, @reown/appkit-adapter-ethers, @reown/appkit-core
   - Remove: VITE_REOWN_PROJECT_ID from .env.local and .env.example
   - Update: CLAUDE.md to remove Reown references

2. Fix signer creation (Issue 3):
   - Update getEthersSigner() in src/components/WalletContext.tsx
   - Use provider.getSigner() instead of manual construction
   - Test with CreateBountyPage smart contract interactions

3. Improve error handling (Issue 5):
   - Reduce connection timeout from 60s to 25s
   - Add retry logic with exponential backoff
   - Replace alert() with toast notifications (use sonner library)
   - Create src/utils/walletErrors.ts for error classification
   - Fix -32603 error root cause

4. Add wallet type detection (Issue 6):
   - Create src/utils/walletDetection.ts
   - Detect HashPack, Blade, MetaMask
   - Add wallet logos to UI
   - Show wallet name in WalletConnect component

5. Improve network switching (Issue 4):
   - Add wallet-specific network switching logic
   - Show helpful messages for wallets that don't support programmatic switching
   - Add network validation on connect

6. Update documentation:
   - Update CLAUDE.md with final architecture
   - Document wallet compatibility (HashPack, Blade, MetaMask)
   - Add troubleshooting guide for common wallet issues

Constraints:
- Maintain all existing functionality
- Do not break EscrowService smart contract integration
- Keep WalletContextType interface stable
- Support Hedera Testnet (chain ID 296)
- Test thoroughly with HashPack wallet

Deliverables:
- Cleaned package.json
- Improved WalletContext.tsx
- New walletDetection.ts utility
- New walletErrors.ts utility
- Updated documentation
- All existing features working
```

---

### **Option B: Full Reown AppKit Integration**

**Goal**: Complete WalletConnect integration with Reown AppKit

#### **Pros**
- ✅ Mobile wallet support via WalletConnect
- ✅ Modern modal UI
- ✅ Multi-wallet support
- ✅ Future-proof architecture
- ✅ Better user experience

#### **Cons**
- ❌ Major refactor required (3-5 days)
- ❌ More complex debugging
- ❌ Hedera support in Reown may be limited
- ❌ Additional bundle size
- ❌ Higher maintenance burden

#### **Action Items**
1. Implement Issue 1 (Reown AppKit Integration) - Full implementation
2. Create AppKit configuration file
3. Refactor WalletContext to use AppKit hooks
4. Update all components using wallet connection
5. Test extensively with multiple wallets
6. Fix Issue 3 (Signer Creation) for AppKit provider
7. Keep fallback to `window.ethereum` for non-AppKit wallets

#### **Implementation Prompt for Option B**

```
Implement full Reown AppKit integration for WalletConnect support.

Objective: Replace current window.ethereum implementation with Reown AppKit for modern wallet connection.

Tasks:
1. Create AppKit configuration (src/config/appkit.ts):
   - Import createAppKit from @reown/appkit
   - Import EthersAdapter from @reown/appkit-adapter-ethers
   - Configure Hedera Testnet (296) and Mainnet (295) networks
   - Set up app metadata from .env.local (VITE_REOWN_PROJECT_ID)
   - Initialize AppKit with EthersAdapter

2. Update application entry point (src/main.tsx):
   - Import AppKit config before rendering React
   - Ensure AppKit modal is globally available
   - Add AppKit context provider if needed

3. Major refactor of WalletContext (src/components/WalletContext.tsx):
   - Import AppKit hooks: useAppKit, useAppKitAccount, useAppKitProvider
   - Replace window.ethereum logic with AppKit hooks
   - Adapt getEthersSigner() to use AppKit provider
   - Maintain backward compatibility with direct window.ethereum as fallback
   - Keep all existing exports (isConnected, walletAddress, balance, etc.)

4. Update WalletConnect component (src/components/WalletConnect.tsx):
   - Replace custom connect button with AppKit modal trigger
   - Use AppKit account state for wallet info display
   - Keep existing UI design, integrate AppKit data

5. Test smart contract integration:
   - Verify EscrowService works with AppKit provider
   - Test bounty creation (HBAR deposits)
   - Test transaction signing flow
   - Verify network switching

6. Test wallet compatibility:
   - HashPack browser extension
   - HashPack mobile via WalletConnect
   - Blade browser extension
   - MetaMask as fallback
   - Any WalletConnect v2 compatible wallet

7. Add fallback handling:
   - Detect if AppKit fails to initialize
   - Fall back to window.ethereum if AppKit unavailable
   - Show appropriate error messages

8. Update documentation:
   - Document AppKit integration in CLAUDE.md
   - Add WalletConnect setup instructions
   - Document supported wallets (browser + mobile)

Constraints:
- Must maintain compatibility with all components using useWallet()
- Do not break EscrowService smart contract integration
- Keep WalletContextType interface unchanged (may add optional fields)
- Support Hedera Testnet (296) and Mainnet (295)
- Use ethers.js v6 (not v5)
- VITE_REOWN_PROJECT_ID from .env.local must work

Testing checklist:
- [ ] Browser extension wallets work
- [ ] Mobile WalletConnect works
- [ ] Smart contract transactions succeed
- [ ] Network switching works
- [ ] Balance updates correctly
- [ ] Disconnect works properly
- [ ] All existing components still function

Reference:
- Reown AppKit docs: https://docs.reown.com/appkit/overview
- Current implementation: src/components/WalletContext.tsx
- Architecture docs: CLAUDE.md
```

---

### **Option C: Hybrid Approach** (Advanced)

**Goal**: Implement both native `window.ethereum` AND Reown AppKit with user choice

#### **Pros**
- ✅ Maximum flexibility
- ✅ Supports all wallet types
- ✅ Future-proof
- ✅ Users can choose connection method

#### **Cons**
- ❌ Most complex implementation (5-7 days)
- ❌ Highest maintenance burden
- ❌ More code paths to test
- ❌ Potential for state conflicts

#### **Action Items**
1. Implement Option A improvements
2. Implement Option B in parallel
3. Add connection mode selector in UI
4. Maintain two connection paths
5. Extensive testing of both modes

#### **Implementation Prompt for Option C**

```
Implement hybrid wallet connection supporting both direct and WalletConnect modes.

Objective: Support both window.ethereum (browser extensions) and Reown AppKit (WalletConnect) with user choice.

Tasks:
1. Create dual connection system:
   - Add connectionMode: 'direct' | 'walletconnect' to WalletContext state
   - Implement Option A improvements for direct mode
   - Implement Option B for WalletConnect mode
   - Add mode selector in UI

2. Implement connection mode toggle (src/components/WalletConnect.tsx):
   - Add "Connection Method" dropdown or tabs
   - Option 1: "Browser Extension" (direct window.ethereum)
   - Option 2: "WalletConnect" (Reown AppKit modal)
   - Save user preference to localStorage

3. Update WalletContext to support both modes:
   - Separate logic paths for each mode
   - Shared interface for both (keep WalletContextType unchanged)
   - Mode-specific implementations of connect(), disconnect(), getEthersSigner()

4. Handle mode switching:
   - Disconnect from current mode before switching
   - Clear state when switching modes
   - Validate that wallet supports chosen mode

5. Test both modes extensively:
   - Direct mode: HashPack, Blade, MetaMask extensions
   - WalletConnect mode: Mobile wallets, cross-device connections
   - Mode switching: Verify clean disconnection and reconnection
   - Smart contracts: Ensure both modes can sign transactions

6. Add mode-specific features:
   - Direct mode: Show "Install wallet extension" for desktop
   - WalletConnect mode: Show QR code for mobile scanning
   - Auto-select best mode based on device (mobile → WalletConnect, desktop → Direct)

7. Update UI:
   - Add connection mode indicator
   - Show appropriate connection instructions per mode
   - Add troubleshooting help for each mode

This is the most complex option. Consider if your use case truly needs both modes before implementing.

Estimated time: 5-7 days
Risk level: High
Maintenance burden: High
```

---

## Recommended Implementation Order

### **Phase 1: Quick Wins** (1 day)
1. Fix Issue 3 (Signer Creation) - Low risk, high value
2. Implement Issue 6 (Wallet Detection) - Enhances UX
3. Clean up console logging

### **Phase 2: Error Handling** (1-2 days)
1. Fix Issue 5 (Connection Error Handling)
2. Add toast notifications
3. Improve retry logic

### **Phase 3: Network Management** (1 day)
1. Fix Issue 4 (Network Switching)
2. Add wallet-specific network handling
3. Add auto-network validation

### **Phase 4: Strategic Decision** (2-5 days)
- **If choosing Option A**: Remove Reown packages, finalize improvements
- **If choosing Option B**: Implement full Reown AppKit integration
- **If choosing Option C**: Implement hybrid system (not recommended unless required)

---

## Testing Checklist

After implementing any fixes, test the following scenarios:

### **Wallet Connection**
- [ ] Connect with HashPack browser extension
- [ ] Connect with Blade browser extension
- [ ] Connect with MetaMask browser extension
- [ ] Reject connection from wallet
- [ ] Connection timeout handling
- [ ] Already connected state detection

### **Network Operations**
- [ ] Connected to Hedera Testnet (296)
- [ ] Switch from Mainnet to Testnet
- [ ] Switch from Testnet to Mainnet
- [ ] Wrong network warning displays
- [ ] Network auto-switch on connect

### **Smart Contract Transactions**
- [ ] Create bounty (HBAR deposit)
- [ ] Join bounty
- [ ] Complete bounty (admin)
- [ ] Claim refund
- [ ] Multiple sequential transactions
- [ ] Transaction rejection handling

### **State Management**
- [ ] Balance updates after transaction
- [ ] Account change detection
- [ ] Network change detection
- [ ] Wallet disconnection
- [ ] Page refresh maintains connection
- [ ] Multiple tabs state synchronization

### **Error Scenarios**
- [ ] Wallet locked during connection
- [ ] Network disconnection during transaction
- [ ] Insufficient balance for transaction
- [ ] User rejects transaction
- [ ] Wallet extension disabled
- [ ] Unknown wallet type

### **UI/UX**
- [ ] Loading states display correctly
- [ ] Error messages are clear and actionable
- [ ] Wallet address formatted correctly
- [ ] Balance displays in HBAR
- [ ] Network indicator accurate
- [ ] Wallet logo displays (if implemented)

---

## File Reference Summary

| File | Issues | Priority |
|------|--------|----------|
| `src/components/WalletContext.tsx` | 1, 2, 3, 4, 5, 6 | High |
| `src/components/WalletConnect.tsx` | 1, 2, 6 | High |
| `src/contracts/EscrowService.ts` | 3 | Medium |
| `src/main.tsx` | 1 | High (if Option B) |
| `src/config/appkit.ts` | 1 | High (if Option B) |
| `src/utils/walletDetection.ts` | 4, 6 | Medium |
| `src/utils/walletErrors.ts` | 5 | Medium |
| `package.json` | 1, 2 | High |

---

## Additional Resources

- **Reown AppKit Docs**: https://docs.reown.com/appkit/overview
- **Hedera Wallet Connect**: https://github.com/hashgraph/hedera-wallet-connect
- **Ethers.js v6 Docs**: https://docs.ethers.org/v6/
- **HashPack Developer Docs**: https://docs.hashpack.app/
- **Hedera Testnet Faucet**: https://portal.hedera.com/faucet

---

**Last Updated**: 2025-10-06
**Next Review**: After implementing Phase 1-2 fixes
