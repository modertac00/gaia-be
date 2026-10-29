import {
  AUDIT_CHECK_TYPE,
  AUDIT_SEVERITY,
  SOURCE_RESOLUTION,
  SOURCE_TIER,
  type AuditCheck,
  type AuditCheckType,
  type AuditFindingType,
  type AuditSeverity,
  type NoteContent,
} from '@moderta/api-contracts/gaia'
import type { AuditFindingRecord, SourceAuditRecord } from '@/research-app/audit/interfaces/audit-repository.interface'

export function countUnsupportedClaims(content: NoteContent | null): number {
  if (!content) return 0

  let count = 0
  for (const section of content.sections) {
    count += section.unsupported.length
  }
  return count
}

export function buildUnsupportedClaimsCheck(count: number): AuditCheck {
  let detail = 'No unsupported claims'
  if (count === 1) detail = '1 statement has no citation attached'
  if (count > 1) detail = `${count} statements have no citation attached`

  return { type: AUDIT_CHECK_TYPE.UNSUPPORTED_CLAIMS, detail, count, severity: AUDIT_SEVERITY.WARNING }
}

/** Builds a check from the AI findings of one type: the count of findings and the first finding's detail. */
export function buildFindingsCheck(
  checkType: AuditCheckType,
  findingType: AuditFindingType,
  severity: AuditSeverity,
  emptyDetail: string,
  findings: AuditFindingRecord[],
): AuditCheck {
  const ofType: AuditFindingRecord[] = []
  for (const finding of findings) {
    if (finding.type === findingType) ofType.push(finding)
  }

  let detail = emptyDetail
  if (ofType.length > 0) detail = ofType[0].detail

  return { type: checkType, detail, count: ofType.length, severity }
}

/** A source is a problem when it cannot be resolved or it is press / secondary coverage. */
function describeProblem(source: SourceAuditRecord): string | null {
  if (source.resolution === SOURCE_RESOLUTION.UNRESOLVED) return `source ${source.marker} unresolvable`
  if (source.tier === SOURCE_TIER.PRESS_SECONDARY) return `source ${source.marker} is press / secondary coverage`
  return null
}

export function buildProblematicSourcesCheck(sources: SourceAuditRecord[]): AuditCheck {
  const problems: string[] = []
  for (const source of sources) {
    const problem = describeProblem(source)
    if (problem) problems.push(problem)
  }

  let detail = 'No problematic sources'
  if (problems.length > 0) {
    const text = problems.join(' · ')
    detail = text.charAt(0).toUpperCase() + text.slice(1)
  }

  return { type: AUDIT_CHECK_TYPE.PROBLEMATIC_SOURCES, detail, count: problems.length, severity: AUDIT_SEVERITY.DANGER }
}
