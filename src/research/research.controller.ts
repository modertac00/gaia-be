import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { AuthService } from '../auth/auth.service'
import {
  CreateNoteSectionDto,
  CreatePaperDto,
  CreateResearchDto,
  CreateResearchNoteDto,
  ListResearchQueryDto,
  UpdateNoteSectionDto,
  UpdatePaperDto,
  UpdateResearchDto,
  UpdateResearchNoteDto,
} from './dto/research.dto'
import { ResearchService } from './research.service'

@Controller('research')
export class ResearchController {
  constructor(
    private readonly authService: AuthService,
    private readonly researchService: ResearchService,
  ) {}

  @Get()
  async listResearch(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: ListResearchQueryDto,
  ) {
    await this.authService.getCurrentUserFromAuthorization(authorization)

    return this.researchService.listResearch(query)
  }

  @Post()
  async createResearch(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: CreateResearchDto,
  ) {
    const user = await this.authService.getCurrentUserFromAuthorization(authorization)

    return this.researchService.createResearch(user, body)
  }

  @Get(':researchId')
  async getResearch(
    @Headers('authorization') authorization: string | undefined,
    @Param('researchId', ParseUUIDPipe) researchId: string,
  ) {
    await this.authService.getCurrentUserFromAuthorization(authorization)

    return this.researchService.getResearch(researchId)
  }

  @Patch(':researchId')
  async updateResearch(
    @Headers('authorization') authorization: string | undefined,
    @Param('researchId', ParseUUIDPipe) researchId: string,
    @Body() body: UpdateResearchDto,
  ) {
    await this.authService.getCurrentUserFromAuthorization(authorization)

    return this.researchService.updateResearch(researchId, body)
  }

  @Delete(':researchId')
  async archiveResearch(
    @Headers('authorization') authorization: string | undefined,
    @Param('researchId', ParseUUIDPipe) researchId: string,
  ) {
    await this.authService.getCurrentUserFromAuthorization(authorization)

    return this.researchService.updateResearch(researchId, { status: 'archived' })
  }

  @Get(':researchId/notes')
  async listNotes(
    @Headers('authorization') authorization: string | undefined,
    @Param('researchId', ParseUUIDPipe) researchId: string,
  ) {
    await this.authService.getCurrentUserFromAuthorization(authorization)

    return this.researchService.listNotes(researchId)
  }

  @Post(':researchId/notes')
  async createNote(
    @Headers('authorization') authorization: string | undefined,
    @Param('researchId', ParseUUIDPipe) researchId: string,
    @Body() body: CreateResearchNoteDto,
  ) {
    const user = await this.authService.getCurrentUserFromAuthorization(authorization)

    return this.researchService.createNote(user, researchId, body)
  }

  @Get(':researchId/notes/:noteId')
  async getNote(
    @Headers('authorization') authorization: string | undefined,
    @Param('researchId', ParseUUIDPipe) researchId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ) {
    await this.authService.getCurrentUserFromAuthorization(authorization)

    return this.researchService.getNote(researchId, noteId)
  }

  @Patch(':researchId/notes/:noteId')
  async updateNote(
    @Headers('authorization') authorization: string | undefined,
    @Param('researchId', ParseUUIDPipe) researchId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body() body: UpdateResearchNoteDto,
  ) {
    await this.authService.getCurrentUserFromAuthorization(authorization)

    return this.researchService.updateNote(researchId, noteId, body)
  }

  @Post(':researchId/notes/:noteId/sections')
  async createSection(
    @Headers('authorization') authorization: string | undefined,
    @Param('researchId', ParseUUIDPipe) researchId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body() body: CreateNoteSectionDto,
  ) {
    await this.authService.getCurrentUserFromAuthorization(authorization)

    return this.researchService.createSection(researchId, noteId, body)
  }

  @Patch(':researchId/notes/:noteId/sections/:sectionId')
  async updateSection(
    @Headers('authorization') authorization: string | undefined,
    @Param('researchId', ParseUUIDPipe) researchId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() body: UpdateNoteSectionDto,
  ) {
    await this.authService.getCurrentUserFromAuthorization(authorization)

    return this.researchService.updateSection(researchId, noteId, sectionId, body)
  }

  @Delete(':researchId/notes/:noteId/sections/:sectionId')
  async deleteSection(
    @Headers('authorization') authorization: string | undefined,
    @Param('researchId', ParseUUIDPipe) researchId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
  ) {
    await this.authService.getCurrentUserFromAuthorization(authorization)

    return this.researchService.deleteSection(researchId, noteId, sectionId)
  }

  @Get(':researchId/papers')
  async listPapers(
    @Headers('authorization') authorization: string | undefined,
    @Param('researchId', ParseUUIDPipe) researchId: string,
  ) {
    await this.authService.getCurrentUserFromAuthorization(authorization)

    return this.researchService.listPapers(researchId)
  }

  @Post(':researchId/papers')
  async createPaper(
    @Headers('authorization') authorization: string | undefined,
    @Param('researchId', ParseUUIDPipe) researchId: string,
    @Body() body: CreatePaperDto,
  ) {
    const user = await this.authService.getCurrentUserFromAuthorization(authorization)

    return this.researchService.createPaper(user, researchId, body)
  }

  @Patch(':researchId/papers/:paperId')
  async updatePaper(
    @Headers('authorization') authorization: string | undefined,
    @Param('researchId', ParseUUIDPipe) researchId: string,
    @Param('paperId', ParseUUIDPipe) paperId: string,
    @Body() body: UpdatePaperDto,
  ) {
    await this.authService.getCurrentUserFromAuthorization(authorization)

    return this.researchService.updatePaper(researchId, paperId, body)
  }
}
