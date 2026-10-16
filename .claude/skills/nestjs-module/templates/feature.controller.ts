import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  create__Feature__Schema,
  list__Feature__QuerySchema,
  update__Feature__Schema,
  type __Feature__,
  type Create__Feature__Dto,
  type CursorPage,
  type List__Feature__Query,
  type Update__Feature__Dto,
} from '@moderta/api-contracts/gaia'
import { CurrentUser } from '../../common/auth/current-user.decorator'
import type { AuthenticatedUser } from '../../common/auth/authenticated-user'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { __Feature__Service } from './__feature__.service'

@ApiTags('__route__')
@ApiBearerAuth()
@Controller('__route__')
export class __Feature__Controller {
  constructor(private readonly __featureCamel__Service: __Feature__Service) {}

  @Get()
  @ApiOperation({ summary: 'List __route__ owned by the current user' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(list__Feature__QuerySchema)) query: List__Feature__Query,
  ): Promise<CursorPage<__Feature__>> {
    return this.__featureCamel__Service.list(user, query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one __feature__' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<__Feature__> {
    return this.__featureCamel__Service.get(user, id)
  }

  @Post()
  @ApiOperation({ summary: 'Create a __feature__' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(create__Feature__Schema)) body: Create__Feature__Dto,
  ): Promise<__Feature__> {
    return this.__featureCamel__Service.create(user, body)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a __feature__' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(update__Feature__Schema)) body: Update__Feature__Dto,
  ): Promise<__Feature__> {
    return this.__featureCamel__Service.update(user, id, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a __feature__' })
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.__featureCamel__Service.archive(user, id)
  }
}
