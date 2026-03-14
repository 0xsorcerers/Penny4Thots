# Penny4Thots Progress Log

This file tracks all significant progress. Updated automatically after major changes.

---


## 2026-03-13

### UX Update: First-Time Visitor Home Preview
- Updated home/app routing behavior so first-time visitors without a connected wallet can land on the home page and preview the market list immediately
- Kept existing get-started login flow for disconnected returning users visiting `/app` directly
- Enabled market loading on `/` even without an active wallet, while preserving connected-user behavior

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

### Fix: First-Time User Homepage Preview Routing
- Added first-visit routing logic on `/` so disconnected users with no prior local cache go directly to the market grid page first.
- Persisted a one-time `localStorage` flag after the first visit, so later disconnected visits to `/` continue through the normal Welcome/Get Started flow.
- Kept connected users landing on the market grid experience directly.
