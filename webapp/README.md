# Penny4Thots - Web3 Prediction Market

A beautifully animated Web3 prediction market app where users can create and participate in prediction markets on any topic. Powered by thirdweb for wallet connectivity.

## Features

- **3D Animated Welcome Page**: Eye-catching landing page with 3D CSS cube animations, floating particles, and interactive mouse-following effects. Includes thirdweb wallet connector for authentication.
- **Market Discovery**: Browse all prediction markets with tag-based filtering and search
- **Create Markets**: Create new prediction markets with title, subtitle, description, poster image, and up to 7 tags
- **Vote YES/NO**: Each market has a dedicated page where users can cast their vote
- **Trading System**: Markets have a `tradeOptions` hook - when enabled, users can access BUY/SELL functionality
- **Beautiful UI**: Dark theme with gold/amber primary color, teal accents, and smooth animations powered by Framer Motion
- **Web3 Integration**: thirdweb wallet connectivity supporting multiple wallets (Binance, Coinbase, WalletConnect) and social logins

## Tech Stack

- React + TypeScript
- Vite
- TailwindCSS + shadcn/ui
- Framer Motion for animations
- Zustand for state management
- React Router for navigation
- thirdweb for Web3 wallet connectivity

## Pages

1. **Welcome** (`/`) - 3D animated intro page with thirdweb connector button
2. **Markets List** (`/app`) - After connecting, shows all markets with filtering
3. **Market Detail** (`/market/:id`) - Individual market page with voting and trading

## State Management

Using Zustand with persistence - markets and app state are saved to localStorage.

### Market Data Separation (Optimized RPC Usage)
The app now separates immutable market information from volatile market data to reduce blockchain RPC calls:

- **MarketInfo** (cached): Title, subtitle, description, image, tags
  - Fetched once when new markets are created
  - Persisted to localStorage
  - Only re-fetched when `marketCount` increases

- **MarketData** (refreshable): Creator, status, balance, voting counts
  - Fetched independently via `fetchMarketDataFromBlockchain()`
  - Can be updated frequently without fetching market info
  - Enables efficient state updates without stressing RPC endpoints

### Deep-Link Support
The app supports direct links to individual market pages (`/market/:id`). The `useMarketDataHydration` hook ensures:

1. Market data is fully loaded before the page renders (same as normal flow)
2. If the linked market is outside the 50 most recent markets, it's specifically included in the fetch
3. After voting, the store is refreshed to show updated data immediately

This ensures users arriving via deep-links get the same experience as users who navigate through the app normally.

## Design System

- **Fonts**: Syne (headings), Outfit (body), Space Mono (code/tags)
- **Colors**: Dark background with gold primary, teal accent, green for YES, red for NO
- **Logo**: Custom Penny4Thots logo (`/public/white-on-background.png`)
