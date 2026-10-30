import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { CLARIFICATION_STATUS, type AiError, type ClarificationResult, type RequestClarificationDto } from '@moderta/api-contracts/gaia'
import type {
  ClarificationRecord,
  ClarificationsRepositoryPort,
} from '@/research-app/clarifications/interfaces/clarifications-repository.interface'
import { ResearchClarificationModel } from '@/research-app/clarifications/models/research-clarification.model'

@Injectable()
export class ClarificationsRepository implements ClarificationsRepositoryPort {
  constructor(@InjectModel(ResearchClarificationModel) private readonly model: typeof ResearchClarificationModel) { }

  async createPending(userId: string, brief: RequestClarificationDto): Promise<ClarificationRecord> {
    const row = await this.model.create({ createdBy: userId, status: CLARIFICATION_STATUS.PENDING, brief })
    return this.toRecord(row)
  }

  async findOwned(userId: string, clarificationId: string): Promise<ClarificationRecord | null> {
    const row = await this.model.findOne({ where: { id: clarificationId, createdBy: userId } })
    return row ? this.toRecord(row) : null
  }

  async delete(clarificationId: string): Promise<void> {
    await this.model.destroy({ where: { id: clarificationId } })
  }

  async saveReady(clarificationId: string, result: Pick<ClarificationResult, 'suggestedQuestion' | 'questions'>): Promise<boolean> {
    const [updated] = await this.model.update(
      { status: CLARIFICATION_STATUS.READY, suggestedQuestion: result.suggestedQuestion, questions: result.questions, error: null },
      { where: { id: clarificationId } },
    )
    return updated > 0
  }

  async saveFailed(clarificationId: string, error: AiError): Promise<boolean> {
    const [updated] = await this.model.update(
      { status: CLARIFICATION_STATUS.FAILED, error },
      { where: { id: clarificationId } },
    )
    return updated > 0
  }

  private toRecord(row: ResearchClarificationModel): ClarificationRecord {
    return {
      id: row.id,
      createdBy: row.createdBy,
      status: row.status,
      brief: row.brief,
      suggestedQuestion: row.suggestedQuestion,
      questions: row.questions,
      error: row.error,
    }
  }
}
