# Chapter 2 --- Storage Layout

## Overview

Storage is the protocol's memory and is derived from mathematics, not
coding habits.

## First Principle

Only store information that cannot be deterministically reconstructed
later.

## Six Categories of Storage

### 1. Immutable Configuration

Deployment-time constants such as staking token, owner, guardian.

### 2. Global Pool State

Pool-wide information including total staked, last update time, pause
state.

### 3. Reward Stream State

Each reward stream maintains its own token, emission parameters,
accumulator, accounting and lifecycle independently.

### 4. User Stake State

Each participant owns exactly one stake record shared across every
reward stream.

### 5. User Reward State

Each participant maintains independent accounting checkpoints for every
reward stream they interact with.

### 6. Administrative State

Protocol configuration including permissions, treasury, fees and
emergency controls.

## Storage Hierarchy

Harvester - Pool - Reward Streams - Users - Stake - Reward Checkpoints

## Reward Stream Design Goals

Each stream must independently track: - Reward token - Reward rate -
Remaining rewards - Global accumulator - Last update - End of emission -
Total claimed - Active status

## User Accounting

Every user stores: - One stake record - One reward checkpoint per reward
stream - One pending reward balance per reward stream

## Storage Invariants

-   One staking pool
-   One stake record per user
-   Many independent reward streams
-   Reward streams never interfere with one another
-   Total stake equals sum of active stakes

## Summary

The Penny4Thots Harvester separates staking from rewards. One shared
stake powers any number of independently funded reward streams while
keeping storage minimal and scalable.
