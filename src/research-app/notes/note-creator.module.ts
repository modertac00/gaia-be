import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { ResearchNoteModel } from '@/research-app/notes/models/research-note.model'
import { NoteCreator } from '@/research-app/notes/services/note-creator.service'

@Module({
  imports: [SequelizeModule.forFeature([ResearchNoteModel])],
  providers: [NoteCreator],
  exports: [NoteCreator],
})
export class NoteCreatorModule { }
