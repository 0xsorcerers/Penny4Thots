# Commit Summary 

feat: initial commit - Penny4Thots prediction market platform 

- Implement Thirdweb wallet integration and authentication flow 
  - GetStartedPage.tsx: Web3 login component with Connector 
  - Index.tsx: Protected routes showing market only after auth 
  - Welcome.tsx: Landing page with wallet connection 
  
- Polish UI/UX with theme-aware design 
  - Custom slim scrollbars (5px) for light/dark themes 
  - Brand color integration with primary accent (#7FFF00) 
  - Cross-browser scrollbar support (Webkit + Firefox) 
  - Fixed pointer-events blocking on interactive elements 
  
- Establish project structure and documentation 
  - Comprehensive .gitignore 
  - README with setup instructions 
  - TypeScript + React 18 + Tailwind setup 
  
- Stack: React, Thirdweb, Tailwind, TypeScript, React Router, React Query" 



# Smart Contract Integration & Voting UI Enhancement

## Overview
-Implemented comprehensive voting system with market deletion, refresh functionality, and new smart contract integration. Updated MarketInfo to include feetype field and implemented vote() function with dynamic payment handling. Added market count check optimization to avoid unnecessary blockchain calls when no markets exist.

## Smart Contract Changes

### Updated MarketInfo Struct
- Added `feetype: bool` field to track token-gated payment markets
- Tracks whether a market requires token payments vs ETH payments

### New Vote Function
- `vote(bool _signal, uint256 _market, uint256 _marketBalance) external payable`
- Allows users to vote on markets with dynamic payment amounts
- Signal: true for YES, false for NO
- Market: Market index number
- MarketBalance: Amount to send with vote (msg.value or token transfer based on feetype)

### Updated writeMarket Function
- Enhanced with new parameters:
  - `bool _signal` - Initial vote direction
  - `bool _feetype` - Whether market uses token-gated payments
  - `address _paymentToken` - Token address for payment (if feetype = true)

### Payment Token Map
- `paymentTokens()` mapping stores token addresses by market index
- Read via `readPaymentToken(marketId)` function
- Cached locally in browser localStorage to avoid repeated blockchain calls
- Only fetched once per market, then archived for future reference

## Frontend Changes

### New Components

#### VoteDialog Component (`webapp/src/components/market/VoteDialog.tsx`)
- Modal dialog for voting with amount input
- Displays vote direction with custom option labels (truncated to 9 characters)
- Prevents zero-value votes with validation
- Shows warning about non-zero amount requirement
- Loading states during vote submission
- Automatically closes on successful vote
- Supports custom voting option labels (optionA/optionB)

### Updated Components

#### MarketCard (`webapp/src/components/market/MarketCard.tsx`)
- **Delete Button**: Red (X) icon in top-right corner
  - Appears on hover
  - Removes market from local cache via `deleteMarket(indexer)`
  - Left-hand blockchain data untouched (can be fetched fresh on refresh)
  - Shows success toast on deletion

- **Enhanced Vote Flow**:
  1. User clicks "Vote" button
  2. Custom voting option buttons expand (e.g., "Approve", "Reject" or "Yes", "No")
  3. Options displayed with 9-character truncation on percentage display
  4. User selects option
  5. VoteDialog opens with selected option and amount input
  6. Before voting, `fetchMarketDataFromBlockchain()` called to get fresh market state
  7. Vote is submitted with specified amount
  8. Success toast shown

- **Voting Option Labels**:
  - Displays full option text in expanded vote buttons
  - Truncates to 9 characters on vote percentage display
  - Supports custom labels set during market creation (default: "Yes", "No")
  - Helper function `truncateOption()` handles 9-char limit for card display

- **Imports**: Added `useVote` hook, `VoteDialog`, market store deletion
- **State Management**:
  - `voteDialogOpen` - Controls dialog visibility
  - `voteSignal` - Tracks option A/B selection
  - `isRefreshingData` - Loading state during market data refresh

#### MarketGrid (`webapp/src/components/market/MarketGrid.tsx`)
- **Refresh Button**:
  - Circular button with RotateCcw icon
  - Positioned next to "Create Market" button in header
  - Full rotation animation while refreshing
  - Clears all markets from local cache via `clearAllMarkets()`
  - Re-fetches all markets fresh from blockchain
  - Disabled during active operations (refresh or load)
  - Tooltip: "Refresh all markets from blockchain"

- **Props**: Added `onRefreshMarkets` callback
- **State**: `isRefreshing` tracks refresh operation status

### Updated Backend Integration

#### utils.tsx (`webapp/src/tools/utils.tsx`)

**Type Updates:**
- `MarketInfo` interface: Added `optionA`, `optionB`, `feetype` fields
- `MarketInfoFormatted` interface: Same additions with proper typing
- `WriteMarketParams` interface: Made `optionA`, `optionB`, `feetype`, `paymentToken` optional with defaults
- `VoteParams` interface: New type for vote transaction parameters

**New Functions:**
- `readPaymentToken(marketId: number): Promise<Address>` - Fetches payment token for market
- `prepareVote(params: VoteParams)` - Prepares vote transaction
- `useVote()` - Hook for executing vote transactions

**Updated Functions:**
- `readMarketInfo()` - Now maps all fields including optionA, optionB, feetype
- `prepareWriteMarket()` - Updated method signature to include _signal, _feetype, _paymentToken parameters
  - When `feetype = false`: Sends marketBalance + fee as `msg.value` (ETH payment)
  - When `feetype = true`: Sends only fee as `msg.value` (token payment, future implementation)

### Store Updates (`webapp/src/store/marketStore.ts`)

**New Methods:**
- `deleteMarket(indexer: number)` - Removes single market from local cache
  - Removes from markets array
  - Removes from marketInfos array
  - Removes from marketDataMap

- `clearAllMarkets()` - Clears all markets
  - Resets markets to []
  - Resets marketInfos to []
  - Resets marketDataMap to new Map()

### Page Updates (`webapp/src/pages/Index.tsx`)

- **Market Count Optimization**:
  - `loadMarketsFromBlockchain()` now checks market count first via `readMarketCount()`
  - If count is 0, immediately returns without fetching markets (early exit)
  - This avoids unnecessary blockchain calls when no markets exist
  - Clears local state if market count drops to zero
  - Sets `lastFetchedCount` to 0 for subsequent syncs

- `handleRefreshAllMarkets()` callback:
  - Calls `clearAllMarkets()` to reset local state
  - Resets `lastFetchedCount` to 0
  - Triggers `loadMarketsFromBlockchain()` for fresh fetch

- Passes `onRefreshMarkets={handleRefreshAllMarkets}` to MarketGrid

## Data Flow

### Voting Process
1. User clicks Vote on market card
2. Card shows YES/NO buttons
3. User clicks YES or NO
4. VoteDialog opens with selected signal
5. VoteDialog calls `fetchMarketDataFromBlockchain()` for fresh market data
6. User enters vote amount (must be > 0)
7. `useVote()` hook executes vote transaction
8. Transaction includes:
   - signal: true/false (YES/NO)
   - market: market index number
   - marketBalance: vote amount in wei
9. Payment handling:
   - If feetype = false: amount sent as msg.value (ETH)
   - If feetype = true: amount sent as ERC20 token transfer
10. Toast notification on success or error

## Custom Voting Options Feature

### Market Creation Enhancement
- Users can now customize voting option labels during market creation
- **Constraints**:
  - Maximum 20 characters per option
  - Defaults to "Yes" and "No" if not specified
  - Examples: "Bull/Bear", "Approve/Reject", "Bullish/Bearish"

### CreateMarketModal Updates (`webapp/src/components/market/CreateMarketModal.tsx`)
- Added "Voting Options" input fields in Step 1
- Two input fields side-by-side for Option A and Option B
- Character counter for each option (0-20 chars)
- Live text truncation to enforce 20 character limit
- Options displayed in Step 2 confirmation summary
- Validation ensures options are properly set before submission

### Display and Truncation
- **Create Modal**: Full option text visible (max 20 chars)
- **Market Cards**: Options truncated to 9 characters
  - Example: "Approve Proposal" → "Approve..."
  - Used in vote percentage display
- **Vote Buttons**: Full option text displayed
- **VoteDialog**: Full option text displayed with vote selection

### Type Updates
- `CreateMarketData` interface: Added `optionA` and `optionB` fields
- `Market` interface: Added optional `optionA` and `optionB` fields
- `MarketInfoFormatted` interface: Includes `optionA` and `optionB` from blockchain
- All store updates ensure custom options are preserved through market lifecycle

### Backend Integration
- `WriteMarketParams`: Now includes `optionA` and `optionB` parameters
- `prepareWriteMarket()`: Passes options to smart contract (indices 5-6 in info array)
- Fallback to "Yes"/"No" if not provided maintains backward compatibility
- **Payment Handling**:
  - `feetype = false`: User's Spending Amount sent as `msg.value` (ETH payment)
    - Total: `fee + marketBalance` sent as `msg.value`
  - `feetype = true`: Only `fee` sent as `msg.value` (token payment, future implementation)
    - Will support ERC20 token transfers when implemented

### Market Count Optimization
1. App calls `readMarketCount()` first on initial load
2. If count is 0, immediately returns (no markets to fetch)
3. Clears local cache if market count is zero
4. If count > 0, proceeds with normal fetch flow
5. Subsequent loads check if count has changed
6. This eliminates unnecessary RPC calls when blockchain has no markets

### Market Deletion
1. User hovers over market card
2. Delete (X) button appears
3. User clicks delete button
4. `deleteMarket(indexer)` removes from local cache
5. Market disappears from grid
6. Blockchain data unchanged
7. Market can be re-fetched via refresh button

### Market Refresh
1. User clicks refresh button
2. `clearAllMarkets()` removes all markets from cache
3. `lastFetchedCount` reset to 0
4. `loadMarketsFromBlockchain()` called
5. App fetches up to 50 most recent markets
6. Grid updates with fresh data
7. All votes, balances, and activities are current

## Payment Token Caching Strategy

```
Initial Load:
- User votes on market without cached payment token
- readPaymentToken(marketId) called
- Token address fetched and archived in localStorage
- Stored with market metadata

Subsequent Loads:
- Payment token read from localStorage if present
- No blockchain call needed
- Reduces RPC load and improves performance

Cache Invalidation:
- Only cleared if user clears all markets via refresh
- Otherwise persistent across browser sessions
```

## Type Safety Improvements
- All new functions properly typed with TypeScript
- VoteParams interface ensures correct parameter structure
- Optional fields with default values prevent breaking changes
- Error handling for missing market indexers

## UX Enhancements
1. **Visual Feedback**:
   - Delete button appears on hover only
   - Refresh button rotates during operation
   - VoteDialog shows clear vote direction
   - Toast notifications for all actions

2. **Data Freshness**:
   - Market data refreshed before voting
   - Full cache refresh available on demand
   - Smart loading avoids unnecessary blockchain calls

3. **Error Prevention**:
   - Zero-amount vote validation
   - Market indexer existence checks
   - Transaction failure handling with user messages

## Performance Considerations
- Payment token caching reduces RPC calls
- Smart market loading avoids redundant fetches
- VoteDialog lazy-loads only when needed
- Rotation animation uses efficient CSS transforms

## Testing Points
1. Delete individual market from card
2. Refresh all markets with button
3. Vote on market with various amounts
4. Verify feetype handling (ETH vs token)
5. Check payment token caching behavior
6. Confirm market data refreshes before vote
7. Test zero-amount vote rejection
8. Verify toast notifications appear

# Blockchain RPC Optimization -

## Overview
Implemented a dual-fetch strategy to reduce blockchain RPC calls by separating immutable market info from volatile market data. This allows us to cache market information locally while independently updating market data.

## Changes Made

### 1. **Updated Blockchain Data Structures** (src/tools/utils.tsx)
- **MarketData Interface**: Extended to include option voting data
  - Added `optionA`, `aVotes`, `optionB`, `bVotes` fields
  - These fields represent the two options and their vote counts
- **New Interfaces**:
  - `MarketDataFormatted`: Formatted market data response with bigint conversions to strings/numbers
  - `MarketCombined`: Combined interface for type composition

### 2. **Split Read Functions** (src/tools/utils.tsx)
- **readMarketInfo(ids)**: Reads immutable market info (title, subtitle, description, image, tags)
  - Results can be safely cached in localStorage
  - Only called when new markets are created
- **readMarketData(ids)**: Reads volatile market data (creator, status, balance, voting data)
  - Called independently to refresh market state
  - Can be called at higher frequency without stressing RPC

### 3. **New Market Fetch Functions** (src/tools/utils.tsx)
- **fetchMarketsFromBlockchain()**: Fetches last 50 market infos (unchanged in behavior)
- **fetchMarketDataFromBlockchain(ids)**: New function to fetch market data for specific IDs

### 4. **Refactored Market Store** (src/store/marketStore.ts)
- **Dual State Management**:
  - `marketInfos`: Array of immutable market info data
  - `marketDataMap`: Map<indexer, MarketData> for volatile market data
  - `markets`: Computed combined view for backward compatibility
- **New Methods**:
  - `setMarketsFromBlockchain(infos, dataMap)`: Sets both info and data
  - `updateMarketData(dataMap)`: Updates only market data without touching info
- **Persistence**: localStorage now persists both marketInfos and marketDataMap

### 5. **Updated Market Hook** (src/hooks/useMarkets.ts)
- Split hook to return separate `marketInfo` and `marketData`
- New methods:
  - `fetchMarketInfoByIds()`: Fetch specific market infos
  - `fetchMarketDataByIds()`: Fetch specific market data
- Parallel fetching for both info and data simultaneously

### 6. **Smart Index Page Fetch Logic** (src/pages/Index.tsx)
- **Implemented Smart Caching**:
  - Tracks `lastFetchedCount` to detect new markets
  - If market count unchanged: only refreshes market data (cheap call)
  - If market count increased: fetches new market infos and all market data
- **Optimized Flow**:
  1. Read market count
  2. Compare with last fetched count
  3. If equal: only call `fetchMarketDataFromBlockchain()`
  4. If greater: call both `fetchMarketsFromBlockchain()` and `fetchMarketDataFromBlockchain()`

## Benefits

✅ **Reduced RPC Calls**: Market info only fetched once per session (cached in localStorage)
✅ **Independent Updates**: Market data can be refreshed without re-fetching immutable info
✅ **Smart Caching**: Only fetches new markets when market count increases
✅ **Flexible Fetching**: Enables different update strategies for different data types
✅ **Better Scalability**: Can handle frequent market data updates without stressing RPC

## Technical Implementation Details

### Data Flow
```
User connects
  → Read marketCount
  → No markets cached? Fetch all info + data
  → Markets cached? Only fetch data

Market created
  → marketCount increases
  → Smart fetch detects this
  → Fetches new market infos + refreshes all data

During session
  → Can call fetchMarketDataFromBlockchain() frequently
  → Market info remains cached from initial fetch
```

### Backward Compatibility
- `markets` state still provides combined view for existing components
- MarketGrid and MarketCard components unchanged
- No breaking changes to existing UI

## Files Modified
- `src/tools/utils.tsx` - Blockchain read functions and market fetch logic
- `src/store/marketStore.ts` - Dual state management
- `src/hooks/useMarkets.ts` - Separated fetch methods
- `src/pages/Index.tsx` - Smart fetch strategy with caching

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


