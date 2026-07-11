# Chapter 6 --- Gas Optimizations

## Overview

Gas efficiency is a protocol objective, not an afterthought. Every
architectural choice is evaluated by its long-term scalability.

## Core Principles

-   Never iterate over all stakers.
-   Perform work only during interactions.
-   Share global accounting across all users.
-   Store only irreducible information.
-   Use sparse mappings instead of expanding arrays.

## Optimization Techniques

### Lazy Settlement

Only the interacting user is synchronized.

### Global Accumulators

One accumulator update replaces thousands of individual balance updates.

### Sparse Storage

Mappings allocate storage only when needed.

### Single Stake Record

One stake powers every reward stream.

### Independent Reward Streams

Streams are updated only when affected.

## Complexity Targets

Stake: O(k) Unstake: O(k) Claim: O(k) Reward Deposit: O(1) Create
Stream: O(1)

Where k is the number of reward streams touched, never the number of
users.

## Comparison with Harvester V1

Preserved: - Lazy accounting - No user iteration - User-funded
settlement

Improved: - Multi-stream rewards - Independent accounting - Simpler
accumulator model - Better modularity

## Summary

The protocol scales with activity rather than adoption. Millions of
users should not increase the computational complexity of an individual
transaction.
