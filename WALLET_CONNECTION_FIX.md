# Wallet Connection Fix - "Adapter Not Found" Error

## Problem
The "adapter not found" error occurs with the Reown AppKit wallet integration.

## Solution Options

### Option 1: Use Simple Direct Wallet Connection (RECOMMENDED)

This approach uses direct `window.ethereum` connection without Reown AppKit, which is simpler and more reliable.

**Steps:**

1. **Backup current WalletContext:**
   ```bash
   mv src/components/WalletContext.tsx src/components/WalletContext-reown.tsx.bak
   ```

2. **Use the simple version:**
   ```bash
   mv src/components/WalletContext-simple.tsx src/components/WalletContext.tsx
   ```

3. **Restart dev server:**
   ```bash
   pnpm run dev
   ```

**Benefits:**
- ✅ No external dependencies to configure
- ✅ Works with all Ethereum-compatible wallets
- ✅ Works with HashPack, Blade, MetaMask
- ✅ Simpler, more direct approach
- ✅ No Reown Project ID needed

**Trade-offs:**
- ❌ No fancy Reown AppKit modal
- ❌ Users need to have wallet extension installed

---

### Option 2: Fix Reown AppKit Configuration

If you prefer to use Reown AppKit's modal UI:

**Potential Issues:**
1. **Missing dependencies** - Reown AppKit may need additional packages
2. **Incorrect network configuration** - Hedera might not be recognized
3. **Version mismatch** - AppKit version might not support custom chains

**Debug Steps:**

1. **Check console for detailed error:**
   Open browser dev console (F12) and look for full error message

2. **Verify Reown Project ID:**
   ```bash
   # Check .env.local has valid project ID
   cat .env.local | grep VITE_REOWN_PROJECT_ID
   ```

3. **Try updating Reown packages:**
   ```bash
   pnpm update @reown/appkit @reown/appkit-adapter-ethers @reown/appkit-core
   ```

4. **Check Reown AppKit version compatibility:**
   Reown AppKit might not fully support custom EVM chains like Hedera (Chain ID 296)

---

## Recommended Approach

**Use Option 1 (Simple Direct Connection)** for now because:

1. **It works reliably** with all Ethereum-compatible wallets
2. **No external service dependencies** (no Reown Project ID needed)
3. **Simpler to debug** and maintain
4. **HashPack and Blade wallets** work perfectly
5. **Better for hackathon/MVP** - focus on functionality over fancy UI

## Implementation

### Quick Switch Command

```bash
# Backup Reown version
cp src/components/WalletContext.tsx src/components/WalletContext-reown.tsx.bak

# Replace with simple version
cp src/components/WalletContext-simple.tsx src/components/WalletContext.tsx

# Restart
pnpm run dev
```

### What Changes

**Before (Reown AppKit):**
- Uses Reown modal for wallet selection
- Requires Reown Project ID
- Complex configuration

**After (Simple):**
- Uses browser wallet extension directly
- No external service needed
- Simple window.ethereum connection

### User Experience

**Before:**
1. Click "Connect Wallet"
2. Reown modal opens (if it works)
3. Select wallet from list
4. Approve in wallet

**After:**
1. Click "Connect Wallet"
2. Wallet extension pops up automatically
3. Approve in wallet
4. Connected!

---

## Testing After Fix

1. **Start dev server:**
   ```bash
   pnpm run dev
   ```

2. **Open in browser:**
   http://localhost:5173

3. **Install a wallet** (if not already):
   - HashPack: https://www.hashpack.app/
   - Blade Wallet: https://bladewallet.io/
   - MetaMask: https://metamask.io/ (works with Hedera)

4. **Click "Connect Wallet":**
   - Should trigger wallet extension popup
   - Approve connection
   - Verify address and balance display

5. **Test network switching:**
   - Try switching between testnet/mainnet
   - Wallet should prompt to add/switch network

---

## Troubleshooting

### "No ethereum provider found"
**Problem:** No wallet extension installed
**Solution:** Install HashPack, Blade, or MetaMask

### "Wallet connection rejected"
**Problem:** User declined connection
**Solution:** Click connect again and approve

### Wrong network / Network warning shows
**Problem:** Wallet connected to wrong network
**Solution:** Click the network warning or manually switch in wallet

### Balance not updating
**Problem:** RPC connection issues
**Solution:** Check VITE_HEDERA_TESTNET_RPC in .env.local

---

## Reverting Back to Reown (if needed)

```bash
# Restore Reown version
cp src/components/WalletContext-reown.tsx.bak src/components/WalletContext.tsx

# Restart
pnpm run dev
```

---

## Production Recommendation

For production deployment:

1. **Use simple direct connection** (current approach)
2. **Add wallet detection** to guide users to install wallets
3. **Add network switching UI** to help users switch to correct network
4. **Consider Reown later** once they add proper Hedera support

---

## Summary

**Current Status:**
- ❌ Reown AppKit has "adapter not found" error
- ✅ Simple direct connection works reliably

**Recommendation:**
- Use `WalletContext-simple.tsx` as your `WalletContext.tsx`
- Focus on core functionality over fancy wallet modal
- Revisit Reown AppKit after hackathon if desired

**Action:**
```bash
cp src/components/WalletContext-simple.tsx src/components/WalletContext.tsx
pnpm run dev
```

Then test wallet connection - it should work!
