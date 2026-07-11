# Chapter 3 --- Mathematical Model

## Overview

The mathematical model defines protocol behavior independently of
Solidity.

## Fundamental Variables

-   S: total staked amount
-   s_u: stake of user u
-   R_i: reward stream i
-   A_i: global accumulator for reward stream i
-   C\_{u,i}: user's accumulator checkpoint
-   P\_{u,i}: pending rewards

## Core Principles

1.  Rewards accrue continuously while emissions are active.
2.  Every reward stream is mathematically independent.
3.  One stake participates in every active reward stream.
4.  User rewards are settled lazily upon interaction.

## Reward Accumulation

Each reward stream increases its accumulator according to elapsed time,
emission rate, and total stake.

## User Settlement

Pending reward equals: (user stake) × (change in accumulator since last
checkpoint).

After settlement: - pending rewards increase - checkpoint becomes
current accumulator

## Global Update Sequence

1.  Advance accumulator(s)
2.  Settle user
3.  Execute stake/unstake/claim/deposit
4.  Store new state

## Conservation Principles

-   Rewards funded = rewards claimed + rewards remaining + rewards
    pending.
-   Stake is neither created nor destroyed except by stake/unstake.

## Design Goals

-   O(1) interactions.
-   No iteration over stakers.
-   Independent reward streams.
-   Deterministic accounting.

## Summary

The protocol reduces reward accounting to advancing global accumulators
and synchronizing user checkpoints. Solidity merely implements these
mathematical state transitions.
