Excellent—this chapter is where the protocol truly begins to take shape.

# Chapter 3 — Mathematical Model

## Overview

The mathematical model is the protocol.

The Solidity contract is merely one possible implementation of that model.

If the mathematics are correct, we can rewrite the Solidity in five years and still obtain the exact same protocol behavior.

For that reason, this chapter intentionally avoids discussing mappings, structs, or Solidity syntax. Instead, we define the protocol in terms of quantities, equations, and invariants.

---

## Design Objective

The protocol must satisfy five properties simultaneously:

1. One staking pool shared by all participants.
2. Any number of independent reward streams.
3. Proportional reward distribution.
4. Continuous reward accrual.
5. O(1) computational complexity for every user interaction.

These requirements completely determine the mathematics.

---

# Fundamental Variables

Let

**S**

be the total amount staked in the protocol.

For every user **u**

```
sᵤ
```

represents the user's current stake.

Clearly

```
0 ≤ sᵤ ≤ S
```

and

```
S = Σ sᵤ
```

This equality becomes one of the protocol's primary invariants.

---

# Reward Streams

Unlike the original Harvester,

reward is no longer a single scalar.

Instead

```
R₀

R₁

R₂

...

Rₙ
```

Each reward stream behaves independently.

Every stream has

* its own reward token
* its own emission schedule
* its own funding
* its own accumulator
* its own accounting

The staking pool is shared.

The rewards are not.

---

# Time

Time is continuous.

Nothing happens every second.

Instead,

time simply advances.

Whenever someone interacts,

the protocol computes

```
Δt

=

Current Time

−

Last Update Time
```

Only then is work performed.

Time itself costs no gas.

---

# Reward Emission

Every reward stream emits rewards continuously.

Suppose Stream i emits

```
Eᵢ
```

tokens per second.

After

```
Δt
```

seconds,

the stream has emitted

```
Eᵢ × Δt
```

tokens.

No transfers occur.

No balances change.

Only mathematics.

---

# The Global Accumulator

This is, in my opinion, the most important concept in the entire protocol.

Every reward stream maintains one global quantity:

```
Aᵢ
```

This accumulator answers one question:

> **How many reward tokens has one unit of stake earned since the stream began?**

It belongs to the protocol.

Not to any user.

Whenever time advances,

the accumulator increases.

Every participant automatically inherits that increase without any storage writes.

This is the key to achieving O(1) complexity.

---

# User Checkpoints

Every user remembers only one value per reward stream:

```
Cᵤ,ᵢ
```

This is the value of the global accumulator the last time the user was settled.

The protocol does **not** store:

* every second of rewards,
* every emission event,
* or every historical balance.

It stores only a checkpoint.

Everything else is reconstructed from the difference between the current accumulator and that checkpoint.

---

# Pending Rewards

Each user also maintains

```
Pᵤ,ᵢ
```

representing rewards that have already been accounted for but not yet claimed.

When the user interacts, the protocol computes newly earned rewards, adds them to `Pᵤ,ᵢ`, and advances the checkpoint.

No tokens move until a claim is requested.

---

# Settlement Equation

Conceptually, settlement becomes:

> **New Rewards = User Stake × Change in Global Accumulator**

In symbolic form:

```
ΔReward = sᵤ × (Aᵢ − Cᵤ,ᵢ)
```

After settlement:

* pending rewards increase,
* the checkpoint becomes the current accumulator,
* and future rewards begin accumulating from the updated checkpoint.

This single equation replaces the original Harvester's ERA-based accounting while preserving the same lazy-settlement philosophy.

---

# Global Update Sequence

Every externally visible action follows the same sequence:

1. Advance the global accumulator(s) based on elapsed time.
2. Settle the caller against the updated accumulator(s).
3. Execute the requested action (stake, unstake, claim, reward deposit, etc.).
4. Persist the new state.

The ordering is important because it ensures no rewards are accidentally skipped or double-counted.

---

# Conservation of Rewards

The protocol must satisfy a fundamental conservation law:

> **Rewards Funded = Rewards Claimed + Rewards Remaining + Rewards Pending**

No reward tokens can disappear.

No reward tokens can be created from accounting.

The mathematics must preserve this identity at every point in time.

---

# Conservation of Stake

Likewise:

> **Total Stake = Sum of Every User's Active Stake**

The only operations that may change the total stake are staking and unstaking.

Reward accounting must never alter staking balances.

---

# Mathematical Independence

Perhaps the most important property of Version 2:

Every reward stream evolves independently.

Changing:

* the emission rate,
* the duration,
* or the funding

of Stream A must never modify the accounting of Stream B.

This independence is what allows us to support an arbitrary number of reward tokens within a single staking pool.

---

# Summary

The protocol is ultimately built around three concepts:

1. A single shared staking pool.
2. One global accumulator per reward stream.
3. One checkpoint per user per reward stream.

Everything else—claims, deposits, withdrawals, and reward distribution—is a consequence of these relationships.

This mathematical model gives us:

* O(1) user interactions,
* continuous reward accrual,
* lazy settlement,
* and support for an arbitrary number of independent reward streams without iterating over users.

---
