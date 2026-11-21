# Validation scope
Local static checks: CDK source, Python syntax, JSON/YAML workflows, build/lockfile checks. No live AWS IAM, DB, SQS, Traefik or ECS actions are made by creating this ZIP. Actual GitHub OIDC subject and DB grant verification must be done in the protected workflows. Migration snapshot is of the entire shared RDS instance, and rollback is a separately reviewed database recovery operation.

Known test limitation: npm dependency install timed out in the sandbox; TypeScript compilation and Docker build have not completed. The CDK lockfile is based on the supplied AI Desk reference dependency lock, with the package name adapted and the same version constraints. Test `npm ci && npm test` in CI before CDK diff/deploy.
