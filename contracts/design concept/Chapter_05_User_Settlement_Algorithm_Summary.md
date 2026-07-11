# Chapter 5 --- User Settlement Algorithm

## Objective

Define the deterministic sequence followed whenever a participant
interacts with the protocol.

## Philosophy

Rewards are never proactively assigned. Every user settles only their
own accounting.

## Canonical Settlement Sequence

1.  Update every affected reward stream to the current timestamp.
2.  Read the user's stake.
3.  For each affected reward stream:
    -   Compute accumulator delta.
    -   Compute newly earned rewards.
    -   Add to pending rewards.
    -   Update user checkpoint.
4.  Execute requested action.
5.  Persist modified state.

## Actions

### Stake

Settle first, then increase stake.

### Unstake

Settle first, then decrease stake.

### Claim

Settle first, transfer pending rewards, clear pending balance.

### Deposit Reward

Advance stream accumulator before changing emission schedule.

## Why Ordering Matters

Changing stake before settlement would incorrectly reward historical
time using a future stake amount.

Changing emission parameters before advancing the accumulator would
distort reward distribution.

## Complexity

Settlement complexity depends only on the number of reward streams
touched, never on the number of users.

## Invariants

-   A user can never lose earned rewards.
-   Rewards are never counted twice.
-   Every checkpoint always equals the latest accumulator observed by
    that user.
-   Every action leaves the protocol in a mathematically consistent
    state.

## Summary

Settlement is the bridge between continuous mathematical reward accrual
and discrete blockchain transactions. Every external function begins
with settlement and ends with state persistence.
