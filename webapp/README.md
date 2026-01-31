# Predictify - Next Generation Prediction Market

A beautifully animated prediction market web app where users can create and participate in prediction markets on any topic.

## Features

- **Animated Get Started Page**: Eye-catching landing with floating elements, gradient animations, and the tagline "If you can think it, it's important"
- **Market Discovery**: Browse all prediction markets with tag-based filtering and search
- **Create Markets**: Create new prediction markets with title, subtitle, description, poster image, and up to 7 tags
- **Vote YES/NO**: Each market has a dedicated page where users can cast their vote
- **Trading System**: Markets have a `tradeOptions` hook - when enabled, users can access BUY/SELL functionality; when disabled, the trade button is dimmed
- **Beautiful UI**: Dark theme with gold/amber primary color, teal accents, and smooth animations powered by Framer Motion

## Tech Stack

- React + TypeScript
- Vite
- TailwindCSS + shadcn/ui
- Framer Motion for animations
- Zustand for state management
- React Router for navigation

## Pages

1. **Get Started** (`/`) - Animated intro page with "Get Started" CTA
2. **Markets List** (`/`) - After clicking Get Started, shows all markets with filtering
3. **Market Detail** (`/market/:id`) - Individual market page with voting and trading

## State Management

Using Zustand with persistence - markets and app state are saved to localStorage.

## Design System

- **Fonts**: Syne (headings), Outfit (body), Space Mono (code/tags)
- **Colors**: Dark background with gold primary, teal accent, green for YES, red for NO
# ThotsDapp
