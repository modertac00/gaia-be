import { NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { __FEATURE___NOT_FOUND_MESSAGE } from '@moderta/api-contracts/gaia'
import type { AuthenticatedUser } from '../../../common/auth/authenticated-user'
import { __Feature__Service } from '../__feature__.service'
import {
  __FEATURE___REPOSITORY,
  type __Feature__Record,
  type __Feature__Repository,
} from '../repositories/__feature__.repository'

const user: AuthenticatedUser = { id: '00000000-0000-4000-8000-000000000001', email: 'owner@example.com' }

function createMockRepository(): jest.Mocked<__Feature__Repository> {
  return {
    findOwnedById: jest.fn(),
    listOwned: jest.fn(),
    create: jest.fn(),
    updateOwned: jest.fn(),
    archiveOwned: jest.fn(),
  }
}

function build__Feature__Record(overrides: Partial<__Feature__Record> = {}): __Feature__Record {
  const now = new Date('2026-01-01T00:00:00.000Z')
  return {
    id: '00000000-0000-4000-8000-0000000000aa',
    ownerId: user.id,
    title: 'Title',
    status: 'requested',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('__Feature__Service', () => {
  let service: __Feature__Service
  let repository: jest.Mocked<__Feature__Repository>

  beforeEach(async () => {
    repository = createMockRepository()
    const moduleRef = await Test.createTestingModule({
      providers: [__Feature__Service, { provide: __FEATURE___REPOSITORY, useValue: repository }],
    }).compile()
    service = moduleRef.get(__Feature__Service)
  })

  it('returns the owned __feature__ mapped to the contract', async () => {
    repository.findOwnedById.mockResolvedValue(build__Feature__Record())

    const result = await service.get(user, '00000000-0000-4000-8000-0000000000aa')

    expect(repository.findOwnedById).toHaveBeenCalledWith('00000000-0000-4000-8000-0000000000aa', user.id)
    expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('throws not found when the __feature__ is missing or owned by someone else', async () => {
    repository.findOwnedById.mockResolvedValue(null)

    await expect(service.get(user, 'missing')).rejects.toThrow(new NotFoundException(__FEATURE___NOT_FOUND_MESSAGE))
  })
})
