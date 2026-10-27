import { randomBytes } from 'node:crypto'
import type { Request, Response } from 'express'

export const REQUEST_ID_HEADER = 'x-request-id'

export interface RequestWithId extends Request {
  requestId?: string
}

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/

const generateRequestId = () => `req_${randomBytes(6).toString('hex')}`

export function ensureRequestId(request: RequestWithId, response: Response): string {
  if (request.requestId) return request.requestId

  const inbound = request.header(REQUEST_ID_HEADER)
  const requestId = inbound && SAFE_REQUEST_ID.test(inbound) ? inbound : generateRequestId()

  request.requestId = requestId
  if (!response.headersSent) response.setHeader(REQUEST_ID_HEADER, requestId)
  return requestId
}
