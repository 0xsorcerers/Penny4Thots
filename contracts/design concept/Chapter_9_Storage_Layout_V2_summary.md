# Chapter 9 — Storage Layout V2

## Overview
Storage is the protocol's permanent memory. Every object exists because its information cannot be reconstructed from other state.

## Protocol Objects
1. Global Configuration
2. Pool
3. Reward Stream
4. Participant
5. Stake Position
6. Reward Position

## Design Principles
- Storage is derived from mathematics.
- Objects have identity; variables are implementation details.
- Every piece of information has a single owner.
- Avoid duplication unless justified by measured gas savings.

## Object Responsibilities

### Global Configuration
Protocol-wide rules, permissions, and immutable deployment parameters.

### Pool
Maintains the shared weighting environment, including total stake and aggregate state.

### Reward Stream
Owns reward token metadata, accumulator, emission schedule, lifecycle, and funding state.

### Participant
Represents protocol identity independently of current stake.

### Stake Position
Stores the participant's weighting information only.

### Reward Position
Stores accumulator checkpoints and pending rewards for a specific reward stream.

## Object Relationships
Harvester
├── Global Configuration
├── Pool
├── Reward Registry
│   └── Reward Streams
└── Participants
    ├── Stake Position
    └── Reward Positions

## Storage Invariants
- Reward streams are never deleted.
- Participants persist independently of stake.
- One stake position per participant.
- One reward position per participant per stream.
- Accumulators are monotonically increasing.
- Storage is normalized to avoid duplication.

## Summary
Version 2 organizes the protocol around six permanent objects, creating a normalized and extensible storage model from which the Solidity implementation can be directly derived.