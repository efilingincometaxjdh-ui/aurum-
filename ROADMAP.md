# Aurum — Roadmap (Phase 2 Focus)

This roadmap captures high-level intent only. The authoritative record of
what is actually implemented and its safety evidence is always `PROJECT_LOG.md`.

## Current status: Phase 2 — Evidence Infrastructure (Completed & Operational)

- **Deterministic, Fail-Closed Evidence Collection**: Maintained robust, fail-closed collection for XAU/USD Spot with configurable quote and cron lateness safety guardrails.
- **Strict Separation of Concerns Preserved**:
  - Technical/Macro Intelligence (Agents 02/03) → Decision Fusion (Agent 04) → Safety Gate (Agent 05) → Alert Gateway (Agent 06) → UI.
- **Append-Only Timezone-Aware History**: All observations and metrics stored with full timezone awareness and immutable snapshotting.
- **Manual Price Refresh Trigger**: Added interactive manual price tick refresh directly inside the header UI for sub-second synchronization.

## Completed Milestones

1. **Continuous Integration & Local Test Suites**: CI is verified green with a dedicated automated evidence validation and pipeline regression suite. [COMPLETED]
2. **Read-Only Analytics Visibility**: Improved visibility into pipeline decisions, confidence indicators, and historical performance/outcomes via the History Dashboard. [COMPLETED]
3. **Automated Cadence & Lateness Tolerance**: Configured customizable maximum lateness windows (`maxQuoteLatenessSeconds` and `maxCronLatenessMinutes`) that feed directly into Agent 05's permission safety gates. [COMPLETED]
4. **Hardened Storage & Indexing**: Implemented multi-column compound PostgreSQL indexes, secondary in-memory lookups, and fast Redis scanning for optimized analytical queries. [COMPLETED]

## Architectural Boundaries: Intelligence vs. Trade Execution

To ensure safety and deterministic behavior, Aurum maintains a strict functional boundary:
- **Scope of Market Data Integration**: Aurum integrates high-fidelity real-time price feeds (WebSockets and multi-source fallbacks) to ingest, process, validate, and store spot price data. This feeds read-only analytical pipelines and technical/macro signal generation.
- **Strict Isolation from Trade Execution**: Trade execution, order submission, broker API write access, and actual position management are entirely excluded from Aurum. No execution logic is supported, keeping the platform 100% read-only and analytical.

## Non-goals

- No autonomous trade execution or order routing of any form.
- No direct broker integration or write-level account access.
- No changes to Agent05 or Agent06 without explicit approval and log updates.
