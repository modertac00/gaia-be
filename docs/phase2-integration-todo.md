# Deferred integration register (not Phase 1)

1. Enable Gaia public Traefik route only after DNS is selected, ACM/Let's Encrypt configured, and gateway governance reviewed. Gaia is prepared with stable port 3001, `/health`, `/ready`, and `CORS_ALLOWED_ORIGINS`.
2. Align research-created task contract to the AI backend's required section templates, request IDs and citation fields.
3. Implement transactional SQS task outbox for Gaia, and Gaia status consumer; idempotency and ordering required.
4. Use the reserved `moderta-production-gaia-ai-tasks` and `moderta-production-gaia-ai-status` queues (plus DLQs), or reconcile names with the AI backend before integration. Phase 1 Gaia app has no SQS privileges.
5. Implement durable S3 storage for AI backend and result persistence mapping in Gaia.
6. Validate Bedrock profiles in ap-south-1 and retry/failure behavior; empty queues are not an integration test.
7. Do not send business jobs until end-to-end contract tests and deployment acceptance tests pass.
