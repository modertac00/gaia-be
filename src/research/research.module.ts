import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ResearchNoteChatsController } from '../research-note-chats/research-note-chats.controller'
import { ResearchNoteChatsService } from '../research-note-chats/research-note-chats.service'
import { ResearchController } from './research.controller'
import { ResearchService } from './research.service'

@Module({
  imports: [AuthModule],
  controllers: [ResearchController, ResearchNoteChatsController],
  providers: [ResearchService, ResearchNoteChatsService],
})
export class ResearchModule {}
