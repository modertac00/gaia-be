import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

const researchTypes = ['market', 'regulation', 'competitor', 'customer-problem']
const researchStatuses = [
  'requested',
  'queued',
  'researching',
  'draft_ready',
  'in_review',
  'approved',
  'rejected',
  'consumed_by_atlas',
  'archived',
]
const noteStatuses = ['draft', 'in_review', 'approved', 'rejected']

export class ListResearchQueryDto {
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
  @IsIn(researchTypes)
  researchType?: string

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsIn(researchStatuses)
  status?: string
}

export class CreateResearchDto {
  @IsOptional()
  @IsString()
  aiInstructions?: string

  @IsIn(researchTypes)
  researchType!: string

  @IsOptional()
  @IsString()
  scopeNotes?: string

  @IsIn(researchStatuses)
  @IsOptional()
  status?: string

  @IsString()
  title!: string

  @IsString()
  topic!: string
}

export class UpdateResearchDto {
  @IsOptional()
  @IsString()
  aiInstructions?: string

  @IsOptional()
  @IsIn(researchTypes)
  researchType?: string

  @IsOptional()
  @IsString()
  scopeNotes?: string

  @IsOptional()
  @IsIn(researchStatuses)
  status?: string

  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  topic?: string
}

export class CreateNoteSectionDto {
  @IsString()
  content!: string

  @IsOptional()
  @IsString()
  contentFormat?: string

  @IsObject()
  @IsOptional()
  formatMetadata?: Record<string, unknown>

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  position?: number

  @IsString()
  title!: string
}

export class CreateResearchNoteDto {
  @IsObject()
  @IsOptional()
  formatSchema?: Record<string, unknown>

  @ValidateNested({ each: true })
  @Type(() => CreateNoteSectionDto)
  @IsOptional()
  sections?: CreateNoteSectionDto[]

  @IsIn(noteStatuses)
  @IsOptional()
  status?: string

  @IsString()
  title!: string
}

export class UpdateResearchNoteDto {
  @IsObject()
  @IsOptional()
  formatSchema?: Record<string, unknown>

  @IsOptional()
  @IsIn(noteStatuses)
  status?: string

  @IsOptional()
  @IsString()
  title?: string
}

export class UpdateNoteSectionDto {
  @IsOptional()
  @IsString()
  content?: string

  @IsOptional()
  @IsString()
  contentFormat?: string

  @IsObject()
  @IsOptional()
  formatMetadata?: Record<string, unknown>

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  position?: number

  @IsOptional()
  @IsString()
  title?: string
}

export class CreatePaperDto {
  @IsString()
  description!: string

  @IsBoolean()
  @IsOptional()
  isVerified?: boolean

  @IsOptional()
  @IsUrl({ require_protocol: true })
  paperUrl?: string

  @IsString()
  title!: string
}

export class UpdatePaperDto {
  @IsOptional()
  @IsString()
  description?: string

  @IsBoolean()
  @IsOptional()
  isVerified?: boolean

  @IsOptional()
  @IsUrl({ require_protocol: true })
  paperUrl?: string | null

  @IsOptional()
  @IsString()
  title?: string
}
