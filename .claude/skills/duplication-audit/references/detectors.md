# Detectors (candidate nominators — always read the hit)

```bash
T=${1:-src}

# 1. Local domain value lists (string arrays / unions)
grep -rnE "^(export )?const [a-zA-Z]+(s|Types|Statuses|Roles|Kinds) = \[\s*'" $T
grep -rnE "^(export )?const [a-zA-Z]+ = \[$" $T          # multi-line arrays: read the next lines
grep -rnE "type [A-Z][A-Za-z]+ = '[a-z_-]+' \|" $T
grep -rnE "^(export )?type [A-Z][A-Za-z]+ =$" -A1 $T | grep -E "\| '" # multi-line unions
grep -rnE "@IsIn\(\[" $T

# 2. Request/response shapes declared locally
grep -rnE "^export (class|interface|type) [A-Z][A-Za-z]*(Dto|Request|Response|Body|Query|Payload|Page)\b" $T
grep -rnE "from 'class-validator'" $T          # legacy validation to migrate to Zod contracts
grep -rnE "z\.object\(" $T                     # Zod schemas living in gaia-be

# 3. Hardcoded limits and messages
grep -rnE "@(Min|Max|MaxLength|MinLength)\([0-9]+\)|\.(min|max)\([0-9]+\)" $T
grep -rnE "Exception\('[^']+'\)" $T | sort -t: -k3 | uniq -f2 -D

# 4. Copy-pasted framework logic
grep -rnE "authorization|Bearer|extractBearerToken" $T
grep -rnE "limit \+ 1|nextCursor" $T
grep -rnE "BEGIN|ROLLBACK|COMMIT|\.transaction\(" $T
grep -rnE "private (map|to)[A-Z][A-Za-z]+\(" $T  # mappers inside services

# 5. Near-identical functions (manual): list functions with the same name in multiple files
grep -rhoE "(function|private|async) [a-zA-Z]+\(" $T | sort | uniq -c | sort -rn | awk '$1>1'
```

Known baseline findings (2026-10, verify they still exist): `researchTypes`/`researchStatuses`/`noteStatuses` in `src/research/dto/research.dto.ts`; `ResearchType` union + inline `@IsIn` in `src/init/dto/create-research-request.dto.ts`; labels in `init.service.ts formatResearchType`; `chatRoles`/`chatMessageTypes` in `src/research-note-chats/dto/research-note-chats.dto.ts`; duplicated cursor/limit query DTOs; `extractBearerToken` in 4 files; `LoginDto` password min 8 vs `AUTH_VALIDATION_LIMITS` in `esm-common-modules/src/validation/auth.schema.ts` (and `scripts/create-account.ts`); `PublicUser`/login response in `src/users/user.types.ts` and `auth.service.ts`.
