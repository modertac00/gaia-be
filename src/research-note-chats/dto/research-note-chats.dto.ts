import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'

const chatRoles = ['user', 'assistant', 'system', 'tool']
const chatMessageTypes = [
  'chat',
  'instruction',
  'paper_search',
  'regulation_scan',
  'competitor_scan',
  'summary',
  'source_verification',
  'note_revision',
]

export class ListChatQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number

  @IsOptional()
  @IsIn(chatMessageTypes)
  messageType?: string
}

export class CreateChatDto {
  @IsString()
  message!: string

  @IsIn(chatMessageTypes)
  @IsOptional()
  messageType?: string

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>

  @IsIn(chatRoles)
  role!: string
}

export class RunChatDto {
  @IsString()
  message!: string

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>

  @IsIn(chatMessageTypes)
  taskType!: string
}
