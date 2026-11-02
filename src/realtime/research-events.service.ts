import { Injectable } from '@nestjs/common'
import { REALTIME_EVENT, type AiStatusEvent, type DataChangedEvent } from '@moderta/api-contracts/gaia'
import { researchRoom } from '@/realtime/research-room'
import { ResearchGateway } from '@/realtime/research.gateway'

@Injectable()
export class ResearchEvents {
  constructor(private readonly gateway: ResearchGateway) { }

  aiStatus(event: AiStatusEvent): void {
    this.gateway.server.to(researchRoom(event.researchId)).emit(REALTIME_EVENT.AI_STATUS, event)
  }

  dataChanged(event: DataChangedEvent): void {
    this.gateway.server.to(researchRoom(event.researchId)).emit(REALTIME_EVENT.DATA_CHANGED, event)
  }
}
