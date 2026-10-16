import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  __FEATURE___NOT_FOUND_MESSAGE,
  type __Feature__,
  type Create__Feature__Dto,
  type CursorPage,
  type List__Feature__Query,
  type Update__Feature__Dto,
} from '@moderta/api-contracts/gaia'
import type { AuthenticatedUser } from '../../common/auth/authenticated-user'
import { to__Feature__Response } from './__feature__.mapper'
import {
  __FEATURE___REPOSITORY,
  type __Feature__Record,
  type __Feature__Repository,
} from './repositories/__feature__.repository'

@Injectable()
export class __Feature__Service {
  constructor(
    @Inject(__FEATURE___REPOSITORY)
    private readonly __featureCamel__Repository: __Feature__Repository,
  ) {}

  async list(user: AuthenticatedUser, query: List__Feature__Query): Promise<CursorPage<__Feature__>> {
    const page = await this.__featureCamel__Repository.listOwned(user.id, query)
    return { items: page.records.map(to__Feature__Response), nextCursor: page.nextCursor }
  }

  async get(user: AuthenticatedUser, id: string): Promise<__Feature__> {
    return to__Feature__Response(await this.findOwnedOrThrow(user, id))
  }

  async create(user: AuthenticatedUser, input: Create__Feature__Dto): Promise<__Feature__> {
    // Business rules go here (defaults, invariants, cross-module checks via exported services).
    return to__Feature__Response(await this.__featureCamel__Repository.create(user.id, input))
  }

  async update(user: AuthenticatedUser, id: string, input: Update__Feature__Dto): Promise<__Feature__> {
    const updated = await this.__featureCamel__Repository.updateOwned(id, user.id, input)
    if (!updated) throw new NotFoundException(__FEATURE___NOT_FOUND_MESSAGE)
    return to__Feature__Response(updated)
  }

  async archive(user: AuthenticatedUser, id: string): Promise<void> {
    const archived = await this.__featureCamel__Repository.archiveOwned(id, user.id)
    if (!archived) throw new NotFoundException(__FEATURE___NOT_FOUND_MESSAGE)
  }

  private async findOwnedOrThrow(user: AuthenticatedUser, id: string): Promise<__Feature__Record> {
    const record = await this.__featureCamel__Repository.findOwnedById(id, user.id)
    if (!record) throw new NotFoundException(__FEATURE___NOT_FOUND_MESSAGE)
    return record
  }
}
