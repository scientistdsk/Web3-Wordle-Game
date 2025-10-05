# Wallet Connection Test Instructions

## Steps to Debug Wallet Connection

### 1. Open Browser Console
Press `F12` or right-click → Inspect → Console tab

### 2. Refresh the Page
Reload http://localhost:5173

### 3. Click "Connect Wallet"
Look for console messages:
- "Button clicked, isConnected: false"
- "Calling connect..."
- "Connect function called"
- "window.ethereum exists: true/false"

### 4. Check What Happens

#### Scenario A: Nothing happens (no console logs)
**Problem:** Button click not registering
**Check:**
- Is the sidebar visible?
- Can you see the "Connect Wallet" button?
- Try clicking other buttons in the sidebar to test if they work

#### Scenario B: "window.ethereum exists: false"
**Problem:** No wallet extension installed
**Solution:**
1. Install a wallet:
   - **HashPack** (recommended): https://www.hashpack.app/download
   - **Blade Wallet**: https://bladewallet.io/
   - **MetaMask**: https://metamask.io/download/
2. Refresh the page
3. Try again

#### Scenario C: "No ethereum provider found" alert
**Problem:** Same as Scenario B
**Solution:** Install a wallet extension

#### Scenario D: Wallet popup appears but you reject
**Result:** "Wallet connection rejected" alert
**Solution:** Click Connect Wallet again and approve

#### Scenario E: Error message in console
**Action:** Copy the error and share it

#### Scenario F: "Accounts received: [...]"
**Success!** Wallet should now be connected
**Check:** Sidebar should show your wallet address and balance

## Quick Wallet Installation

### For HashPack (Best for Hedera):
1. Go to: https://www.hashpack.app/download
2. Click "Install for Chrome/Brave/Edge"
3. Follow installation steps
4. Create or import wallet
5. Make sure you're on **Hedera Testnet**
6. Refresh the app page
7. Click "Connect Wallet"

### For Blade Wallet:
1. Go to: https://bladewallet.io/
2. Install browser extension
3. Set up wallet
4. Select **Testnet** mode
5. Refresh the app
6. Click "Connect Wallet"

### For MetaMask (also works):
1. Go to: https://metamask.io/download/
2. Install extension
3. Set up wallet
4. You'll need to manually add Hedera Testnet:
   - Network Name: Hedera Testnet
   - RPC URL: https://testnet.hashio.io/api
   - Chain ID: 296
   - Currency Symbol: HBAR
   - Block Explorer: https://hashscan.io/testnet

## Manual Test in Console

If button isn't working, test directly in browser console:

```javascript
// Check if ethereum exists
console.log('Ethereum:', window.ethereum);

// Try requesting accounts manually
if (window.ethereum) {
  window.ethereum.request({ method: 'eth_requestAccounts' })
    .then(accounts => console.log('Connected:', accounts))
    .catch(err => console.error('Error:', err));
}
```

## Expected Behavior (Success Case)

1. Click "Connect Wallet"
2. Console shows:
   ```
   Button clicked, isConnected: false
   Calling connect...
   Connect function called
   window.ethereum exists: true
   Requesting accounts...
   ```
3. Wallet extension pops up asking for permission
4. You click "Approve" or "Connect"
5. Console shows:
   ```
   Accounts received: ["0x..."]
   ```
6. Sidebar updates to show:
   - Your wallet address (0xabc...def)
   - Your HBAR balance
   - "Disconnect" button

## Common Issues & Solutions

### Issue: Button does nothing, no console logs
**Solution:**
- Make sure dev server is running (`pnpm run dev`)
- Hard refresh (Ctrl+Shift+R)
- Check if JavaScript is enabled
- Try a different browser

### Issue: "window.ethereum exists: false"
**Solution:**
- Install HashPack, Blade, or MetaMask
- Make sure extension is enabled
- Refresh page after installing

### Issue: Wrong network warning shows
**Solution:**
- Open wallet extension
- Switch to Hedera Testnet
- Or click the warning in the app to switch automatically

### Issue: Balance shows 0.0000 HBAR
**Solution:**
- Get test HBAR from faucet: https://portal.hedera.com/faucet
- Enter your wallet address
- Get 10,000 test HBAR (free, daily)

## Testing Checklist

- [ ] Dev server running (`pnpm run dev`)
- [ ] Wallet extension installed (HashPack/Blade/MetaMask)
- [ ] Wallet set to Hedera Testnet
- [ ] Browser console open (F12)
- [ ] Clicked "Connect Wallet"
- [ ] Reviewed console logs
- [ ] Wallet popup appeared
- [ ] Approved connection
- [ ] Address and balance showing in sidebar

## Report Results

If it still doesn't work, share:
1. Which wallet you're using
2. Browser and version
3. Console logs (copy/paste)
4. Screenshot of the error (if any)
5. What happens when you click the button

## Alternative: Use Browser's Ethereum Object Directly

If the button truly does nothing, test in console:

```javascript
// This should work if wallet is installed
window.ethereum.request({ method: 'eth_requestAccounts' })
  .then(accounts => {
    console.log('Success! Accounts:', accounts);
    alert('Connected: ' + accounts[0]);
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  });
```

If this works, the issue is in the React component. If this doesn't work, the issue is with the wallet installation.
