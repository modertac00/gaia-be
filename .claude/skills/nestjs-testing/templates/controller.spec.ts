import { BadRequestException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { create__Feature__Schema } from '@moderta/api-contracts/gaia'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { __Feature__Controller } from '../__feature__.controller'
import { __Feature__Service } from '../__feature__.service'

describe('__Feature__Controller', () => {
  const service = { create: jest.fn(), get: jest.fn(), list: jest.fn(), update: jest.fn(), archive: jest.fn() }
  let controller: __Feature__Controller

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [__Feature__Controller],
      providers: [{ provide: __Feature__Service, useValue: service }],
    }).compile()
    controller = moduleRef.get(__Feature__Controller)
  })

  it('delegates create to the service with the current user', async () => {
    const user = { id: 'user-id', email: 'owner@example.com' }
    const body = { title: 'Title' } as never

    await controller.create(user, body)

    expect(service.create).toHaveBeenCalledWith(user, body)
  })

  it('rejects an invalid create payload via the contract schema', () => {
    const pipe = new ZodValidationPipe(create__Feature__Schema)

    expect(() => pipe.transform({ title: '' })).toThrow(BadRequestException)
  })
})
