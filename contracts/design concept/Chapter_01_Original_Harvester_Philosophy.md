Perfect. I think this is important enough that we should treat it like writing a protocol paper before writing a smart contract.

Looking back at our work together over the years, I actually see three generations of protocol design:

* **Generation 1:** Battledogs Harvester (single reward stream)
* **Generation 2:** Penny4Thots Prediction Markets (lazy accounting, share finalization, mappings, batched settlement)
* **Generation 3:** Penny4Thots Harvester (generalized multi-reward accounting engine)

I don't want Generation 3 to simply be "Harvester with multiple payTokens." I want it to become a reusable accounting primitive that could eventually power every reward mechanism in Penny4Thots.

---

# Our Documentation Roadmap

From this point onward we'll treat every section almost like a chapter of a technical book.

I estimate something around

> **80–120 pages**

once complete.

Every equation will be justified.

Every storage variable will have a reason for existing.

Every function will have invariants.

Every gas optimization will be documented.

By the time we're done, writing Solidity should almost become mechanical.

---

# Chapter 1

# Original Harvester Philosophy

This is where I think we should begin.

Not with Solidity.

With philosophy.

---

## The Problem

The original Harvester solved a surprisingly difficult problem.

Suppose

100,000 users

stake one token.

Now suppose

every second

new rewards become claimable.

How do you distribute rewards?

Naively one might think

```text
every second

for every user

calculate rewards
```

Impossible.

---

Or perhaps

```text
every block

update everyone's balance
```

Also impossible.

---

Gas scales with users.

Eventually

the contract stops functioning.

---

The Harvester solved this by changing the question.

Instead of asking

> "How do we continuously update everyone?"

it asked

> "How can everyone's rewards remain mathematically correct without updating anyone?"

That change in perspective is the entire philosophy of the contract.

---

## Principle 1

### Time is Free

Storage is expensive.

Transactions are expensive.

Time costs nothing.

Instead of updating balances every second,

the contract allows time to pass

without doing any computation.

Only when someone interacts

is time "collapsed"

into one calculation.

This is known today as

> lazy settlement.

---

## Principle 2

### Users Pay For Their Own Accounting

Suppose Alice never returns.

Should Bob pay gas

to keep Alice's rewards updated?

Of course not.

Instead

Alice's rewards remain

uncomputed.

When Alice returns

months later,

Alice pays for calculating Alice.

Nobody else.

This scales forever.

---

## Principle 3

### Global State Is More Valuable Than User State

This was a subtle but powerful design choice.

Rather than updating

100,000 users,

we update

one global variable.

Everyone implicitly inherits that update.

This idea later became one of the core design principles in DeFi staking systems because it transforms work that grows with the number of users into work that stays essentially constant.

---

## Principle 4

### Rewards Are Never Distributed

This sounds paradoxical.

The contract never actually "distributes" rewards.

Instead

it records enough information

that any user

can reconstruct

exactly

how much reward they deserve

when they eventually ask.

The protocol stores

information,

not balances.

---

## Principle 5

### Separate Accounting From Transfers

One of my favorite design decisions.

Accounting answers

> How much do you deserve?

Transfers answer

> Give it to me.

Those are different operations.

Accounting happens continually

in theory.

Transfers happen only on demand.

This separation greatly reduces unnecessary token transfers and storage writes.

---

## Principle 6

### Rewards Belong To Time

Notice the reward wasn't attached to

people.

It wasn't attached to

transactions.

It wasn't attached to

blocks.

Instead

reward belonged to

time.

Every second

every staked token

earned

a tiny amount.

Everything else

was merely bookkeeping.

This abstraction made the system predictable and proportional.

---

## Principle 7

### The Protocol Never Forgets

Even though rewards weren't calculated,

nothing was lost.

Because sufficient historical information was stored,

any participant could always recover

their exact entitlement.

The protocol was effectively storing

history

instead of balances.

---

# The Fundamental Equation

I think every protocol has one equation that captures its essence.

For Harvester V1 it was

[
\text{Reward} = \text{Stake} \times \text{Time} \times \text{Reward Rate}
]

Everything else in the contract existed to evaluate that equation efficiently.

The ERAs,

rewardPerStamp,

claim accounting,

and lazy settlement

were all implementation strategies for this single mathematical relationship.

---

# What Penny4Thots Changes

This is where Version 3 begins.

The equation above still holds,

but now

reward is no longer a scalar.

It becomes a vector.

Instead of

[
Reward
]

we now have

[
\vec{Reward}
============

\begin{bmatrix}
Reward_{USDC}\
Reward_{ETH}\
Reward_{USG}\
Reward_{PENNY}\
Reward_{VIRTUAL}\
\vdots
\end{bmatrix}
]

The staking pool remains singular.

The accounting engine remains singular.

But every reward stream evolves independently while sharing the same stake base.

That conceptual shift is, in my view, the defining idea of the Penny4Thots Harvester. We're no longer designing a staking contract—we're designing a generalized reward accounting engine capable of servicing an arbitrary number of independently funded reward streams with the same core accounting model.

---

## Where I propose we go next

The next chapter should be **Storage Layout**, and I don't mean simply listing variables.

We'll first derive the storage from the mathematics.

Instead of asking *"What variables do we need?"*, we'll ask *"What information must the protocol remember so that any user's rewards can always be reconstructed exactly?"*

That distinction will naturally lead us to the minimal, most gas-efficient storage model for the new Harvester. I think that's the right foundation before we discuss structs or write a single line of Solidity.
