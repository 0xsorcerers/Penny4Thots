# Chapter 10 — Reward Stream Registry

## Overview
The Reward Stream Registry is the protocol's directory of all reward streams. It manages stream identities and lifecycles but performs no reward accounting.

## Responsibilities
- Create reward streams.
- Maintain unique stream identities.
- Track lifecycle and configuration.
- Enable stream discovery.
- Preserve historical accounting.

## Design Principles
- Stream identity is permanent.
- Streams are never deleted.
- Stream identity is distinct from token identity.
- Funding and creation are separate operations.
- Streams are isolated from one another.

## Stream Lifecycle
Created → Configured → Funded → Active → Paused → Resumed → Completed → Archived

## Registry Invariants
- Unique stream IDs.
- IDs are never reused.
- Independent accounting.
- Permanent historical references.
- Read-only discoverability.

## Future Extensions
- Sponsored campaigns.
- Community reward streams.
- Seasonal incentives.
- Governance distributions.
- NFT-backed reward programs.

## Summary
The registry elevates reward streams to first-class protocol objects, providing the extensible foundation required for multiple concurrent reward campaigns without compromising accounting correctness.