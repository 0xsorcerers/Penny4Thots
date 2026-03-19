# Penny4Thots Progress Log

This file tracks all significant progress. Updated automatically after major changes.

---

## 2026-03-19

### Feature: HashKey Chain Integration + Network Theming
- Added HashKey Chain to supported networks with chain ID `177`, RPC `https://mainnet.hsk.xyz`, explorer `https://hashkey.blockscout.com`, token symbol `HSK`, 18 decimals, and contract `0x24C89D67d1C8B569fFe564b8493C0fbD1f55d7F7`.
- Added a dedicated light/dark HashKey visual theme tuned to the provided brand palette (lavender, violet, and deep ink tones) for a cleaner contemporary network identity.
- Updated per-network background image arrays so HashKey receives distinct light/dark art assets in the themed experience.
- Updated `CreateMarketModal` to use a whitesmoke modal shell background in light mode across networks (while keeping dark mode on themed `bg-card`) for stronger contrast against themed input fields.

## 2026-03-17

### Bug Fix: Initial All-Filter Zeroed Cards on Refresh
- Fixed default All-filter pagination path so the grid renders the parent-provided paginated market slice instead of the full filtered list.
- Added stale-request guards in main page market loading to prevent older async responses from overwriting newer hydrated market data.
- Result: cards no longer intermittently show 0 votes, 0 marketBalance, and 0 countdown values right after first load or refresh.

### Bug Fix: Closed-Market Toggle Data Hydration
- Fixed market data hydration so `fetchMarketDataFromBlockchain()` now batches reads across all requested IDs instead of silently truncating to the mutable read limit.
- Updated filtered/grid hydration flow to request mutable data for every market card currently being displayed when filters/search/toggle state changes.
- Result: switching Show/Hide Closed Markets across All, Trending, symbol, and token filters now keeps displayed cards hydrated with current market balance and status data.
- Updated market visibility buckets to always rebuild from mutable chain data during refresh so markets that close are immediately classified as closed/live correctly.
- Result: closed markets now consistently receive grayscale closed-card styling once fetched and no longer appear as active cards after toggle/filter refreshes.

---

## 2026-03-09

### Bug Fix: ERC20 Vote Flow Consistency
- Audited CreateMarketModal and VoteModal payment flow handling for ERC20 markets
- Fixed vote amount conversion to always respect the payment asset decimals instead of relying on float math
- Fixed My Thots and Your Thots vote retries to format insufficient ERC20 balances with the token's real decimals
- Fixed MarketPage vote flow to check ERC20 balance before allowance/approval and to use the active contract address as spender instead of a hardcoded address
- Result: ERC20 vote flows now consistently follow balance check -> allowance check -> approve if needed -> submit vote

---
### Bug Fix: History Claim Amount Decimals
- Fixed History page claim amount rendering for ERC20 tokens that do not use 18 decimals
- `getUserClaims()` now preserves raw on-chain claim amounts instead of formatting every value as ETH
- History now reads each market payment token's `symbol` and `decimals` before formatting claim amounts
- Zero-address payment tokens continue to use native ETH-style 18-decimal formatting with the selected network symbol
- History cache keys now include the active network chain ID, and cached entries are reused only when they already contain the new decimal-aware display metadata

---
## 2026-02-10

### Feature: Closed Market Button States
- Added `readMarketLock()` function to fetch `sharesFinalized` status from `allMarketLocks()` contract function
- **Main Feed (MarketCard)**: Closed markets now show disabled "Closed" button instead of "Vote"
- **Market Page**:
  - Checks `sharesFinalized` from contract to determine if market is still resolving
  - Shows "Penalty Window" while loading
  - Shows "Resolving Market" (gray, pulse animation) when `sharesFinalized = false`
  - Shows "Claim" / "Claim All (N)" when user has claimable positions
  - Shows disabled "Closed" button (dimmed) when user has no positions to claim
  - Status badge shows:
    - "Checking..." when sharesFinalized is loading
    - "Resolving" (amber) when sharesFinalized = false
    - "Ended" (red) when sharesFinalized = true
  - Countdown Timer text shows:
    - "Penalty Window" + "Voting is wrapping up." when sharesFinalized = false
    - "Ended" + "Voting is over." when sharesFinalized = true
- **My Thots Page**: Same button state logic as Market Page with emerald theme
- **Your Thots Page**: Same button state logic as Market Page with violet theme

### Feature: Batch Claim Implementation
- Added `getUserPositionCount()` function to get user's position count in a market
- Added `getUserPositionsInRange()` function to fetch positions with pagination
- Added `getAllUserPositions()` function with smart pagination (200 limit per call, 3s delay between batches)
- Added `useBatchClaim()` hook for batch claiming rewards from multiple positions
- Updated MarketPage claim button with dynamic text:
  - Shows "Loading positions..." while fetching
  - Shows "No positions to claim" when user has no positions
  - Shows "Claim" for single position
  - Shows "Claim All (N)" for multiple positions (e.g., "Claim All (4)")
- Full integration with `batchClaim(marketId, positionIds[])` smart contract function

