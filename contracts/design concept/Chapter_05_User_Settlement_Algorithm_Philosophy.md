Excellent. This chapter is where the mathematics begin to turn into protocol behavior.

One observation before we begin: **the settlement algorithm is the heartbeat of the Harvester**. Every external function—`stake()`, `unstake()`, `claim()`, `depositReward()`, and eventually `createRewardStream()`—must pass through exactly the same accounting pipeline. Once we define this correctly, most of the Solidity functions become surprisingly small because they'll all share the same internal settlement routine.

---

# Chapter 5 — User Settlement Algorithm

## 5.1 Overview

If the accumulator is the protocol's memory, then the settlement algorithm is its interpreter.

The accumulator continuously records **what one unit of stake has earned**.

The settlement algorithm answers a different question:

> **Given a user's stake and their last checkpoint, how much do they own right now?**

This transformation happens only when the user interacts with the protocol.

---

# Continuous Mathematics vs. Discrete Transactions

One of the most elegant aspects of the Harvester is that rewards accrue **continuously**, while blockchains execute **discretely**.

The protocol bridges these two worlds through settlement.

Between two user transactions:

* time advances,
* reward streams continue emitting,
* accumulators increase,

yet **no user storage changes**.

Only when someone submits a transaction does the protocol reconcile elapsed time with the user's state.

---

# The Canonical Settlement Sequence

Every externally callable function should conceptually follow the same sequence.

### Step 1 — Advance Global Accounting

Before looking at any user, the protocol first advances each affected reward stream to the current timestamp.

This updates the global accumulators so they represent all rewards emitted up to "now."

At this point, no user state has changed.

---

### Step 2 — Read the User's Position

The protocol retrieves:

* current stake,
* checkpoint for each affected reward stream,
* pending rewards.

This information defines the user's current accounting position.

---

### Step 3 — Compute Newly Earned Rewards

For each affected reward stream:

* compare the current accumulator with the user's checkpoint,
* compute the accumulator delta,
* multiply by the user's current stake,
* add the result to pending rewards.

The protocol has now converted continuous reward accrual into an explicit accounting balance.

---

### Step 4 — Synchronize Checkpoints

After accounting has been updated, the user's checkpoint is advanced to the stream's current accumulator.

This is equivalent to saying:

> "The protocol and the user are now synchronized."

Future rewards begin accruing from this point forward.

---

### Step 5 — Execute the Requested Action

Only **after** settlement is complete does the protocol perform the requested operation.

Examples:

* increase stake,
* decrease stake,
* transfer rewards,
* create reward stream,
* deposit additional rewards.

This ordering is critical.

---

# Why Ordering Matters

Suppose Alice currently has:

* 100 staked tokens,
* one month of unclaimed rewards.

She decides to increase her stake to 500.

If the protocol increased her stake **before** settlement, then the previous month's rewards would incorrectly be calculated as though she had held 500 tokens the entire time.

That would violate proportional reward distribution.

The correct order is therefore:

1. Settle historical rewards using the old stake.
2. Update the stake.
3. Begin accruing future rewards using the new stake.

This principle applies equally to unstaking, claims, and reward funding.

---

# Action-Specific Behavior

Although every external function begins with settlement, each action modifies state differently afterward.

### Stake

* Settle rewards.
* Increase user stake.
* Increase total stake.

### Unstake

* Settle rewards.
* Decrease user stake.
* Decrease total stake.

### Claim

* Settle rewards.
* Transfer pending rewards.
* Reset pending balances.

### Deposit Reward

* Advance the affected reward stream.
* Modify its emission schedule.
* Leave user accounting untouched.

Notice that reward deposits never require iterating over users. The accumulator absorbs the new emission schedule, and users naturally pick up their share the next time they interact.

---

# Complexity

The settlement algorithm is intentionally independent of the number of participants.

Its complexity depends only on the number of reward streams being settled.

That means:

* 10 users or 10 million users make no difference.
* The cost scales with the number of streams touched by the transaction, not with protocol adoption.

This is the scalability property inherited from the original Harvester and generalized for Penny4Thots.

---

# Safety Properties

A correct settlement algorithm guarantees:

* **No earned rewards are lost.**
* **No rewards are counted twice.**
* **A user's checkpoint always reflects the latest accumulator they have synchronized with.**
* **Historical rewards are always calculated using the stake that actually existed during that period.**

These become protocol invariants that every implementation must preserve.

---

# A Design Refinement

This chapter also leads to a refinement that I think will make the implementation cleaner.

Rather than writing separate accounting code inside every public function, we should aim for a single internal routine—conceptually something like "settleUser"—that performs the five settlement steps. Public functions would then simply call this routine before applying their own state changes.

That gives us a single source of truth for reward accounting, reduces duplicated logic, and makes future auditing significantly easier because every user interaction passes through the same accounting pipeline.

---

# End of Chapter Summary

The settlement algorithm is the bridge between continuous mathematical reward accrual and discrete blockchain transactions.

Every interaction follows the same philosophy:

1. Advance global accounting.
2. Synchronize the user.
3. Perform the requested state change.
4. Persist the new protocol state.

This deterministic ordering is what guarantees fairness, scalability, and correctness regardless of how many users or reward streams exist.

---

