import { Inject, Injectable } from '@nestjs/common'
import type { RepositoryOptions } from '@/common/database/repository-options'
import { AUDIT_REPOSITORY, type NewActivityEvent } from '@/research-app/audit/interfaces/audit-repository.interface'
import { AuditRepository } from '@/research-app/audit/repositories/audit.repository'

/** Other modules call this to add one line to a research's activity feed. Pass the options to join their transaction. */
@Injectable()
export class ActivityRecorder {
  constructor(@Inject(AUDIT_REPOSITORY) private readonly repository: AuditRepository) { }

  record(input: NewActivityEvent, options: RepositoryOptions = {}): Promise<void> {
    return this.repository.createActivity(input, options)
  }
}
