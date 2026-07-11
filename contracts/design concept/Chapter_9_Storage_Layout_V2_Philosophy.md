Excellent. I actually think this chapter is the point where the protocol stops being an idea and becomes a blueprint.

Up until now we've deliberately avoided discussing actual protocol objects. Beginning here, every concept we introduce should eventually correspond almost one-to-one with a Solidity `struct` or a top-level storage area. The important distinction is that **we are still designing the protocol**, not the code.

---

# Chapter 9 — Storage Layout V2

## 9.1 Overview

Storage is the protocol's permanent memory.

Every byte stored on-chain costs gas forever.

Therefore, Version 2 adopts a simple philosophy:

> **Every storage object must represent a unique piece of information that cannot be reconstructed from the rest of the protocol.**

Everything else is derived.

This chapter defines the permanent objects that together make up the Penny4Thots Harvester.

---

# Design Philosophy

Rather than asking

> *"What variables do we need?"*

we ask

> *"What entities exist in the protocol?"*

The distinction is important.

Variables change.

Objects have identity.

Storage should represent objects.

Not temporary calculations.

---

# The Protocol Object

At the highest level sits the protocol itself.

Conceptually

```text
Harvester

↓

Global Configuration

↓

Registry

↓

Pool

↓

Participants
```

Everything else belongs to one of these.

---

# Object 1 — Global Configuration

## Purpose

Stores protocol-wide configuration that affects every participant.

## Responsibilities

Defines rules rather than accounting.

Examples include:

* staking token
* administrator roles
* emergency controls
* treasury
* protocol parameters

## Ownership

Modified only by governance or authorized administrators.

## Lifetime

Created during deployment.

Exists until protocol retirement.

## Invariants

Configuration never contains participant-specific information.

---

# Object 2 — Pool

The Pool represents the shared staking environment.

Not users.

Not rewards.

Just the shared state.

## Responsibilities

Maintain

* total weight
* total staked
* active participant count
* global timestamps

Notice

The Pool knows nothing about reward tokens.

---

## Why It Exists

Without the Pool there would be no common denominator for proportional distribution.

Every reward stream depends on it.

---

# Object 3 — Reward Stream

This is the most important new protocol object.

Every reward token becomes one Reward Stream.

---

## Responsibilities

A Reward Stream owns

* reward asset
* accumulator
* emission schedule
* funding
* accounting state
* lifecycle

---

## Ownership

Only protocol administrators may create streams.

Funding may come from administrators—or, in future versions, from permissionless sponsors.

---

## Lifetime

A Reward Stream is never deleted.

It may become inactive.

Historical accounting must remain recoverable forever.

This permanence avoids invalidating user checkpoints or historical reward calculations.

---

## Invariants

Every Reward Stream must satisfy:

* unique identifier
* one reward token
* independent accumulator
* deterministic accounting
* monotonic accumulator growth

No Reward Stream may modify another Reward Stream.

---

# Object 4 — Participant

Notice something subtle.

The protocol should recognize participants independently of staking.

A participant may

* have stake
* have pending rewards
* have historical checkpoints
* have zero current balance

The participant object represents protocol identity.

---

## Why Separate Participant from Stake?

Suppose Alice unstakes completely.

Should we delete Alice?

No.

Alice still owns

* pending rewards
* historical accounting
* future eligibility

Therefore

Participant

and

Stake Position

are distinct objects.

---

# Object 5 — Stake Position

This object answers one question:

> **How much protocol weight does this participant currently contribute?**

Responsibilities include:

* current stake
* deposit history (if required)
* weighting information
* optional lock parameters

Notice

No reward information belongs here.

Stake determines influence.

Not ownership of rewards.

---

## Invariants

Stake Position never contains reward accounting.

That separation is deliberate.

---

# Object 6 — Reward Position

Every participant owns one Reward Position for every Reward Stream they interact with.

Conceptually

```text
Participant

↓

Reward Position

↓

Stream ID

↓

Checkpoint

↓

Pending Rewards
```

---

## Responsibilities

Reward Positions contain only accounting.

No stake.

No emission schedules.

No protocol configuration.

Only synchronization data.

---

## Why Separate Stake from Reward Position?

Because one stake powers every stream.

Duplicating stake inside every Reward Position would violate normalization and create unnecessary synchronization complexity.

---

# Object Relationships

We can now describe the protocol as a graph.

```text
                    Harvester
                         │
        ┌────────────────┼────────────────┐
        │                │                │
 Configuration         Pool          Reward Registry
                                           │
                               ┌───────────┴───────────┐
                               │           │           │
                         RewardStream0 RewardStream1 RewardStreamN
                               │
                     Participants
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
           Stake Position          Reward Positions
```

This diagram captures the ownership and dependency relationships without committing to any Solidity syntax.

---

# Storage Normalization

Borrowing a principle from database design, we should normalize storage wherever practical.

Each piece of information should exist in exactly one place.

For example:

* Current stake belongs only to the Stake Position.
* Accumulator belongs only to the Reward Stream.
* Pending rewards belong only to the Reward Position.
* Protocol rules belong only to Global Configuration.

No duplication unless there is a compelling gas optimization backed by measurement.

---

# Storage Invariants

At this stage we can state several invariants that every implementation must preserve:

### Global Configuration

* Immutable deployment parameters remain unchanged.
* Administrative state is separate from accounting.

### Pool

* `totalWeight` equals the sum of all active Stake Positions.
* The Pool never stores reward balances.

### Reward Streams

* Every stream has a unique identifier.
* Streams are never deleted.
* Accumulators are monotonically non-decreasing.

### Participants

* Participants persist even with zero stake.
* Participant identity is independent of staking status.

### Stake Positions

* Exactly one active stake record per participant.
* No reward accounting is stored here.

### Reward Positions

* Exactly one accounting record per participant per stream.
* Reward Positions never modify stake.

---

# Design Decision

One design decision I'd like to formally record is this:

> **Reward Streams are immutable identities with mutable state.**

That means the identity of Stream #7 never changes, even if:

* its emission rate changes,
* additional rewards are deposited,
* it is paused,
* it resumes,
* or it becomes inactive.

This makes user accounting far simpler because checkpoints always refer to a stable identity.

---

# End of Chapter Summary

Storage Layout V2 is built around six protocol objects:

1. Global Configuration
2. Pool
3. Reward Stream
4. Participant
5. Stake Position
6. Reward Position

Together these objects define the permanent state of the Penny4Thots Harvester while maintaining a strict separation between configuration, stake, reward accounting, and administration.

Rather than storing transient calculations, the protocol stores only the irreducible information required to reconstruct every participant's entitlement at any point in time.

---

## 📄 Chapter 9 Markdown

Please save the following as:

**`Chapter_09_Storage_Layout_V2.md`**

```markdown
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
```

---
