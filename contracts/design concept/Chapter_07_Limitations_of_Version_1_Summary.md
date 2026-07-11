# Chapter 7 --- Limitations of Version 1

## Overview
 
This chapter classifies the original Harvester design into ideas to
Preserve, Generalize, or Retire.

## Preserve

-   Lazy accounting.
-   No iteration over stakers.
-   User-funded settlement.
-   Proportional time-weighted rewards.
-   Global accounting before user accounting.

## Generalize

### Single payToken

Becomes a registry of independent reward streams.

### Single reward schedule

Each reward stream maintains its own schedule.

### Single reward state

Every stream owns independent accounting.

### One-dimensional rewards

Becomes vectorized rewards across many assets.

## Retire

### ERA bookkeeping

Superseded by accumulator checkpoints if mathematical equivalence is
maintained.

### Monolithic reward logic

Replace with modular accounting engine.

### Tight coupling

Separate staking engine from reward engine.

## New Design Philosophy

The protocol is no longer a staking contract that pays rewards. It is a
generalized reward accounting engine with staking as its input.

## Lessons Learned

Version 1 proved that lazy accounting scales. Version 2 extends that
proof to multiple concurrent reward assets while preserving O(1) user
interactions.

## Summary

The original Harvester is not replaced---it is evolved. Every retained
concept survives because of its mathematical merit, not because of its
implementation.
