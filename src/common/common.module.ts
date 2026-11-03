import { Global, type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import {
  JwtAuthGuard,
  MetadataUserAccessResolver,
  RoleAbilityRegistry,
  RolesGuard,
  USER_ACCESS_RESOLVER,
} from './auth'
import { AllExceptionsFilter } from './filters/all-exceptions.filter'
import { RequestIdMiddleware } from './http/request-id.middleware'
import { ResponseInterceptor } from './interceptors/response.interceptor'

@Global()
@Module({
  providers: [
    RoleAbilityRegistry,
    { provide: USER_ACCESS_RESOLVER, useClass: MetadataUserAccessResolver },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
  exports: [RoleAbilityRegistry, USER_ACCESS_RESOLVER],
})
export class CommonModule implements NestModule {
  // Middleware runs before guards, so errors thrown by guards also carry the request id.
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*path')
  }
}