### Feature: Market Card Enhancements
- **Main Feed (MarketCard)**: Closed markets now dimmed with 60% opacity and grayscale filter for visual distinction
- **My Thots Page (MarketCardMyThots)**:
  - Vote button replaced with dynamic state-based buttons
  - Active markets: "Vote on Your Thot"
  - Closed & claimable: "Claim" or "Claim All (N)" button
  - Closed & resolving: "Resolving Market" message
  - Fetches user positions automatically when market is claimable
- **Your Thots Page (MarketCardYourThots)**:
  - Vote button replaced with dynamic state-based buttons
  - Active markets: "Vote Again"
  - Closed & claimable: "Claim" or "Claim All (N)" button
  - Closed & resolving: "Resolving Market" message
  - Fetches user positions automatically when market is claimable

---

## 2026-03-09

### Bug Fix: ERC20 Vote Flow Consistency
- Audited CreateMarketModal and VoteModal payment flow handling for ERC20 markets
- Fixed vote amount conversion to always respect the payment asset decimals instead of relying on float math
- Fixed My Thots and Your Thots vote retries to format insufficient ERC20 balances with the token's real decimals
- Fixed MarketPage vote flow to check ERC20 balance before allowance/approval and to use the active contract address as spender instead of a hardcoded address
- Result: ERC20 vote flows now consistently follow balance check -> allowance check -> approve if needed -> submit vote

---
### Bug Fix: History Claim Amount Decimals
- Fixed History page claim amount rendering for ERC20 tokens that do not use 18 decimals
- `getUserClaims()` now preserves raw on-chain claim amounts instead of formatting every value as ETH
- History now reads each market payment token's `symbol` and `decimals` before formatting claim amounts
- Zero-address payment tokens continue to use native ETH-style 18-decimal formatting with the selected network symbol
- History cache keys now include the active network chain ID, and cached entries are reused only when they already contain the new decimal-aware display metadata

---
## 2026-02-09

### Git Sync Fix
- Fixed critical issue where Vibecode workspace was not synced with GitHub repo
- Added `github` remote pointing to `github.com/0xsorcerers/Penny4Thots.git`
- Merged 30+ missing commits from GitHub into Vibecode
- Set up CLAUDE.md rules to always push to BOTH remotes

### UI Improvements
- Moved market status badge after votes count in meta info section
- Changed vote button to polished bronze color
- Claim and resolving buttons use distinct colors

### Feature: Market Status & Claims
- Added `closed` property to marketInfo data
- Integrated `isClaimable` smart contract function
- Users can now see if closed markets are claimable

### Feature: User Pages Refresh
- Added refresh functionality to My Thots, Your Thots, and History pages
- Refresh updates local storage database for persisted data
- Fixed filtering bug for valid index on user pages

### Bug Fixes
- Fixed Thirdweb modal closure issues
- Fixed Thirdweb social rendering modal drop
- Reinstalled dependencies to resolve conflicts

---

## 2026-03-09

### Bug Fix: ERC20 Vote Flow Consistency
- Audited CreateMarketModal and VoteModal payment flow handling for ERC20 markets
- Fixed vote amount conversion to always respect the payment asset decimals instead of relying on float math
- Fixed My Thots and Your Thots vote retries to format insufficient ERC20 balances with the token's real decimals
- Fixed MarketPage vote flow to check ERC20 balance before allowance/approval and to use the active contract address as spender instead of a hardcoded address
- Result: ERC20 vote flows now consistently follow balance check -> allowance check -> approve if needed -> submit vote

---
### Bug Fix: History Claim Amount Decimals
- Fixed History page claim amount rendering for ERC20 tokens that do not use 18 decimals
- `getUserClaims()` now preserves raw on-chain claim amounts instead of formatting every value as ETH
- History now reads each market payment token's `symbol` and `decimals` before formatting claim amounts
- Zero-address payment tokens continue to use native ETH-style 18-decimal formatting with the selected network symbol
- History cache keys now include the active network chain ID, and cached entries are reused only when they already contain the new decimal-aware display metadata

---
## 2026-02-08

