import type { ActivityEvent } from '@moderta/api-contracts/gaia'
import type { ActivityRecord } from '@/research-app/audit/interfaces/audit-repository.interface'

// actorName is null until the codebase has a user lookup to resolve actorUserId to a display name.
export function toActivityEvent(record: ActivityRecord): ActivityEvent {
  return {
    id: record.id,
    researchId: record.researchId,
    tool: record.tool,
    action: record.action,
    targetType: record.targetType,
    targetId: record.targetId,
    targetLabel: record.targetLabel,
    actorType: record.actorType,
    actorUserId: record.actorUserId,
    actorName: null,
    result: record.result,
    reason: record.reason,
    occurredAt: record.createdAt.toISOString(),
  }
}
