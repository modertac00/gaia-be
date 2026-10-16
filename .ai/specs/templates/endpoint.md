# Endpoint spec: <VERB> <path>

## Purpose
## Owning module
## Contracts
- Request: <schema name / new fields>
- Response: <schema name>
- Messages/limits: <constants>
## Behaviour
- Business rules:
- Ownership predicate:
- Errors: 400 / 401 / 404 / 409 when …
## Persistence
- Repository method(s): <new or existing signature>
- Migration needed: yes/no
## Tests
- service: …
- e2e: happy, 400, 401, 404 other-user, 404 missing
