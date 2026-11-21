# Phase 2 backlog — deliberately unimplemented
- Gaia research creation currently writes `queued` to PostgreSQL without publishing SQS. Implement validated and idempotent task enqueue/outbox.
- Gaia currently lacks AI status queue consumer and response-to-research persistence; align schema and response contracts with AI backend.
- AI backend local document persistence must be replaced with private S3 before processing real research documents.
- AI worker startup currently polls SQS; provision real queues for the AI deployment separately, not by Gaia Phase 1 CI.
- Add duplicate delivery handling, dead-letter alarms, task correlation, contract version compatibility and honest processing status.
- Gaia Traefik route is prepared conceptually only. Domain/TLS/router activation requires a separately approved workflow mirroring existing gateway governance.
- Never return mock AI answers as successful production research results.
