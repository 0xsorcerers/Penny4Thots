# Penny4Thots Architecture Diagram

## System Overview

Penny4Thots is a multi-chain prediction marketplace where users create, vote on, and resolve prediction markets using AI adjudication.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Penny4Thots Ecosystem                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   Webapp (React) │◄────►│  Backend (Node)  │◄────►│  Smart Contract  │
│   Port: 8000     │      │  Port: 3000      │      │  Multi-chain     │
└──────────────────┘      └──────────────────┘      └──────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
   Thirdweb Wallet         AI Adjudication         Blockchain Networks
   (Multi-chain)           (Consensus Engine)      (BNB, Base, Scroll, etc.)
```

## Component Architecture

### 1. Frontend (webapp/)

```
webapp/
├── src/
│   ├── pages/              # Route pages
│   │   ├── Index.tsx       # Main market feed
│   │   ├── MarketPage.tsx  # Individual market view
│   │   ├── MyThots.tsx     # User's created markets
│   │   ├── YourThots.tsx   # User's voted markets
│   │   ├── History.tsx     # Claim history
│   │   └── Welcome.tsx     # Landing page
│   │
│   ├── components/         # UI components
│   │   ├── market/         # Market-specific components
│   │   ├── ui/             # Radix UI components
│   │   ├── layout/         # Layout components
│   │   └── profile/        # Profile components
│   │
│   ├── store/              # State management (Zustand)
│   │   ├── marketStore.ts  # Market data & caching
│   │   ├── networkStore.ts # Network selection
│   │   └── languageStore.ts # Language preferences
│   │
│   ├── tools/              # Utilities
│   │   ├── utils.tsx       # Blockchain interactions
│   │   └── networkData.ts  # Chain configurations
│   │
│   ├── hooks/              # Custom React hooks
│   │   ├── useMarkets.ts   # Market data fetching
│   │   ├── useTheme.ts     # Theme management
│   │   └── useMarketDataHydration.ts
│   │
│   └── lib/                # Library functions
│       ├── api.ts          # API calls
│       ├── languageTags.ts # Language detection
│       └── marketSearchIndex.ts
│
├── public/                 # Static assets
└── package.json            # Dependencies: React, Vite, Thirdweb, Viem, Radix UI
```

**Frontend Tech Stack:**
- React 18 + TypeScript
- Vite (build tool)
- Thirdweb SDK (wallet connection)
- Viem (blockchain interactions)
- Zustand (state management)
- Radix UI (component library)
- TailwindCSS (styling)
- React Router (routing)

### 2. Backend (backend/)

```
backend/
├── daemon.js               # Main AI adjudication daemon
├── penny4thot_abi.json     # Contract ABI
└── package.json            # Dependencies: Express, Ethers, AI SDKs
```

**Backend Tech Stack:**
- Node.js + Express
- Ethers.js (blockchain interaction)
- AI SDKs:
  - @anthropic-ai/sdk (Claude)
  - openai (GPT-5, GPT-4o)
  - Custom integrations (Gemini, Perplexity, Grok)

**Backend Responsibilities:**
- AI-powered market resolution
- Content moderation (blacklisting)
- Consensus engine for multi-AI adjudication
- Deterministic judge selection
- Blockchain event monitoring

### 3. Smart Contract (contracts/)

```
contracts/
└── penny4Thots_Shares_System_Co-Developed_With_OpenAI_ReDesigned_With_Grok.sol
```

**Contract Features:**
- Solidity 0.8.21
- OpenZeppelin ReentrancyGuard
- ERC20 token support
- Shares trading system
- Market lifecycle management
- Kamikaze trades (loss cutting)
- Time-weighted positions
- Multi-chain deployment

### 4. Verification (p4tverify/)

```
p4tverify/
├── src/
│   ├── penny4Thots.sol     # Foundry contract version
│   └── Counter.sol         # Test contract
├── script/                 # Deployment scripts
├── test/                   # Foundry tests
└── foundry.toml            # Foundry configuration
```

**Purpose:**
- Foundry-based smart contract testing
- Contract verification
- Gas optimization
- Deployment automation

## Data Flow

### Market Creation Flow

```
User → Webapp → Smart Contract → Blockchain
  1. User fills create market form
  2. Webapp calls useWriteMarket() hook
  3. Transaction sent to smart contract
  4. Contract creates market on-chain
  5. Market ID returned and stored in local cache
```

### Voting Flow

```
User → Webapp → Smart Contract → Blockchain
  1. User selects option (A/B)
  2. Webapp checks token allowance (if ERC20)
  3. If insufficient, calls approve() transaction
  4. Calls vote() contract function
  5. Position created on-chain
  6. Local cache updated with new vote data
```

### Market Resolution Flow

```
Blockchain → Backend → AI Consensus → Backend → Smart Contract
  1. Backend monitors for expired markets
  2. Fetches market data from blockchain
  3. Sends to AI adjudication system:
     - Deterministic judge selection (chief + junior)
     - Multiple AI models query (OpenAI, Anthropic, etc.)
     - Consensus engine tallies votes
  4. If consensus reached (2/3 agreement):
     - Backend calls contract to set winning side
  5. Market becomes claimable
```

### Claiming Flow

```
User → Webapp → Smart Contract → Blockchain
  1. User clicks "Claim" or "Claim All"
  2. Webapp fetches user positions
  3. Calls batchClaim() contract function
  4. Contract distributes rewards
  5. User receives tokens
