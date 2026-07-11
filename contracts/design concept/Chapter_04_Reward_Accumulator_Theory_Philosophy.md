Wonderful. We've now reached what I consider the intellectual core of the new Harvester.

The original Battledogs Harvester revolved around **ERAs** and **rewardPerStamp**. Those weren't merely implementation details—they were an accounting strategy. What we're doing now is expressing that same strategy in a more general mathematical language that naturally supports any number of reward tokens.

---

# Chapter 4 — Reward Accumulator Theory

## 4.1 Overview

If Chapter 3 defined **what** the mathematics are, Chapter 4 explains **why** the accumulator exists at all.

This chapter answers one question:

> **How can the protocol know exactly how much every user has earned without ever updating every user?**

The answer is the **reward accumulator**.

It is the single most important accounting primitive in the Penny4Thots Harvester.

---

# The Naïve Solution

Imagine 100,000 users.

Every second each earns rewards.

One approach would be

```text
Every Second

↓

Loop through every user

↓

Increase rewards
```

Computational complexity

```
O(number of users)
```

The protocol eventually becomes unusable.

---

# The Insight

Instead of updating users,

update the reward itself.

This is a subtle but profound change.

Rather than storing

> Alice has earned...

> Bob has earned...

> Carol has earned...

the protocol stores

> Every staked token has earned...

That single global fact is enough to reconstruct everyone's entitlement later.

---

# The Reward Accumulator

Every reward stream owns one accumulator.

Conceptually,

```
Accumulator

↓

How much reward

has one unit of stake

earned

since the stream began?
```

Notice

This value belongs to

the stream,

not

the users.

---

# Why It Works

Suppose

```
1 GAME

↓

has earned

2.75 USDC
```

Then Alice with

```
50 GAME
```

must have earned

```
137.5 USDC
```

Bob with

```
400 GAME
```

must have earned

```
1100 USDC
```

The protocol never needed to update Alice or Bob.

It only needed to know

how much reward one GAME has accumulated.

---

# The User Checkpoint

Every user stores only

```
Checkpoint

↓

Accumulator

last seen
```

Imagine

Current Accumulator

```
12.3
```

Alice's Checkpoint

```
10.7
```

Difference

```
1.6
```

If Alice owns

```
500 GAME
```

then her newly earned reward is simply

```
500 × 1.6
```

After settlement,

her checkpoint becomes

```
12.3
```

The protocol never revisits the past.

It only remembers where Alice last synchronized.

---

# Why This Is Better Than Storing Rewards Directly

If we stored every user's continuously changing reward balance:

* Every reward emission would require touching every user.
* Gas cost would scale with the number of participants.
* Large staking pools would become impractical.

Instead, the accumulator lets us compress the entire history of emissions into a single monotonically increasing value per reward stream.

---

# Relationship to the Original Harvester

This is an important point.

We are **not replacing** the philosophy of the original Harvester.

We're expressing it in a more general form.

The original contract effectively tracked:

* rewardPerStamp
* ERA snapshots
* user ERA positions

Together, those structures represented "how much reward has one unit of stake earned over time."

The accumulator expresses that same idea directly.

In that sense:

* `rewardPerStamp` becomes part of the accumulator's evolution.
* ERA snapshots become accumulator checkpoints.
* User ERA positions become user accumulator checkpoints.

The mathematics are preserved while the implementation becomes simpler and scales naturally to multiple reward streams.

---

# One Accumulator Per Stream

With multiple reward tokens, we simply duplicate the accounting primitive.

For example:

```
USDC Stream
Accumulator_USDC

ETH Stream
Accumulator_ETH

PENNY Stream
Accumulator_PENNY

USG Stream
Accumulator_USG
```

Every stream advances independently according to its own funding and emission schedule.

The user's single stake participates in all of them simultaneously.

---

# Settlement Algorithm

Whenever a user interacts:

1. Advance the global accumulator(s) using elapsed time.
2. Compute the difference between the current accumulator and the user's checkpoint.
3. Multiply that difference by the user's stake.
4. Add the result to the user's pending rewards.
5. Update the user's checkpoint.

This process is constant time with respect to the number of stakers.

---

# Design Properties

The accumulator gives us:

* **Lazy accounting**: No continuous user updates.
* **Deterministic rewards**: Every user's entitlement is uniquely determined by global state and their checkpoint.
* **Scalability**: Complexity remains O(1) regardless of the number of participants.
* **Composability**: Multiple reward streams can share the same staking pool without interfering with one another.

---

# Looking Ahead

This chapter also sets the stage for a subtle but powerful enhancement.

In the original Harvester, rewards were introduced as a single emission schedule. In Penny4Thots, each reward stream will be able to receive new funding independently, extend or replace its emission schedule, or even pause and resume, all while preserving the correctness of the accumulator. That flexibility is possible because the accumulator separates *reward accounting* from *reward funding*.

---

## End of Chapter Summary

The reward accumulator is not just an optimization—it is the abstraction that makes the entire protocol possible.

Instead of tracking what every user has earned, the protocol tracks what **one unit of stake** has earned. User rewards become a simple function of stake and the difference between the current accumulator and the user's last checkpoint.

That idea is the direct descendant of the original Harvester's `rewardPerStamp` and ERA design, but generalized into a reusable accounting primitive capable of supporting an arbitrary number of independent reward streams.

---

As promised, I've also saved this chapter as a standalone Markdown document:

**📄 [Chapter_04_Reward_Accumulator_Theory.md](sandbox:/mnt/data/Chapter_04_Reward_Accumulator_Theory.md)**

I also noticed the uploaded **Harvester Contract Analysis.txt** in the project. From Chapter 5 onward, I'd like to start cross-referencing our evolving specification directly against the original Harvester implementation so that we can explicitly document which ideas are preserved, which are generalized, and which are intentionally retired. That will help ensure we don't lose any of the elegant properties that made the original design successful while modernizing it for Penny4Thots.
