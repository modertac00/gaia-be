import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Patch, Post, Query } from '@nestjs/common'
import {
  type AcceptNoteProposalDto,
  acceptNoteProposalSchema,
  type ListNoteChatQuery,
  listNoteChatQuerySchema,
  type NoteChatAccepted,
  type NoteChatMessage,
  type NoteProposal,
  type NoteProposalAccepted,
  type NoteProposalIdParam,
  noteProposalIdParamSchema,
  type NoteSection,
  type NoteSectionIdParam,
  noteSectionIdParamSchema,
  type RequestNoteSectionEditDto,
  requestNoteSectionEditSchema,
  type ResearchIdParam,
  researchIdParamSchema,
  type ResearchNoteWithProposals,
  type SendNoteChatDto,
  sendNoteChatSchema,
  type UpdateNoteSectionDto,
  updateNoteSectionSchema,
} from '@moderta/api-contracts/gaia'
import { CurrentUser } from '@/common/auth'
import type { ListResult } from '@/common/http/response-results'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { NotesService } from '@/research-app/notes/services/notes.service'
import {
  ApiAcceptNoteProposal,
  ApiDiscardNoteProposal,
  ApiGetNote,
  ApiGetNoteProposal,
  ApiListNoteChat,
  ApiNotesController,
  ApiRequestNoteSectionEdit,
  ApiSendNoteChat,
  ApiUpdateNoteSection,
} from './notes.swagger'

@ApiNotesController()
@Controller('research/:researchId/note')
export class NotesController {
  constructor(@Inject(NotesService) private readonly notesService: NotesService) { }

  @ApiGetNote()
  @Get()
  get(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(researchIdParamSchema)) params: ResearchIdParam,
  ): Promise<ResearchNoteWithProposals> {
    return this.notesService.get(userId, params.researchId)
  }

  @ApiUpdateNoteSection()
  @Patch('sections/:sectionId')
  updateSection(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(noteSectionIdParamSchema)) params: NoteSectionIdParam,
    @Body(new ZodValidationPipe(updateNoteSectionSchema)) body: UpdateNoteSectionDto,
  ): Promise<NoteSection> {
    return this.notesService.updateSection(userId, params.researchId, params.sectionId, body)
  }

  @ApiRequestNoteSectionEdit()
  @Post('sections/:sectionId/ai-edits')
  @HttpCode(HttpStatus.ACCEPTED)
  requestSectionEdit(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(noteSectionIdParamSchema)) params: NoteSectionIdParam,
    @Body(new ZodValidationPipe(requestNoteSectionEditSchema)) body: RequestNoteSectionEditDto,
  ): Promise<NoteProposalAccepted> {
    return this.notesService.requestSectionEdit(userId, params.researchId, params.sectionId, body)
  }

  @ApiGetNoteProposal()
  @Get('proposals/:proposalId')
  getProposal(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(noteProposalIdParamSchema)) params: NoteProposalIdParam,
  ): Promise<NoteProposal> {
    return this.notesService.getProposal(userId, params.researchId, params.proposalId)
  }

  @ApiAcceptNoteProposal()
  @Post('proposals/:proposalId/acceptance')
  @HttpCode(HttpStatus.OK)
  accept(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(noteProposalIdParamSchema)) params: NoteProposalIdParam,
    @Body(new ZodValidationPipe(acceptNoteProposalSchema)) body: AcceptNoteProposalDto,
  ): Promise<NoteProposal> {
    return this.notesService.acceptProposal(userId, params.researchId, params.proposalId, body)
  }

  @ApiDiscardNoteProposal()
  @Post('proposals/:proposalId/discard')
  @HttpCode(HttpStatus.OK)
  discard(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(noteProposalIdParamSchema)) params: NoteProposalIdParam,
  ): Promise<NoteProposal> {
    return this.notesService.discardProposal(userId, params.researchId, params.proposalId)
  }

  @ApiListNoteChat()
  @Get('chat')
  chat(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(researchIdParamSchema)) params: ResearchIdParam,
    @Query(new ZodValidationPipe(listNoteChatQuerySchema)) query: ListNoteChatQuery,
  ): Promise<ListResult<NoteChatMessage>> {
    return this.notesService.chat(userId, params.researchId, query)
  }

  @ApiSendNoteChat()
  @Post('chat')
  @HttpCode(HttpStatus.ACCEPTED)
  sendChat(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(researchIdParamSchema)) params: ResearchIdParam,
    @Body(new ZodValidationPipe(sendNoteChatSchema)) body: SendNoteChatDto,
  ): Promise<NoteChatAccepted> {
    return this.notesService.sendChat(userId, params.researchId, body)
  }
}
