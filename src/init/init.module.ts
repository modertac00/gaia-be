import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { InitController } from './init.controller'
import { InitService } from './init.service'
import { ResearchDocumentsController } from './research-documents.controller'

@Module({
  imports: [AuthModule],
  controllers: [InitController, ResearchDocumentsController],
  providers: [InitService],
})
export class InitModule {}
