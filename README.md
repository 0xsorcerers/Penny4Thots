# Penny4Thots

Monorepo containing the frontend webapp and backend services for Penny4Thots on BNB Chain, Base, Scroll, Manta, opBNB and coming host of networks.
From those itchy sport bets with buds in front of the TV to Naruto for avid manga fans to even the cosmic predilections of the Zodiac, demo on Sepolia to understand how to create or vote on your 'thots' as well as the thoughts of others before going live on any mainnet of choice. 

# Value Proposition
✅ Zero-sum take to Prediction Marketplaces.

✅ Lowers the barrier of entry into prediction marketplaces by allowing users to use native coins or any token on their network of choice.

✅ Creators earn market fees for their thots.

✅ Communities vote to stake a position.

✅ Users can vote multiple times to increase their stake and vote any side they choose every time.

✅ Users can earn yield in various promotional tokens by engaging.

✅ Time and capital weighted positions, the earlier one stakes the more one keeps for winning positions!

✅ Penalty window to game the gamers.

✅ Simplified dual option system, just more profit less risk.

✅ Kamikaze trades are available to cut your losses and reposition you for the win!

✅ Decentralized cross model AI consensus from Anthropic, Grok, Deepseek, OpenAI, Perplexity and a coming host of others to decide on your 'thots'.

Have fun engaging a prediction market that trades your very own thoughts so why not earn a penny for your thoughts? (pun intended) 😉.


# Structure

- `webapp/` — React frontend (Thirdweb wallet integration, Tailwind)
- `backend/` — API and server code (if present)


# Setup

1. Frontend

```bash
cd webapp
npm install
npm run dev
```

2. Backend

```bash
cd backend
# install & run as appropriate for backend stack
```

### Network Switching & Multi-Chain Support

The app now supports multiple blockchain networks with per-network data persistence:

**Network Store (`webapp/src/store/networkStore.ts`)**:
- Manages selected network state using Zustand
- Persists user's last selected network in localStorage
- Provides `getCurrentNetwork()` helper for accessing network config outside React components
- Each network has: chainId, rpc, blockExplorer, decimals, symbol, and contract_address

**Dynamic Blockchain Configuration (`webapp/src/tools/utils.tsx`)**:
- `getBlockchain()` - Returns current network's blockchain config
- `getThirdwebNetwork()` - Creates dynamic Thirdweb network definition
- `getPublicClient()` - Creates Viem client for current network
- `getPenny4ThotsContract()` - Gets contract for current network
- All read/write operations automatically use the selected network's RPC and contract address

**Per-Network Data Persistence (`webapp/src/store/marketStore.ts`)**:
- Market data is stored with network-specific keys (e.g., `prediction-market-storage-chain-11155111`)
- When users switch networks, they see only markets from that network
- Switching back to a previous network retrieves that network's cached data
- Data is completely isolated per network—voting on one network doesn't affect another

**Header Network Dropdown**:
- Network selector in the header shows all available chains
- Clicking a network clears current markets and loads data for the new network
- Selected network is saved to localStorage for persistence across sessions

### Market Card Features
- **Delete Button**: Small delete (X) button in the top-right corner of each market card. Removes the market from your local cache without affecting the blockchain. The market can be fetched fresh on the next refresh.
- **Vote Button Flow**:
  - Clicking Vote shows custom voting option buttons (default: "Yes"/"No", max 20 chars each)
  - Options are truncated to 9 characters on market cards for display
  - Selecting an option marks the vote and transitions to Trade button
  - Before voting, fresh market data can be fetched from the blockchain
- **Custom Voting Options**: Market creators can set custom voting option labels (e.g., "Approve"/"Reject" or "Bull"/"Bear") up to 20 characters each
- **Trade Button**: Shows Buy/Sell options when enabled for a market

### Market Grid Header
- **Create Market Button**: Standard button to create a new prediction market
- **Refresh Markets Button**: Circular button with rotating refresh icon next to Create Market. Clears all markets from local cache and fetches fresh data from the blockchain on user request.
- **Your Profile Dropdown**: Slick dropdown menu button with user profile icon. Provides access to:
  - **My Thots**: View markets you've created (calls `getUserThots`)
  - **Your Thots**: View markets you've voted on (calls `getUserMarkets`)
  - **History**: View your claim history with detailed records (calls `getUserClaimHistory`)

