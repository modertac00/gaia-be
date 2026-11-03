import { applyDecorators, HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  acceptNoteProposalSchema,
  listNoteChatQuerySchema,
  noteChatAcceptedSchema,
  noteChatMessageSchema,
  noteProposalAcceptedSchema,
  noteProposalIdParamSchema,
  noteProposalSchema,
  noteSectionIdParamSchema,
  noteSectionSchema,
  requestNoteSectionEditSchema,
  researchIdParamSchema,
  researchNoteWithProposalsSchema,
  sendNoteChatSchema,
  updateNoteSectionSchema,
} from '@moderta/api-contracts/gaia'
import { ApiErrorResponses, ApiZodListResponse, ApiZodResponse, ZodBody, ZodParam, ZodQuery } from '@/common/swagger'

const { BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, CONFLICT, SERVICE_UNAVAILABLE } = HttpStatus

export const ApiNotesController = () => applyDecorators(ApiTags('notes'), ApiBearerAuth())

export const ApiGetNote = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get the latest version of the research note with its pending AI proposals' }),
    ZodParam(researchIdParamSchema),
    ApiZodResponse(researchNoteWithProposalsSchema, HttpStatus.OK, 'Note'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND),
  )

export const ApiUpdateNoteSection = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Replace the content of one note section',
      description: 'The section becomes a person edit: status follows the content, revisions increase.',
    }),
    ZodParam(noteSectionIdParamSchema),
    ZodBody(updateNoteSectionSchema),
    ApiZodResponse(noteSectionSchema, HttpStatus.OK, 'Updated section'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND),
  )

export const ApiRequestNoteSectionEdit = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ask the assistant to edit one section',
      description:
        'Creates a pending proposal and returns its id; poll the proposal until it has content. Pass proposalId to refine a pending proposal.',
    }),
    ZodParam(noteSectionIdParamSchema),
    ZodBody(requestNoteSectionEditSchema),
    ApiZodResponse(noteProposalAcceptedSchema, HttpStatus.ACCEPTED, 'Edit accepted; read the result from the proposal'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, CONFLICT, SERVICE_UNAVAILABLE),
  )

export const ApiGetNoteProposal = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get one AI proposal' }),
    ZodParam(noteProposalIdParamSchema),
    ApiZodResponse(noteProposalSchema, HttpStatus.OK, 'Proposal'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND),
  )

export const ApiAcceptNoteProposal = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Accept a pending proposal into its section',
      description: 'Mode replace swaps the section content and citations; append adds the text after the existing content.',
    }),
    ZodParam(noteProposalIdParamSchema),
    ZodBody(acceptNoteProposalSchema),
    ApiZodResponse(noteProposalSchema, HttpStatus.OK, 'Accepted proposal'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, CONFLICT),
  )

export const ApiDiscardNoteProposal = () =>
  applyDecorators(
    ApiOperation({ summary: 'Discard a pending proposal' }),
    ZodParam(noteProposalIdParamSchema),
    ApiZodResponse(noteProposalSchema, HttpStatus.OK, 'Discarded proposal'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, CONFLICT),
  )

export const ApiListNoteChat = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Note chat messages (cursor paginated)',
      description: 'Pages go from the newest backwards; the messages inside each page are oldest first.',
    }),
    ZodParam(researchIdParamSchema),
    ZodQuery(listNoteChatQuerySchema),
    ApiZodListResponse(noteChatMessageSchema, HttpStatus.OK, 'Messages; meta.nextCursor is null on the last page'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND),
  )

export const ApiSendNoteChat = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Send a message to the note assistant',
      description: 'The message is saved first; the reply (and any section proposal) appears in the chat list and note.',
    }),
    ZodParam(researchIdParamSchema),
    ZodBody(sendNoteChatSchema),
    ApiZodResponse(noteChatAcceptedSchema, HttpStatus.ACCEPTED, 'Message accepted'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, SERVICE_UNAVAILABLE),
  )
