# Chapter 8 --- Generalized Reward Accounting Engine

## Overview

The Penny4Thots Harvester evolves from a staking contract into a
generalized reward accounting engine.

## Core Philosophy

The engine should not care where a participant's weight comes from. It
only distributes rewards according to that weight.

Possible weight sources: - Staked tokens - LP positions - Governance
power - Reputation - Prediction market activity - Future protocol
metrics

## Three-Layer Architecture

### 1. Weight Engine

Maintains participant weights independently of rewards.

### 2. Reward Engine

Maintains an arbitrary number of independent reward streams. Each stream
owns: - Reward token - Emission schedule - Accumulator - Funding state -
Configuration

### 3. Settlement Engine

Synchronizes users against reward streams during interactions.

## Reward Stream Registry

Reward streams are registered by index using mappings, allowing
unlimited independent streams without array-centric architecture.

## Universal Settlement Pipeline

1.  Advance affected reward streams.
2.  Settle participant.
3.  Execute requested action.
4.  Persist state.

## Architectural Invariants

-   One shared weighting engine.
-   One shared staking pool.
-   Independent reward streams.
-   Deterministic settlement.
-   No iteration over all participants.
-   O(1) scalability with respect to user count.

## Long-Term Vision

The accounting engine should be reusable for staking, creator rewards,
protocol revenue sharing, governance incentives, referrals, liquidity
mining and future reward systems.

## Summary

The Penny4Thots Harvester V2 is best viewed as a generalized accounting
primitive whose current weighting function is stake, but whose
architecture supports arbitrary future weighting models.
