import { Controller, Get, HttpCode, HttpStatus, Inject, Param, Post } from '@nestjs/common'
import {
  type EvidenceIdParam,
  evidenceIdParamSchema,
  type EvidenceMatrix,
  type EvidenceRow,
  type ResearchIdParam,
  researchIdParamSchema,
} from '@moderta/api-contracts/gaia'
import { CurrentUser } from '@/common/auth'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { EvidenceService } from '@/research-app/evidence/services/evidence.service'
import {
  ApiAcceptEvidence,
  ApiEvidenceController,
  ApiGetEvidence,
  ApiRejectEvidence,
} from './evidence.swagger'

@ApiEvidenceController()
@Controller('research/:researchId/evidence')
export class EvidenceController {
  constructor(@Inject(EvidenceService) private readonly evidenceService: EvidenceService) { }

  @ApiGetEvidence()
  @Get()
  get(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(researchIdParamSchema)) params: ResearchIdParam,
  ): Promise<EvidenceMatrix> {
    return this.evidenceService.get(userId, params.researchId)
  }

  @ApiAcceptEvidence()
  @Post(':evidenceId/acceptance')
  @HttpCode(HttpStatus.OK)
  accept(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(evidenceIdParamSchema)) params: EvidenceIdParam,
  ): Promise<EvidenceRow> {
    return this.evidenceService.accept(userId, params.researchId, params.evidenceId)
  }

  @ApiRejectEvidence()
  @Post(':evidenceId/rejection')
  @HttpCode(HttpStatus.OK)
  reject(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(evidenceIdParamSchema)) params: EvidenceIdParam,
  ): Promise<EvidenceRow> {
    return this.evidenceService.reject(userId, params.researchId, params.evidenceId)
  }
}
