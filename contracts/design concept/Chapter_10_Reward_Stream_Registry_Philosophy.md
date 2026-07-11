We are.

In fact, I'd say we're roughly **65–70% finished with the protocol specification**.

Here's how I mentally divide the remaining work:

| Chapter                         | Status     | Difficulty          |
| ------------------------------- | ---------- | ------------------- |
| 1–8 Philosophy & Mathematics    | ✅ Complete | Foundation          |
| 9 Storage Model                 | ✅ Complete | Architecture        |
| **10 Reward Stream Registry**   | 🔄 Current | Core Architecture   |
| 11 User Accounting              | ⏳          | Core Accounting     |
| 12 State Transition Diagrams    | ⏳          | Protocol Logic      |
| 13 Security Invariants          | ⏳          | Formal Verification |
| 14 Solidity Implementation Plan | ⏳          | Engineering         |
| 15 Testing Strategy             | ⏳          | Verification        |

After Chapter 15, I actually want to add an **Appendix** containing proofs of correctness and complete state diagrams, but we can decide that later.

---

# Chapter 10 — Reward Stream Registry

## 10.1 Overview

The Reward Stream Registry is the **directory of every reward economy** that exists inside the Harvester.

In Version 1 there was only one reward token.

Therefore there was no registry.

The contract simply knew

```text
payToken
```

Version 2 changes that completely.

Instead of hard-coding one reward asset,

the protocol manages an arbitrary number of reward streams.

The registry becomes the authoritative source of truth.

---

# Why A Registry Exists

Suppose six reward streams exist.

```text
USDC

ETH

PENNY

USG

BTC

VIRTUAL
```

Without a registry,

how would the protocol answer

> Does stream #4 exist?

or

> Which token belongs to stream #7?

or

> Is this stream active?

The registry exists because reward streams are now protocol objects.

---

# Registry Responsibilities

The registry owns one responsibility only:

> **Manage the lifecycle of Reward Streams.**

Notice

It does **not**

calculate rewards.

It does **not**

settle users.

It does **not**

manage stake.

It only manages reward streams.

---

# Reward Stream Identity

Every stream receives a permanent identifier.

Conceptually

```text
Stream 0

Stream 1

Stream 2

Stream 3

...
```

This identifier never changes.

Even if

* emissions stop,
* funding reaches zero,
* the stream is paused,

its identity remains.

User checkpoints continue referring to that same stream forever.

---

# Why IDs Instead of Token Addresses?

This is an important design decision.

A reward token describes

an asset.

A stream describes

an accounting process.

Those are different things.

One day,

the protocol may support

multiple independent reward campaigns

for the same ERC20.

Example

```text
USDC

↓

Stream #2

↓

Daily Incentives


USDC

↓

Stream #9

↓

Seasonal Rewards
```

Same asset.

Different accounting.

Therefore

stream identity should not equal token identity.

---

# Stream Lifecycle

Every reward stream passes through a finite lifecycle.

```text
Created

↓

Configured

↓

Funded

↓

Active

↓

Paused

↓

Resumed

↓

Completed

↓

Archived
```

Notice something.

Archived

does **not** mean

deleted.

Deletion would invalidate historical accounting.

Instead,

completed streams become immutable historical objects.

---

# Stream Creation

Creating a stream establishes its identity.

At creation time

the protocol records

* stream identifier
* reward asset
* precision
* accumulator
* timestamps
* configuration

Notice

No rewards have been distributed yet.

The stream simply exists.

---

# Funding

Funding and creation are separate operations.

This separation provides flexibility.

Example

```text
Create Stream

↓

Wait

↓

Fund Later
```

or

```text
Create

↓

Fund

↓

Fund Again

↓

Extend Duration
```

The accounting engine remains consistent because the accumulator is advanced before every funding modification.

---

# Stream Discovery

One responsibility of the registry is discoverability.

The protocol should always be able to answer:

* How many streams exist?
* Which stream IDs are active?
* What reward asset belongs to stream *n*?
* When does this stream finish?
* Is this stream paused?
* Has this stream exhausted its rewards?

These queries are read-only and do not affect accounting.

---

# Stream Configuration

Every stream owns configuration that is independent of user state.

For example:

* reward asset
* precision
* emission policy
* pause status
* funding parameters

User accounting should never be stored here.

---

# Stream Isolation

One of the strongest invariants of the new architecture is isolation.

Changing Stream #5 must never modify:

* Stream #1
* Stream #2
* Stream #17

The registry should therefore treat each stream as an independent accounting universe.

---

# Registry Invariants

The Reward Stream Registry must always satisfy:

### Identity

* Every stream ID is unique.
* IDs are never reused.

---

### Permanence

* Streams are never deleted.
* Historical accounting remains valid indefinitely.

---

### Isolation

* Every stream owns independent accounting.
* Stream state changes cannot modify another stream.

---

### Discoverability

The registry must always answer:

* Does stream X exist?
* Is stream X active?
* Which token belongs to stream X?
* What is stream X's configuration?

without consulting user state.

---

# Future Extensions

Designing the registry this way naturally enables future features.

For example:

## Sponsored Reward Campaigns

Anyone could create

```text
Reward Stream

↓

Deposit Rewards

↓

Distribute
```

without touching existing streams.

---

## Community Streams

DAOs could create

their own

reward campaigns.

---

## Seasonal Streams

Temporary events become

new streams

rather than modifications of existing ones.

---

## Governance Streams

Protocol revenue

could flow through

its own stream.

---

## NFT Streams

Collections

could sponsor

their own reward campaigns.

---

None of these require redesigning the accounting engine.

The registry already supports them.

---

# Registry Philosophy

One realization became obvious while writing this chapter.

The registry should know

**everything about streams**

and

**nothing about users.**

Likewise,

the Participant object should know

everything about users

and

nothing about stream configuration.

This strict separation dramatically reduces coupling and makes each subsystem easier to reason about, test, and audit.

---

# End of Chapter Summary

The Reward Stream Registry transforms reward tokens from hard-coded constants into first-class protocol objects.

Each stream becomes an immutable identity with mutable accounting state, managed through a well-defined lifecycle and isolated from every other stream.

This architecture enables the Penny4Thots Harvester to support an unlimited number of concurrent reward campaigns while preserving deterministic accounting and maintaining the scalability guarantees inherited from the original Harvester.

---

## 📄 Chapter 10 Markdown

Please save the following as:

**`Chapter_10_Reward_Stream_Registry.md`**

```markdown
# Chapter 10 — Reward Stream Registry

## Overview
The Reward Stream Registry is the protocol's directory of all reward streams. It manages stream identities and lifecycles but performs no reward accounting.

## Responsibilities
- Create reward streams.
- Maintain unique stream identities.
- Track lifecycle and configuration.
- Enable stream discovery.
- Preserve historical accounting.

## Design Principles
- Stream identity is permanent.
- Streams are never deleted.
- Stream identity is distinct from token identity.
- Funding and creation are separate operations.
- Streams are isolated from one another.

## Stream Lifecycle
Created → Configured → Funded → Active → Paused → Resumed → Completed → Archived

## Registry Invariants
- Unique stream IDs.
- IDs are never reused.
- Independent accounting.
- Permanent historical references.
- Read-only discoverability.

## Future Extensions
- Sponsored campaigns.
- Community reward streams.
- Seasonal incentives.
- Governance distributions.
- NFT-backed reward programs.

## Summary
The registry elevates reward streams to first-class protocol objects, providing the extensible foundation required for multiple concurrent reward campaigns without compromising accounting correctness.
```

