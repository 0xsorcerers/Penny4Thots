# Chapter 1 --- Original Harvester Philosophy

## The Problem

The original Harvester solved a difficult scalability problem: how to
distribute continuously accruing rewards without continuously updating
every participant. Rather than updating all users every block or every
second, it adopted lazy accounting, allowing time to pass without
computation and only settling rewards when a user interacted.

## Principle 1 --- Time is Free

Time advances naturally. Computation only occurs when required. User
interactions collapse elapsed time into a single accounting update.

## Principle 2 --- Users Pay for Their Own Accounting

Each participant settles only their own rewards. Alice never pays gas to
update Bob's accounting, allowing the protocol to scale independently of
the number of users.

## Principle 3 --- Global State Over User State

The protocol prefers updating a small amount of global accounting
instead of modifying thousands of user records. Users inherit those
global updates when they next interact.

## Principle 4 --- Rewards Are Never Continuously Distributed

The contract stores sufficient historical information to reconstruct
each participant's entitlement on demand rather than incrementing
balances continuously.

## Principle 5 --- Separate Accounting From Transfers

Accounting determines what a participant has earned. Transfers occur
only when the participant claims, reducing unnecessary storage writes
and token movements.

## Principle 6 --- Rewards Belong to Time

Rewards accrue as a function of stake and elapsed time, independent of
transactions or block frequency.

## Principle 7 --- The Protocol Never Forgets

Historical accounting is preserved so every participant's entitlement
can always be reconstructed exactly.

## Fundamental Equation

Reward = Stake × Time × Reward Rate

Every mechanism in the original Harvester exists to evaluate this
relationship efficiently.

## Penny4Thots Evolution

The Penny4Thots Harvester generalizes this idea from a single reward
stream to N independent reward streams. One staking pool supports many
simultaneously active reward tokens, each maintaining independent
accounting while sharing the same stake base.

This chapter establishes the guiding philosophy that all subsequent
architectural decisions should preserve.
