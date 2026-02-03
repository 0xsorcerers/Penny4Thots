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
  - Selecting an option opens a VoteDialog asking for the amount of ETH to send
  - Vote amount cannot be zero
  - Before voting, fresh market data is fetched from the blockchain to ensure current state
- **Custom Voting Options**: Market creators can set custom voting option labels (e.g., "Approve"/"Reject" or "Bull"/"Bear") up to 20 characters each
- **Trade Button**: Shows Buy/Sell options when enabled for a market

### Market Grid Header
- **Create Market Button**: Standard button to create a new prediction market
- **Refresh Markets Button**: Circular button with rotating refresh icon next to Create Market. Clears all markets from local cache and fetches fresh data from the blockchain on user request.

### Market Card Button Flow
- **Initial state**: Shows "Vote" button as the primary action
- **Vote expanded**: Clicking Vote shows custom option buttons (default: "Yes"/"No" or custom labels set by creator)
- **Vote Dialog**: Selecting an option opens a dialog asking for ETH amount to send with the vote
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
- On initial load, app fetches up to 50 most recent markets from blockchain
- Subsequent loads check if new markets have been added since last fetch
- If no new markets, only refreshes market data (votes, balances, activity)
- If new markets exist, fetches all market info and data
- Users can manually clear cache with refresh button to force full reload

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