### Market Card Button Flow
- **Initial state**: Shows "Vote" button as the primary action
- **Vote expanded**: Clicking Vote shows custom option buttons (default: "Yes"/"No" or custom labels set by creator)
- **After voting**: Transitions to Trade button for Buy/Sell options
- **Trade expanded**: Clicking Trade shows Buy/Sell buttons for trading
- This flow guides users: Vote → Trade, with expandable options at each step

### Market Page Behavior
- When a user opens a market page, the view automatically scrolls to the top
- This ensures users see the full market details without having to scroll
- Prevents the disorientation of landing on the bottom of the page

### Batch Claim Feature
When a market is closed and claimable:
- The app fetches the user's position count using `userPositionCount(marketId, address)`
- If positions exist, it retrieves all position IDs using `getUserPositions()` with pagination
- For large position counts (>200), the data is fetched in batches of 200 with 3-second delays between calls
- **Button Display**:
  - Shows "Loading positions..." while fetching user positions
  - Shows "No positions to claim" if user has no positions in the market
  - Shows "Claim" for a single position
  - Shows "Claim All (N)" when user has multiple positions (e.g., "Claim All (4)")
- Clicking the claim button calls `batchClaim(marketId, positionIds[])` to claim all rewards in one transaction

### Market Card States
- **Active Markets (Main Feed)**: Show "Vote" button normally
- **Closed Markets on Main Feed**: Dimmed with reduced opacity (60%) and grayscale filter to indicate they're inactive
- **My Thots Page**:
  - Active markets: Show "Vote on Your Thot" button
  - Closed & claimable: Show "Claim" or "Claim All (N)" button
  - Closed & resolving: Show "Resolving Market" message
- **Your Thots Page**:
  - Active markets: Show "Vote Again" button
  - Closed & claimable: Show "Claim" or "Claim All (N)" button
  - Closed & resolving: Show "Resolving Market" message

### Market Data Format
- **Tags**: Stored on-chain as comma-delimited strings (e.g., "crypto,bitcoin,prediction"). Max 7 tags.
- **Market Fetching**: App fetches up to 50 most recent markets from blockchain in descending order (newest first)
- **Contract**: Deployed on Sepolia testnet at `0x0217dFf6d795F4BaE2ed7DCEcb922cA65e84a417`

### Key Functions (webapp/src/tools/utils.tsx)
- `parseTags(string)` - Converts comma-delimited blockchain string to array
- `serializeTags(array)` - Converts array to comma-delimited string for storage
- `fetchMarketsFromBlockchain()` - Fetches up to 50 most recent markets
- `fetchMarketDataFromBlockchain(ids[])` - Fetches fresh market data for given market IDs
- `readMarketCount()` - Gets total market count from contract
- `readMarket(ids[])` - Reads specific market info by IDs
- `readMarketData(ids[])` - Reads specific market data by IDs
- `readPaymentToken(marketId)` - Reads payment token address for a market
- `useWriteMarket()` - Hook for creating new markets on-chain
- `useVote()` - Hook for voting on markets with amount
- `getUserThots(address, start, finish)` - Gets array of market IDs the user created
- `getUserMarkets(address, start, finish)` - Gets array of market IDs the user voted on
- `getUserClaimHistory(address)` - Gets array of ClaimRecord for user's claim history
- `getUserThotsCount(address)` - Gets count of user's created markets
- `getUserMarketsCount(address)` - Gets count of user's voted markets
- `getUserPositionCount(marketId, address)` - Gets count of user's positions in a specific market
- `getAllUserPositions(marketId, address)` - Gets all position IDs for a user in a market (with pagination for large datasets)
- `useBatchClaim()` - Hook for batch claiming rewards from multiple positions

### Tag Display
- Markets display first 3 tags directly on the card
- If more than 3 tags exist, a "+N tags" button appears on the card
- Clicking this button opens a modal with all tags for the market
- Modal has translucent background (`bg-card/95 backdrop-blur-sm`) for visibility through the overlay

### Filter Tags
- Filter bar displays a fixed 12 shuffled tags to keep the interface compact
- Tags are shuffled each time the market list updates, giving different tags visibility
- "+N more" button appears when there are more than 12 total tags
- Clicking the button opens a modal showing all available tags for filtering
- Users can select a tag to filter the market list
- Modal has translucent background for a clean, unobtrusive appearance

