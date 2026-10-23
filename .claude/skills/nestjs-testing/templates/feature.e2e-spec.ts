// test/__feature__.e2e-spec.ts
import type { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { __featureCamel__Schema } from '@moderta/api-contracts/gaia'
import { AppModule } from '../src/app.module'

describe('__route__ (e2e)', () => {
  let app: INestApplication
  let ownerToken: string
  let otherToken: string

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    const jwt = app.get(JwtService)
    // Seed two users via test/factories before signing (ids must exist if FKs apply).
    ownerToken = await jwt.signAsync({ sub: '<owner-id>', email: 'owner@example.com' })
    otherToken = await jwt.signAsync({ sub: '<other-id>', email: 'other@example.com' })
  })

  afterAll(async () => {
    await app.close()
  })

  const server = () => app.getHttpServer()

  it('creates a __feature__ (201, matches contract)', async () => {
    const res = await request(server()).post('/__route__').auth(ownerToken, { type: 'bearer' }).send({ title: 'T' })
    expect(res.status).toBe(201)
    expect(() => __featureCamel__Schema.parse(res.body)).not.toThrow()
  })

  it('rejects invalid payloads (400 with errors keyed by field)', async () => {
    const res = await request(server()).post('/__route__').auth(ownerToken, { type: 'bearer' }).send({})
    expect(res.status).toBe(400)
    expect(res.body.errors).toEqual({ title: expect.any(Array) })
  })

  it('requires authentication (401)', async () => {
    await request(server()).get('/__route__').expect(401)
  })

  it("hides other users' __route__ (404)", async () => {
    const created = await request(server()).post('/__route__').auth(ownerToken, { type: 'bearer' }).send({ title: 'T' })
    await request(server()).get(`/__route__/${created.body.id}`).auth(otherToken, { type: 'bearer' }).expect(404)
  })

  it('returns 404 for a missing id', async () => {
    await request(server())
      .get('/__route__/00000000-0000-4000-8000-000000000000')
      .auth(ownerToken, { type: 'bearer' })
      .expect(404)
  })
})
