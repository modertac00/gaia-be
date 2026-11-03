
export class ResultNotReadyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ResultNotReadyError'
  }
}