### Feature: User Dashboard Pages
- Built My Thots page (user's created markets)
- Built Your Thots page (markets user voted on)
- Built History page (claim history)
- Added slick dropdown menu navigation

### Smart Contract Integration
- Added `getUserThots()`, `getUserMarkets()`, `getUserClaimHistory()` read functions
- Implemented pagination with start/finish range parameters
- Added blacklist feature to smart contract

### Navigation & UX
- Back button now returns to previous page (My Thots/Your Thots) correctly
- Enhanced claim history display

---

## 2026-03-09

### Bug Fix: ERC20 Vote Flow Consistency
- Audited CreateMarketModal and VoteModal payment flow handling for ERC20 markets
- Fixed vote amount conversion to always respect the payment asset decimals instead of relying on float math
- Fixed My Thots and Your Thots vote retries to format insufficient ERC20 balances with the token's real decimals
- Fixed MarketPage vote flow to check ERC20 balance before allowance/approval and to use the active contract address as spender instead of a hardcoded address
- Result: ERC20 vote flows now consistently follow balance check -> allowance check -> approve if needed -> submit vote

---
### Bug Fix: History Claim Amount Decimals
- Fixed History page claim amount rendering for ERC20 tokens that do not use 18 decimals
- `getUserClaims()` now preserves raw on-chain claim amounts instead of formatting every value as ETH
- History now reads each market payment token's `symbol` and `decimals` before formatting claim amounts
- Zero-address payment tokens continue to use native ETH-style 18-decimal formatting with the selected network symbol
- History cache keys now include the active network chain ID, and cached entries are reused only when they already contain the new decimal-aware display metadata

---
## 2026-02-07

### Feature: Deep-Link Authentication
- Implemented deep-link flow for market sharing
- Fixed authentication flow for shared links
- Users can now share market links that work for new users

### Real-time Updates
- Vote actions now update market data without page refresh
- Seamless UI updates after blockchain transactions

---

## 2026-03-09

### Bug Fix: ERC20 Vote Flow Consistency
- Audited CreateMarketModal and VoteModal payment flow handling for ERC20 markets
- Fixed vote amount conversion to always respect the payment asset decimals instead of relying on float math
- Fixed My Thots and Your Thots vote retries to format insufficient ERC20 balances with the token's real decimals
- Fixed MarketPage vote flow to check ERC20 balance before allowance/approval and to use the active contract address as spender instead of a hardcoded address
- Result: ERC20 vote flows now consistently follow balance check -> allowance check -> approve if needed -> submit vote

---
### Bug Fix: History Claim Amount Decimals
- Fixed History page claim amount rendering for ERC20 tokens that do not use 18 decimals
- `getUserClaims()` now preserves raw on-chain claim amounts instead of formatting every value as ETH
- History now reads each market payment token's `symbol` and `decimals` before formatting claim amounts
- Zero-address payment tokens continue to use native ETH-style 18-decimal formatting with the selected network symbol
- History cache keys now include the active network chain ID, and cached entries are reused only when they already contain the new decimal-aware display metadata

---
## 2026-02-06

### UI/CSS Overhaul
- Major CSS and aesthetics improvements
- Scaled UI components for better mobile experience

---

## 2026-03-09

### Bug Fix: ERC20 Vote Flow Consistency
- Audited CreateMarketModal and VoteModal payment flow handling for ERC20 markets
- Fixed vote amount conversion to always respect the payment asset decimals instead of relying on float math
- Fixed My Thots and Your Thots vote retries to format insufficient ERC20 balances with the token's real decimals
- Fixed MarketPage vote flow to check ERC20 balance before allowance/approval and to use the active contract address as spender instead of a hardcoded address
- Result: ERC20 vote flows now consistently follow balance check -> allowance check -> approve if needed -> submit vote

---
### Bug Fix: History Claim Amount Decimals
- Fixed History page claim amount rendering for ERC20 tokens that do not use 18 decimals
- `getUserClaims()` now preserves raw on-chain claim amounts instead of formatting every value as ETH
- History now reads each market payment token's `symbol` and `decimals` before formatting claim amounts
- Zero-address payment tokens continue to use native ETH-style 18-decimal formatting with the selected network symbol
- History cache keys now include the active network chain ID, and cached entries are reused only when they already contain the new decimal-aware display metadata

---
## How to Save Progress

Tell the AI any of these phrases:
- "save progress"
- "stable build"
- "commit our work"
- "push changes"

The AI will commit and push to BOTH GitHub and Vibecode servers automatically.




## 2026-03-14

### Bug Fix: Tag Filter Dialog Scrolling + Layout
- Fixed the market tag filter dialog so the tag list can scroll inside the modal when there are many tags.
- Updated the all-tags list layout from a multi-column grid to a simple wrapped flex row for easier scanning and tapping.
- Improved modal content sizing by using a flex column layout with a dedicated scrollable content region.


## 2026-03-15

### Feature: Data-Driven Market Filters
- Replaced tag-based filtering on the main Markets grid with new data-driven filter chips: All, Trending, and Marketcap
- Trending now sorts only live markets by highest activity first
- Marketcap now sorts only live markets by highest market balance first
- Added in-filter pagination support so filtered views still paginate at the existing page size
- Added market activity to shared market model/state mapping so the Trending sort can use blockchain market data

---

## 2026-03-15

### Update: Symbol vs Token Filters + Filter Hydration
- Replaced the previous `Marketcap` filter with `Symbol Markets` and `Token Markets`
- Classified markets using immutable `feetype` metadata (`false` = native symbol market, `true` = token market)
- Sorted Symbol/Token filter results by highest market balance first
- Added filtered-view hydration so visible cards in non-All filters fetch fresh page market data via batched marketId reads

---

## 2026-03-15

### Update: Added Trending + Network Symbol Filter Label
- Added `Trending` back into the market filter chips (now: All, Trending, [Network Symbol] Markets, Token Markets)
- Updated symbol-market chip label to use active network symbol (e.g. `ETH Markets` on Sepolia)
- Kept filtered views paginated and hydrated with fresh market data for visible IDs

---
