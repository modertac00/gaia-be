import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post } from '@nestjs/common'
import {
  type ClarificationDraft,
  type ClarificationIdParam,
  clarificationIdParamSchema,
  type RequestClarificationDto,
  requestClarificationSchema,
} from '@moderta/api-contracts/gaia'
import { CurrentUser } from '@/common/auth'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { ClarificationsService } from '@/research-app/clarifications/services/clarifications.service'
import { ApiClarificationsController, ApiGetClarification, ApiRequestClarification } from './clarifications.swagger'

@ApiClarificationsController()
@Controller('research/clarifications')
export class ClarificationsController {
  constructor(@Inject(ClarificationsService) private readonly clarificationsService: ClarificationsService) { }

  @ApiRequestClarification()
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  request(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(requestClarificationSchema)) body: RequestClarificationDto,
  ): Promise<ClarificationDraft> {
    return this.clarificationsService.request(userId, body)
  }

  @ApiGetClarification()
  @Get(':clarificationId')
  get(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(clarificationIdParamSchema)) params: ClarificationIdParam,
  ): Promise<ClarificationDraft> {
    return this.clarificationsService.get(userId, params.clarificationId)
  }
}
