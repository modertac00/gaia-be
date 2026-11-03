import { Inject, Injectable } from '@nestjs/common'
import {
  AUDIT_CHECK_TYPE,
  AUDIT_FINDING_TYPE,
  AUDIT_SEVERITY,
  type ActivityEvent,
  type AuditChecks,
  INVALID_CURSOR_MESSAGE,
  type ListActivityQuery,
} from '@moderta/api-contracts/gaia'
import { decodeCursor, toRecordPage } from '@/common/database/cursor-pagination'
import { ValidationFailedException } from '@/common/http/api-exception'
import { type ListResult, paginated } from '@/common/http/response-results'
import { AUDIT_REPOSITORY } from '@/research-app/audit/interfaces/audit-repository.interface'
import { AuditRepository } from '@/research-app/audit/repositories/audit.repository'
import {
  buildFindingsCheck,
  buildProblematicSourcesCheck,
  buildUnsupportedClaimsCheck,
  countUnsupportedClaims,
} from '@/research-app/audit/utils/audit-checks'
import { toActivityEvent } from '@/research-app/audit/utils/audit-mapper'
import { ResearchAccess } from '@/research-app/research/services/research-access.service'

@Injectable()
export class AuditService {
  constructor(
    @Inject(AUDIT_REPOSITORY) private readonly repository: AuditRepository,
    @Inject(ResearchAccess) private readonly research: ResearchAccess,
  ) { }

  async getChecks(userId: string, researchId: string): Promise<AuditChecks> {
    await this.research.assertVisible(userId, researchId)

    const noteContent = await this.repository.findLatestNoteContent(researchId)
    const findings = await this.repository.findFindings(researchId)
    const sources = await this.repository.findIncludedSourcesForAudit(researchId)

    return [
      buildUnsupportedClaimsCheck(countUnsupportedClaims(noteContent)),
      buildFindingsCheck(
        AUDIT_CHECK_TYPE.CITATION_MISMATCHES,
        AUDIT_FINDING_TYPE.CITATION_MISMATCH,
        AUDIT_SEVERITY.DANGER,
        'No citation mismatches',
        findings,
      ),
      buildFindingsCheck(
        AUDIT_CHECK_TYPE.INCONSISTENT_FIGURES,
        AUDIT_FINDING_TYPE.INCONSISTENT_FIGURE,
        AUDIT_SEVERITY.WARNING,
        'No inconsistent figures',
        findings,
      ),
      buildProblematicSourcesCheck(sources),
    ]
  }

  async listActivity(userId: string, researchId: string, query: ListActivityQuery): Promise<ListResult<ActivityEvent>> {
    const { cursor, limit } = query
    const after = cursor ? decodeCursor(cursor) : null
    if (cursor && !after) throw new ValidationFailedException({ cursor: [INVALID_CURSOR_MESSAGE] })

    await this.research.assertVisible(userId, researchId)

    const records = await this.repository.findActivityPage(researchId, { after, limit })
    const page = toRecordPage(records, limit)
    return paginated<ActivityEvent>({ items: page.records.map(toActivityEvent), nextCursor: page.nextCursor }, limit)
  }
}
