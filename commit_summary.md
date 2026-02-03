# Commit Summary: Vote UI Feature Implementation

## Overview
Implemented a new voting UI feature that displays a modal dialog when users click on voting options (optionA or optionB) in market cards. The modal handles both ETH and ERC20 token payments with proper approval flow.

## Files Changed

### New Files
- `webapp/src/components/market/VoteModal.tsx` - New modal component for voting

### Modified Files
- `webapp/src/tools/utils.tsx` - Added ERC20 token functions
- `webapp/src/components/market/MarketCard.tsx` - Integrated VoteModal

## Detailed Changes

### 1. VoteModal Component (`webapp/src/components/market/VoteModal.tsx`)
A new full-screen modal dialog that:
- Dims the background with a dark overlay (backdrop-blur)
- Presents a two-step voting flow:
  1. **Option Selection**: User chooses between optionA (true signal) or optionB (false signal)
  2. **Amount Entry**: User inputs the spending amount
- Fetches fresh market data on open:
  - Calls `fetchMarketDataFromBlockchain()` for latest market state
  - Calls `readPaymentToken()` to get the payment token address for that market
- Handles payment logic:
  - If `paymentToken` is zero address (`0x0000000000000000000000000000000000000000`): Sends ETH as `msg.value`
  - If `paymentToken` is a valid token address: Checks allowance via `readTokenAllowance()`, requests approval if needed via `useTokenApprove()`, then submits vote without `msg.value`
- Shows loading states for approval and voting transactions
- Displays success confirmation before auto-closing

### 2. ERC20 Token Functions (`webapp/src/tools/utils.tsx`)
Added new exports:
- `ZERO_ADDRESS` - Constant for the zero address
- `isZeroAddress(address)` - Helper to check if address is zero
- `readTokenAllowance(tokenAddress, owner, spender)` - Read ERC20 allowance
- `prepareTokenApprove(tokenAddress, amount)` - Prepare approval transaction
- `useTokenApprove()` - React hook for token approval with receipt waiting

### 3. MarketCard Updates (`webapp/src/components/market/MarketCard.tsx`)
- Replaced `hasVoted` state with `showVoteModal` and `selectedSignal` states
- Updated vote button handlers:
  - `handleVoteOption(e, signal)` - Opens VoteModal with selected signal
  - `handleVoteModalClose()` - Closes modal and resets state
  - `handleVoteSuccess()` - Callback for successful votes
- Integrated `<VoteModal>` component with market data props

## Vote Flow Logic

1. User clicks "Vote" button on market card
2. Card shows optionA and optionB buttons
3. User clicks an option → VoteModal opens
4. Modal fetches fresh market data and payment token address
5. User selects their vote (optionA = true, optionB = false)
6. User enters spending amount
7. Submit logic:
   - **ETH Payment** (paymentToken is zero address):
     - Call `vote(_signal, _market, _marketBalance)` with `msg.value = _marketBalance`
   - **Token Payment** (paymentToken is valid address):
     - Check `allowance(user, contract)` on the token
     - If insufficient, call `approve(contract, amount)` and wait for confirmation
     - Call `vote(_signal, _market, _marketBalance)` with `msg.value = 0`
8. Show success state and close modal

## Smart Contract Interface
```solidity
function vote(bool _signal, uint256 _market, uint256 _marketBalance) external payable
```
- `_signal`: true for optionA, false for optionB
- `_market`: The market index number
- `_marketBalance`: Amount to stake (in wei for ETH, or token units)
