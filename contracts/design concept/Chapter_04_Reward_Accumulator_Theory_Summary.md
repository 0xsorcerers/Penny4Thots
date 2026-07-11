# Chapter 4 --- Reward Accumulator Theory

## Overview

The reward accumulator is the central accounting primitive. It records
how much reward one unit of stake has earned over a stream's lifetime.

## Why an Accumulator?

Instead of updating every user whenever rewards accrue, the protocol
updates one global value. Users synchronize only when they interact.

## Stream Independence

Each reward stream owns its own accumulator. Updating one stream never
modifies another.

## User Checkpoints

Each user stores the accumulator value last observed for each stream
plus any pending rewards.

## Settlement

1.  Advance accumulator from elapsed time.
2.  Compute accumulator delta.
3.  Multiply by user stake.
4.  Add to pending rewards.
5.  Update checkpoint.

## Advantages

-   O(1) complexity
-   No loops over stakers
-   Continuous emissions
-   Lazy accounting
-   Naturally extends to N reward streams

## Relation to Harvester V1

The original rewardPerStamp and ERA mechanism tracked the same economic
reality. The accumulator formulation generalizes that design while
removing ERA iteration and supporting independent reward streams.

## Summary

The accumulator is the protocol's memory of rewards per unit stake. It
allows exact reconstruction of user rewards from only a global value and
a user checkpoint.
