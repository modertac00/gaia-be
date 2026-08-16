import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common'
import { AuthService } from '../auth/auth.service'
import {
  CreateChatDto,
  ListChatQueryDto,
  RunChatDto,
} from './dto/research-note-chats.dto'
import { ResearchNoteChatsService } from './research-note-chats.service'

@Controller('research/:researchId/notes/:noteId/chats')
export class ResearchNoteChatsController {
  constructor(
    private readonly authService: AuthService,
    private readonly researchNoteChatsService: ResearchNoteChatsService,
  ) {}

  @Get()
  async listChats(
    @Headers('authorization') authorization: string | undefined,
    @Param('researchId', ParseUUIDPipe) researchId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Query() query: ListChatQueryDto,
  ) {
    await this.authService.getCurrentUserFromAuthorization(authorization)

    return this.researchNoteChatsService.listChats(researchId, noteId, query)
  }

  @Post()
  async createChat(
    @Headers('authorization') authorization: string | undefined,
    @Param('researchId', ParseUUIDPipe) researchId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body() body: CreateChatDto,
  ) {
    const user = await this.authService.getCurrentUserFromAuthorization(authorization)

    return this.researchNoteChatsService.createChat(user, researchId, noteId, body)
  }

  @Post('run')
  async runChat(
    @Headers('authorization') authorization: string | undefined,
    @Param('researchId', ParseUUIDPipe) researchId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body() body: RunChatDto,
  ) {
    const user = await this.authService.getCurrentUserFromAuthorization(authorization)

    return this.researchNoteChatsService.runChat(user, researchId, noteId, body)
  }
}
