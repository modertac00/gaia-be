# gaia-be Claude Guide

Follow `AGENTS.md` as the primary repository instruction. Rules live once in `.ai/instructions/` (architecture, coding standards, contracts, database, API, security, testing); durable context in `.ai/knowledge/`; planned work in `.ai/specs/`.

Before changing code, inspect current callers, contracts (`../esm-common-modules/src/gaia`) and tests. Keep changes scoped, typed and compatible. Never declare a request/response type, domain enum list or validation schema locally; it belongs in `@moderta/api-contracts/gaia`. Never claim tests passed unless you ran them. Never bypass authentication, validation or ownership scoping to simplify an implementation.

For backend tasks prefer the project workflows: `/new-module`, `/new-endpoint`, `/add-contract`, `/new-migration`, `/audit-duplication`, `/review-backend`, `/verify`.
