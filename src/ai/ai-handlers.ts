import { Injectable } from '@nestjs/common'
import type { AiError, AiResultByKind, AiRunKind } from '@moderta/api-contracts/gaia'


export interface AiResponseHandler<K extends AiRunKind = AiRunKind> {
  readonly kind: K
  onSucceeded(taskId: string, result: AiResultByKind[K]): Promise<void>
  onFailed(taskId: string, error: AiError, researchId?: string): Promise<void>
}

@Injectable()
export class AiHandlers {
  private readonly handlers = new Map<AiRunKind, AiResponseHandler>()

  register(handler: AiResponseHandler): void {
    if (this.handlers.has(handler.kind)) throw new Error(`An AI response handler is already registered for "${handler.kind}"`)
    this.handlers.set(handler.kind, handler)
  }

  get(kind: AiRunKind): AiResponseHandler | undefined {
    return this.handlers.get(kind)
  }
}
