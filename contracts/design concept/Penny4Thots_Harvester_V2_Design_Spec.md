# Penny4Thots Harvester V2 Design Notes

## 1. Original Harvester Philosophy

-   Lazy accounting instead of continuous reward updates.
-   O(1) interactions with no iteration over all stakers.
-   Global accounting updated only when protocol state changes.
-   Time-weighted proportional reward distribution.

## 2. Storage Layout

Document every state variable, its invariant, readers/writers, and
whether retained in V2.

## 3. Mathematical Model

Define stake, reward emission, accumulators, and conservation of rewards
independently from Solidity.

## 4. Reward Accumulator Theory

Formalize global reward accumulators and per-user checkpoints.

## 5. User Settlement Algorithm

On stake, unstake, claim, or reward deposit: 1. Update global
accounting. 2. Settle caller. 3. Apply requested action.

## 6. Gas Optimizations

-   No loops over stakers.
-   Lazy settlement.
-   Mapping-based storage.
-   Amortized computation.

## 7. Limitations of Version 1

-   Single reward token.
-   ERA iteration.
-   Tight coupling between staking and reward logic.

## 8. Generalized Reward Accounting Engine

One staking pool with N independent reward streams sharing the same
stake.

## 9. Storage Layout V2

Separate: - Stake state - Reward stream registry - User reward
checkpoints - Global accumulators

## 10. Reward Stream Registry

Mapping(index =\> RewardStream). Each stream maintains independent
accounting and lifecycle.

## 11. User Accounting

One stake record. One reward accounting record per reward stream.

## 12. State Transition Diagrams

Document transitions for: Stake, Unstake, DepositReward, Claim,
CreateStream, Pause.

## 13. Security Invariants

-   Total claimed \<= funded rewards.
-   No double claims.
-   No negative accounting.
-   Independent reward streams.
-   Conservation of stake.

## 14. Solidity Implementation Plan

Build in stages: 1. Core staking 2. Reward engine 3. Multi-stream
registry 4. Claim engine 5. Admin layer 6. Testing & optimization

## 15. Testing Strategy

Unit, invariant, fuzz, edge-case, gas, and multi-stream integration
tests.

------------------------------------------------------------------------

This document is the living design specification for the Penny4Thots
Harvester V2. It will be expanded as each section is reverse engineered
and redesigned.
