export abstract class AppLogger {
  abstract log(message: string, context?: string): void
  abstract error(message: string, trace?: string, context?: string): void
  abstract warn(message: string, context?: string): void
  abstract debug(message: string, context?: string): void
  abstract verbose(message: string, context?: string): void
}
