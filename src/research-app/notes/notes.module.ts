import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { AiModule } from '@/ai/ai.module'
import { AuditModule } from '@/research-app/audit/audit.module'
import { EvidenceRowModel } from '@/research-app/evidence/models/evidence-row.model'
import { NoteChatHandler } from '@/research-app/notes/handlers/note-chat.handler'
import { NoteSectionReadyHandler } from '@/research-app/notes/handlers/note-section-ready.handler'
import { NoteSectionEditHandler } from '@/research-app/notes/handlers/note-section-edit.handler'
import { NOTES_REPOSITORY } from '@/research-app/notes/interfaces/notes-repository.interface'
import { ResearchNoteAiProposalModel } from '@/research-app/notes/models/research-note-ai-proposal.model'
import { ResearchNoteChatModel } from '@/research-app/notes/models/research-note-chat.model'
import { ResearchNoteModel } from '@/research-app/notes/models/research-note.model'
import { NotesController } from '@/research-app/notes/notes.controller'
import { NotesRepository } from '@/research-app/notes/repositories/notes.repository'
import { NotesService } from '@/research-app/notes/services/notes.service'
import { ResearchModule } from '@/research-app/research/research.module'
import { SourceModel } from '@/research-app/sources/models/source.model'

@Module({
  imports: [
    AiModule,
    AuditModule,
    ResearchModule,
    SequelizeModule.forFeature([ResearchNoteModel, ResearchNoteAiProposalModel, ResearchNoteChatModel, SourceModel, EvidenceRowModel]),
  ],
  controllers: [NotesController],
  providers: [
    NotesService,
    NoteSectionEditHandler,
    NoteSectionReadyHandler,
    NoteChatHandler,
    { provide: NOTES_REPOSITORY, useClass: NotesRepository },
  ],
})
export class NotesModule { }
