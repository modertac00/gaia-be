import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { compare } from 'bcryptjs'
import { UsersRepository } from '../users/users.repository'
import type { PublicUser, UserRow } from '../users/user.types'

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersRepository.findByEmail(email)

    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const isValidPassword = await compare(password, user.password_hash)

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials')
    }

    return {
      accessToken: await this.jwtService.signAsync({
        sub: user.id,
        email: user.email,
      }),
      user: this.toPublicUser(user),
    }
  }

  async getCurrentUser(userId: string): Promise<PublicUser> {
    const user = await this.usersRepository.findById(userId)

    if (!user) {
      throw new UnauthorizedException('Invalid token')
    }

    return this.toPublicUser(user)
  }

  private toPublicUser(user: UserRow): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    }
  }
}
