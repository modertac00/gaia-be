import { IsIn, IsOptional, IsString } from 'class-validator'

export type ResearchType =
  | 'market'
  | 'regulation'
  | 'competitor'
  | 'customer-problem'

export class CreateResearchRequestDto {
  @IsOptional()
  @IsString()
  aiInstructions?: string

  @IsString()
  guidingQuestions!: string

  @IsIn(['market', 'regulation', 'competitor', 'customer-problem'])
  researchType!: ResearchType

  @IsString()
  scopeNotes!: string

  @IsString()
  topic!: string
}
