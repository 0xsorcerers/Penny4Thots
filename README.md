# Penny4Thots

Monorepo containing the frontend webapp and backend services for Penny4Thots.

Structure:

- `webapp/` — React frontend (Thirdweb wallet integration, Tailwind)
- `backend/` — API and server code (if present)

## Blockchain Integration

### Market Data Format
- **Tags**: Stored on-chain as comma-delimited strings (e.g., "crypto,bitcoin,prediction"). Max 7 tags.
- **Market Fetching**: App fetches up to 50 most recent markets from blockchain in descending order (newest first)
- **Contract**: Deployed on Sepolia testnet at `0x0217dFf6d795F4BaE2ed7DCEcb922cA65e84a417`

### Key Functions (webapp/src/tools/utils.tsx)
- `parseTags(string)` - Converts comma-delimited blockchain string to array
- `serializeTags(array)` - Converts array to comma-delimited string for storage
- `fetchMarketsFromBlockchain()` - Fetches up to 50 most recent markets
- `readMarketCount()` - Gets total market count from contract
- `readMarket(ids[])` - Reads specific market data by IDs
- `useWriteMarket()` - Hook for creating new markets on-chain

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