### Smart Market Loading
- On initial load, app first calls `readMarketCount()` to check if any markets exist
- If count is 0, immediately returns without fetching (no RPC calls wasted)
- If count > 0, proceeds to fetch market info and data from blockchain
- Subsequent loads check if new markets have been added since last fetch
- If no new markets, only refreshes market data (votes, balances, activity) silently
- If new markets exist, fetches all market info and data with loading state
- Users can manually clear cache with refresh button to force full reload

### Market Data Structure (Updated)
The market data has been updated to include the new shares system and market lifecycle features:

**MarketData Interface** (from smart contract):
- `creator` - Market creator's wallet address
- `status` - Boolean market status flag
- `marketBalance` - Total ETH/token balance in the market
- `activity` - Total transaction count/activity level
- `aVotes` - Number of votes for option A
- `bVotes` - Number of votes for option B
- **Shares System**:
  - `startTime` - Unix timestamp when shares trading begins
  - `endTime` - Unix timestamp when shares trading ends
  - `closed` - Boolean indicating if the market is closed
  - `winningSide` - Enum value (0=None, 1=A, 2=B) indicating the resolved outcome
  - `totalSharesA` - Total shares issued for option A
  - `totalSharesB` - Total shares issued for option B
  - `positionCount` - Number of total positions/trades in the market

### Market Timer Feature
Markets can have an end time that determines when voting closes:

**Create Market Modal**:
- Date and time picker in the market creation step - **now required**
- Minimum 1 hour from the current time (validated at submission time)
- Date picker pops up automatically when clicking the date or time input for easy access
- "Forgo & Auto-Set to 1.5 Hours From Submission" button: Click to automatically set the date/time to 1.5 hours from form submission
- When using forgo, the system will set the exact time at submission (not at form load)
- Form cannot proceed to next step without setting a date and time
- Clear visual feedback shows validation error if date is missing

**Countdown Timer Display**:
- Beautiful animated countdown timer component with urgency-based styling:
  - **Normal (>3 days)**: Cyan theme with timer icon
  - **Warning (1-3 days)**: Amber theme with clock icon
  - **Urgent (<24 hours)**: Orange theme with animated warning icon
  - **Critical (<1 hour)**: Red pulsing theme with animated flame icon
  - **Ended**: Slate theme with checkmark icon
- Compact version on market cards (next to vote stats and balance)
- Large version on MarketPage (after status badge with animated time blocks)
- Timer automatically updates every second

**Market Cards**:
- CountdownTimer displayed next to VoteStats on all market cards
- MarketBalance shown on Index, MyThots, and YourThots pages
- Payment token symbol fetched for each market to display correct currency

### Payment Method Selection
Both the Create Market dialog feature flexible payment method selection:

**Create Market Modal**:
- Payment toggle switch in the confirm step lets creators choose between ETH or any ERC20 token
- When "Pay with ETH" is selected: the label shows in primary color (gold in dark theme, emerald in light)
- When "Pay with Token" is selected: the label changes to accent color (cyan in dark theme, coral in light) with smooth 3D animation
- When token is selected, a separate input field appears for entering the ERC20 token address
- Real-time validation: when a valid 42-character address is entered, the app queries the blockchain to fetch and display the token symbol
- Invalid addresses show "invalid" in red; valid tokens show a green success message with the verified symbol
- The spending amount label dynamically updates to show "Pay with ETH" or "Pay with [TOKEN_SYMBOL]"
- The `_signal` parameter is set conditionally:
  - `false` when user creates the market with ETH payment
  - `true` when user creates the market with token payment
- `msg.value` is set conditionally:
  - When ETH payment: `msg.value = fee + marketBalance`
  - When token payment: `msg.value = fee` (marketBalance is handled by token transfer)

**Vote Modal**:
- Payment method is determined by the market's pre-set token address
- If market uses ETH (zero address), displays "Pay with ETH" label with primary color
- If market uses a token, automatically fetches the token's symbol via ERC20 `symbol()` call and displays "Pay with [TOKEN_SYMBOL]" with accent color
- Spending amount label dynamically shows the payment method
- No user choice for payment method—market creator's choice is enforced

### Vote Optimization
- When voting with a token payment, the app first checks the user's current allowance
- Only calls the approval transaction if allowance is insufficient
- If allowance is adequate from a previous approval, proceeds directly to voting
- This eliminates unnecessary approval transactions and saves gas for repeat voters

### Theme
The application uses dark mode as the default theme for all new users. Users can switch between light and dark mode at any time using the theme toggle button in the header.


# Notes

- This repository was initialized and a first professional commit was made locally. You can push to GitHub with the instructions below.
