import type {
  ActivityActorType,
  ActivityResult,
  ActivityTargetType,
  ActivityTool,
  AuditFindingType,
  AuditSeverity,
  SourceResolution,
  SourceTier,
} from '@moderta/api-contracts/gaia'

export const AUDIT_REPOSITORY = Symbol('AUDIT_REPOSITORY')

/** What the activity feed shows. `createdAt` is the time the event occurred; the name lets the shared cursor helper page over it. */
export interface ActivityRecord {
  id: string
  researchId: string
  tool: ActivityTool
  action: string
  targetType: ActivityTargetType
  targetId: string | null
  targetLabel: string | null
  actorType: ActivityActorType
  actorUserId: string | null
  result: ActivityResult
  reason: string | null
  createdAt: Date
}

/** What another module passes to ActivityRecorder.record. */
export interface NewActivityEvent {
  researchId: string
  tool: ActivityTool
  action: string
  targetType: ActivityTargetType
  targetId?: string
  targetLabel?: string
  actorType: ActivityActorType
  actorUserId?: string
  runId?: string
  result: ActivityResult
  reason?: string
}

export interface AuditFindingRecord {
  type: AuditFindingType
  detail: string
  severity: AuditSeverity
}

/** The few source fields the audit looks at. */
export interface SourceAuditRecord {
  marker: number
  resolution: SourceResolution
  tier: SourceTier | null
}
