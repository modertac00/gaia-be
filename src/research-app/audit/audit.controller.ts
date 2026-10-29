import { Controller, Get, Inject, Param, Query } from '@nestjs/common'
import {
  type ActivityEvent,
  type AuditChecks,
  type ListActivityQuery,
  listActivityQuerySchema,
  type ResearchIdParam,
  researchIdParamSchema,
} from '@moderta/api-contracts/gaia'
import { CurrentUser } from '@/common/auth'
import type { ListResult } from '@/common/http/response-results'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { AuditService } from '@/research-app/audit/services/audit.service'
import { ApiAuditController, ApiGetAuditChecks, ApiListActivity } from './audit.swagger'

@ApiAuditController()
@Controller('research/:researchId')
export class AuditController {
  constructor(@Inject(AuditService) private readonly auditService: AuditService) { }

  @ApiGetAuditChecks()
  @Get('audit/checks')
  getChecks(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(researchIdParamSchema)) params: ResearchIdParam,
  ): Promise<AuditChecks> {
    return this.auditService.getChecks(userId, params.researchId)
  }

  @ApiListActivity()
  @Get('activity')
  listActivity(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(researchIdParamSchema)) params: ResearchIdParam,
    @Query(new ZodValidationPipe(listActivityQuerySchema)) query: ListActivityQuery,
  ): Promise<ListResult<ActivityEvent>> {
    return this.auditService.listActivity(userId, params.researchId, query)
  }
}
