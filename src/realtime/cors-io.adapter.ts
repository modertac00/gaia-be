import { IoAdapter } from '@nestjs/platform-socket.io'
import type { ServerOptions } from 'socket.io'

// Socket.io on the same http server as the REST app, with the same CORS origin as app.enableCors in main.ts.
export class CorsIoAdapter extends IoAdapter {
  constructor(
    app: ConstructorParameters<typeof IoAdapter>[0],
    private readonly origin: string,
  ) {
    super(app)
  }

  override createIOServer(port: number, options?: ServerOptions): unknown {
    return super.createIOServer(port, { ...options, cors: { origin: this.origin, credentials: false } })
  }
}
