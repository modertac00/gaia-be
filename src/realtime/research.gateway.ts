import { Inject } from '@nestjs/common'
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'
import { REALTIME_EVENT, REALTIME_UNAUTHORIZED_MESSAGE, researchSubscriptionSchema } from '@moderta/api-contracts/gaia'
import { ACCESS_TOKEN_VERIFIER, type AccessTokenVerifier } from '@/common/auth/interface/access-token-verifier'
import { USER_ACCESS_RESOLVER, type UserAccessResolver } from '@/common/auth/interface/user-access-resolver'
import { extractBearerToken } from '@/common/auth/utils/bearer-token'
import { researchRoom } from '@/realtime/research-room'
import { ResearchAccess } from '@/research-app/research/services/research-access.service'

interface SocketData {
  userId?: string
}

@WebSocketGateway()
export class ResearchGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server

  constructor(
    @Inject(ACCESS_TOKEN_VERIFIER) private readonly verifier: AccessTokenVerifier,
    @Inject(USER_ACCESS_RESOLVER) private readonly accessResolver: UserAccessResolver,
    @Inject(ResearchAccess) private readonly researchAccess: ResearchAccess,
  ) { }

  async handleConnection(client: Socket): Promise<void> {
    const userId = await this.findUserId(client)
    if (!userId) {
      client.disconnect(true)
      return
    }

    const data: SocketData = client.data
    data.userId = userId
  }

  @SubscribeMessage(REALTIME_EVENT.SUBSCRIBE)
  async subscribe(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): Promise<{ ok: boolean; message?: string }> {
    const parsed = researchSubscriptionSchema.safeParse(body)
    const data: SocketData = client.data
    if (!parsed.success || !data.userId) return { ok: false, message: REALTIME_UNAUTHORIZED_MESSAGE }

    try {
      await this.researchAccess.assertVisible(data.userId, parsed.data.researchId)
    } catch {
      return { ok: false, message: REALTIME_UNAUTHORIZED_MESSAGE }
    }

    await client.join(researchRoom(parsed.data.researchId))
    return { ok: true }
  }

  @SubscribeMessage(REALTIME_EVENT.UNSUBSCRIBE)
  async unsubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): Promise<{ ok: boolean }> {
    const parsed = researchSubscriptionSchema.safeParse(body)
    if (!parsed.success) return { ok: false }

    await client.leave(researchRoom(parsed.data.researchId))
    return { ok: true }
  }

  private async findUserId(client: Socket): Promise<string | null> {
    const token = this.readToken(client)
    if (!token) return null

    try {
      const identity = await this.verifier.verify(token)
      if (!identity) return null

      const access = await this.accessResolver.resolve(identity)
      if (!access) return null

      return identity.id
    } catch {
      return null
    }
  }

  private readToken(client: Socket): string | null {
    const auth: unknown = client.handshake.auth
    if (typeof auth === 'object' && auth !== null && 'token' in auth && typeof auth.token === 'string') return auth.token

    return extractBearerToken(client.handshake.headers.authorization)
  }
}
