# Commit Summary: Vote UI Feature Implementation

## Overview
Implemented a comprehensive voting UI feature with a full-screen modal that appears when users click voting options in market cards or on market detail pages. The modal handles both ETH and ERC20 token payments with automatic approval flow.

## Files Changed

### New Files
- `webapp/src/components/market/VoteModal.tsx` - Full-screen voting modal component

### Modified Files
1. `webapp/src/tools/utils.tsx` - Added ERC20 token functions
2. `webapp/src/components/market/MarketCard.tsx` - Updated to trigger page-level modal
3. `webapp/src/components/market/MarketGrid.tsx` - Added vote callback prop
4. `webapp/src/pages/Index.tsx` - Added page-level VoteModal
5. `webapp/src/pages/MarketPage.tsx` - Added page-level VoteModal and vote handlers

## Detailed Changes

### 1. VoteModal Component (`webapp/src/components/market/VoteModal.tsx`)
A full-screen modal dialog that:
- Dims entire background with dark overlay (`bg-black/70`) and backdrop blur
- Implements 3-step voting flow:
  1. **Option Selection**: User chooses between optionA (signal=true) or optionB (signal=false)
  2. **Amount Entry**: User inputs spending amount in ETH or tokens
  3. **Success State**: Shows confirmation before auto-closing
- Fetches fresh market data on open:
  - Calls `fetchMarketDataFromBlockchain()` for latest market state
  - Calls `readPaymentToken()` to determine if voting with ETH or tokens
- Modal accepts `onSubmitVote` callback from parent (page) to handle blockchain logic
- Uses simple steps: `"select" | "amount" | "success"`

### 2. ERC20 Token Functions (`webapp/src/tools/utils.tsx`)
Added utility exports for token approval:
- `ZERO_ADDRESS` constant - Marks ETH payment (no token)
- `isZeroAddress(address)` - Check if token is zero address
- `readTokenAllowance(tokenAddress, owner, spender)` - Read ERC20 allowance
- `prepareTokenApprove(tokenAddress, amount)` - Prepare approval transaction
- `useTokenApprove()` - React hook for token approval

### 3. MarketCard Updates (`webapp/src/components/market/MarketCard.tsx`)
- Added `onVoteClick` prop callback
- Simplified vote button logic - now triggers parent page handler instead of managing modal state
- Vote buttons call `onVoteClick(marketId, signal)` when clicked
- No modal state in component anymore - cleaner separation of concerns

### 4. MarketGrid Updates (`webapp/src/components/market/MarketGrid.tsx`)
- Added `onVoteClick` optional prop to interface
- Passes callback to each `<MarketCard>` instance
- MarketCards can now trigger votes from grid view

### 5. Index.tsx (Market List Page)
Added page-level VoteModal with:
- Vote modal state: `isVoteModalOpen`, `voteModalData`
- `handleVoteClick(marketId, signal)` - Opens modal with market data
- `handleSubmitVote(voteParams)` - Handles voting flow:
  - Checks wallet connection
  - For token payments: reads allowance, approves if needed, then votes
  - For ETH payments: votes directly with msg.value
  - Reloads market data after successful vote
- Vote modal passed to `<MarketGrid>` via callback

### 6. MarketPage.tsx (Market Detail Page)
Updated vote buttons to:
- Use new `handleVoteClick(signal)` handler
- Open page-level VoteModal
- `handleSubmitVote(voteParams)` with same logic as Index.tsx
- Removed old `hasVoted` state and local vote tracking

## Vote Submission Flow

```
User clicks optionA/optionB button
    ↓
MarketCard calls onVoteClick(marketId, signal)
    ↓
Index.tsx/MarketPage.tsx opens VoteModal
    ↓
User selects amount → clicks "Submit Vote"
    ↓
Parent page checks if ETH or Token payment:
    ETH path: Direct vote call with msg.value
    Token path: Check allowance → approve if needed → vote call
    ↓
Transaction submitted to blockchain
    ↓
Modal shows success state
    ↓
Markets refreshed from blockchain
    ↓
Modal auto-closes
```

## Smart Contract Interface
```solidity
function vote(bool _signal, uint256 _market, uint256 _marketBalance) external payable
```
- `_signal`: true for optionA, false for optionB
- `_market`: The market index number
- `_marketBalance`: Amount to stake (wei for ETH, token units for tokens)
- `msg.value`: ETH amount when using ETH payment, 0 for token payment

