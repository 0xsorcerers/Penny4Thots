# Commit Summary: Vote UI Feature Implementation

## Overview
Implemented a comprehensive full-screen voting modal with dynamic background imagery. When users click voting options in market cards or on market detail pages, an elegant modal appears with the market's poster image as a blurred, semi-transparent background. The backdrop opacity transitions smoothly between the option selection step (darker) and the amount entry step (lighter) for visual hierarchy.

## Files Changed

### New Files
- `webapp/src/components/market/VoteModal.tsx` - Full-screen voting modal component with background imagery

### Modified Files
1. `webapp/src/tools/utils.tsx` - Added ERC20 token functions for approval flow
2. `webapp/src/components/market/MarketCard.tsx` - Updated to trigger page-level modal
3. `webapp/src/components/market/MarketGrid.tsx` - Added vote callback prop
4. `webapp/src/pages/Index.tsx` - Added page-level VoteModal with market image support
5. `webapp/src/pages/MarketPage.tsx` - Added page-level VoteModal with market image support

## Key Features

### Visual Design
- **Background Image**: Uses the market's poster image as the modal backdrop with `mixBlendMode: "overlay"`
- **Dynamic Opacity**:
  - Option selection step: `0.75` opacity (darker, more focused)
  - Amount entry step: `0.55` opacity (lighter, less intrusive)
  - Image opacity: `0.4` and `0.25` respectively
- **Smooth Transitions**: 300ms duration transitions between steps
- **Blur Effect**: `backdrop-blur-md` for depth and readability

### Modal Structure
**3-Step Voting Flow:**
1. **Option Selection** - User chooses between optionA (signal=true) or optionB (signal=false)
2. **Amount Entry** - User inputs spending amount in ETH or tokens
3. **Success State** - Shows confirmation before auto-closing

### VoteModal Props
```typescript
interface VoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitVote: (params: VoteParams) => Promise<void>;
  isLoading?: boolean;
  marketId: number;
  marketTitle: string;
  marketImage?: string;           // NEW: Market poster image
  optionA?: string;
  optionB?: string;
}
```

### Payment Logic
- **ETH Payment** (zero address): Direct vote call with `msg.value = amount`
- **Token Payment** (valid address):
  1. Read current allowance
  2. Approve token if insufficient allowance
  3. Submit vote with `msg.value = 0`

## Technical Implementation

### Vote Submission Flow
```
User clicks optionA/optionB button on card/page
    ↓
MarketCard/MarketPage calls onVoteClick(marketId, signal)
    ↓
Index.tsx/MarketPage.tsx opens VoteModal with market data + image
    ↓
Modal fetches fresh market data and payment token address
    ↓
User selects position → enters amount → clicks "Submit Vote"
    ↓
Parent page checks if ETH or Token payment:
    ETH path: Direct vote call with msg.value
    Token path: Check allowance → approve if needed → vote call
    ↓
Transaction submitted to blockchain
    ↓
Modal shows success state (1.5s)
    ↓
Markets refreshed from blockchain (Index.tsx only)
    ↓
Modal auto-closes
```

### ERC20 Token Functions
- `isZeroAddress(address)` - Check if token is zero address (ETH)
- `readTokenAllowance(tokenAddress, owner, spender)` - Read ERC20 allowance
- `prepareTokenApprove(tokenAddress, amount)` - Prepare approval transaction
- `useTokenApprove()` - React hook for token approval with receipt confirmation

### Background Opacity Transitions
The modal background uses `motion.div` with animated opacity:
```typescript
animate={{
  opacity: step === "select" ? 0.75 : 0.55,
}}
transition={{ duration: 0.3 }}
```

This creates a smooth visual feedback system where:
- Selection step has darker overlay (more focused, darker market image)
- Amount step has lighter overlay (less intrusive, easier to focus on input)

## Smart Contract Interface
```solidity
function vote(bool _signal, uint256 _market, uint256 _marketBalance) external payable
```
- `_signal`: true for optionA, false for optionB
- `_market`: The market index number
- `_marketBalance`: Amount to stake (wei for ETH, token units for tokens)
- `msg.value`: ETH amount when using ETH payment, 0 for token payment


