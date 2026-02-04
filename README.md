# Penny4Thots

Monorepo containing the frontend webapp and backend services for Penny4Thots.

Structure:

- `webapp/` — React frontend (Thirdweb wallet integration, Tailwind)
- `backend/` — API and server code (if present)

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

Setup

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

Notes

- This repository was initialized and a first professional commit was made locally. You can push to GitHub with the instructions below.
