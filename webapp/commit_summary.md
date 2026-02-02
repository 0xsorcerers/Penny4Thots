# Blockchain RPC Optimization - Commit Summary

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
