import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuthService } from '../auth/auth.service'
import { CreateResearchRequestDto } from './dto/create-research-request.dto'
import { InitService } from './init.service'

@Controller('research-documents')
export class ResearchDocumentsController {
  constructor(
    private readonly authService: AuthService,
    private readonly initService: InitService,
    private readonly jwtService: JwtService,
  ) {}

  @Get(':id')
  async getResearchDocumentDetail(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
  ) {
    await this.assertAuthenticated(authorization)

    return this.initService.getResearchDocumentDetail(id)
  }

  @Post()
  async createResearchRequest(
    @Headers('authorization') authorization: string | undefined,
    @Body() request: CreateResearchRequestDto,
  ) {
    await this.assertAuthenticated(authorization)

    return this.initService.createResearchRequest(request)
  }

  private async assertAuthenticated(authorization?: string) {
    const token = this.extractBearerToken(authorization)

    if (!token) {
      throw new UnauthorizedException('Missing bearer token')
    }

    const payload = await this.jwtService.verifyAsync<{ sub: string }>(token)
    await this.authService.getCurrentUser(payload.sub)
  }

  private extractBearerToken(authorization?: string): string | null {
    const [scheme, token] = authorization?.split(' ') ?? []
    return scheme?.toLowerCase() === 'bearer' && token ? token : null
  }
}