```

## Multi-Chain Architecture

### Network Configuration

```
networkStore.ts (Zustand)
├── Selected network state
├── Network configurations:
│   ├── BNB Chain
│   ├── HashKeyChain
│   ├── Base
│   ├── Scroll
│   └── Sepolia (testnet)
└── Per-network data persistence
```

### Per-Network Data Isolation

```
localStorage keys:
├── prediction-market-storage-chain-56 (BNB)
├── prediction-market-storage-chain-97 (Base)
├── prediction-market-storage-chain-534352 (Scroll)
└── prediction-market-storage-chain-11155111 (Sepolia)
```

Each network maintains:
- Separate market cache
- Separate user positions
- Separate transaction history

## AI Adjudication System

### Judge Hierarchy

```
Chief Judges (Always sit):
├── Gemini (3-flash)
└── Perplexity (Sonar)

Junior Judges (Rotating):
├── OpenAI (GPT-5)
├── Anthropic (Claude Haiku)
└── Grok (4.1)
```

### Consensus Process

```
1. Deterministic Selection:
   - Seed: latestBlockHash + marketIndexer
   - Chiefs always included
   - 1 junior judge selected via deterministic shuffle

2. AI Query:
   - Each judge receives market data
   - Judges use web search for verification
   - Judges return decision (A or B)

3. Consensus:
   - Votes tallied
   - 2/3 majority required
   - If consensus: market resolved
   - If deadlock: market skipped (retry later)
```

## State Management

### Market Store (Zustand)

```
marketStore.ts:
├── markets: Market[]           # Combined market data
├── marketInfos: MarketInfo[]   # On-chain market info
├── marketDataMap: Map          # Market data by ID
├── languageTagsByMarketId     # Detected languages
├── hasStarted: boolean         # Initialization flag
└── isLoadingFromBlockchain     # Loading state

Actions:
├── setMarketsFromBlockchain()  # Load from chain
├── updateMarketData()          # Refresh market data
├── switchToNetworkCache()      # Switch network data
├── deleteMarket()              # Remove from cache
└── clearAllMarkets()           # Clear all data
```

### Network Store (Zustand)

```
networkStore.ts:
├── selectedNetwork: NetworkConfig
├── networks: NetworkConfig[]
└── getCurrentNetwork() helper

NetworkConfig:
├── chainId: number
├── rpc: string
├── blockExplorer: string
├── decimals: number
├── symbol: string
└── contract_address: string
```

## Key Features

### 1. Shares Trading System
- Users can buy/sell shares in market outcomes
- Time-weighted positions (earlier = more profit)
- Kamikaze trades to cut losses
- Share price based on market dynamics

### 2. Multi-Token Support
- Native coins (ETH, BNB, etc.)
- Any ERC20 token
- Creator chooses payment method
- Automatic allowance optimization

### 3. Market Lifecycle
```
Created → Voting Period → Trading Period → Closed → Resolved → Claimable
   ↓           ↓               ↓            ↓          ↓          ↓
 Creation   Votes/Shares    Buy/Sell     AI Resolution Win/Loss  Rewards
```

### 4. Content Moderation
- AI-powered blacklisting
- Language detection
- Spam filtering
- Multi-language support (11 languages)

### 5. Batch Operations
- Batch claim for multiple positions
- Pagination for large datasets
- Optimized gas usage

## Security Features

### Smart Contract
- ReentrancyGuard protection
- SafeERC20 for token transfers
- Access control (DAO, dAI roles)
- Emergency pause functionality

### Backend
- Environment variable API keys
- Deterministic judge selection (prevents manipulation)
- Consensus requirement (prevents single AI failure)
- Rate limiting on AI API calls

### Frontend
- Local storage encryption (sensitive data)
- Input validation
- Safe transaction handling
- Error boundary components

## Deployment Architecture

```
Development:
├── Webapp: Vite dev server (localhost:8000)
├── Backend: Node daemon (localhost:3000)
└── Blockchain: Local testnet (Anvil)

Production:
├── Webapp: Netlify/Vercel deployment
├── Backend: Node.js server (cloud hosting)
├── Blockchain: Multiple mainnets
└── AI APIs: External services (OpenAI, Anthropic, etc.)
```

## External Dependencies

### Blockchain RPCs
- Infura/Alchemy for Ethereum networks
- Chain-specific RPC endpoints
- Fallback RPC configuration

### AI Services
- OpenAI API (GPT-5, GPT-4o)
- Anthropic API (Claude)
- Perplexity API (Sonar)
- Google AI (Gemini)
- xAI (Grok)

### Wallet Providers
- Thirdweb SDK
- MetaMask
- WalletConnect
- In-app wallet

## Performance Optimizations

### Frontend
- Smart market loading (check count before fetch)
- Local storage caching
- Lazy loading components
- Pagination for large datasets
- Batch operations (claim all)

### Backend
- Deterministic judge selection (no redundant queries)
- Parallel AI API calls
- Chunked market processing
- Error retry logic

### Blockchain
- Batch contract calls
- Gas optimization
- Event-based updates
- Indexed data access

## Monitoring & Logging

### Backend
- Market resolution logs
- AI judge performance tracking
- Error reporting
- Consensus statistics

### Frontend
- User interaction tracking
- Error boundary logging
- Performance metrics
- Network switch events

## Future Enhancements

1. Additional blockchain networks
2. More AI providers for adjudication
3. Advanced trading features (limit orders)
4. Social features (follow creators)
5. Mobile app optimization
6. Advanced analytics dashboard
