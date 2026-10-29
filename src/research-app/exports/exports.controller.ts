import { Body, Controller, Inject, Param, Post } from '@nestjs/common'
import {
  type CreateExportDto,
  createExportSchema,
  type Export,
  type ResearchIdParam,
  researchIdParamSchema,
} from '@moderta/api-contracts/gaia'
import { CurrentUser } from '@/common/auth'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { ExportsService } from '@/research-app/exports/services/exports.service'
import { ApiCreateExport, ApiExportsController } from './exports.swagger'

@ApiExportsController()
@Controller('research/:researchId/exports')
export class ExportsController {
  constructor(@Inject(ExportsService) private readonly exportsService: ExportsService) { }

  @ApiCreateExport()
  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(researchIdParamSchema)) params: ResearchIdParam,
    @Body(new ZodValidationPipe(createExportSchema)) body: CreateExportDto,
  ): Promise<Export> {
    return this.exportsService.create(userId, params.researchId, body)
  }
}
