import { SetMetadata } from '@nestjs/common'

export const RESPONSE_MESSAGE_KEY = 'responseMessage'
// Overrides the default envelope message (derived from the status code) for one handler.
export const ResponseMessage = (message: string) => SetMetadata(RESPONSE_MESSAGE_KEY, message)
