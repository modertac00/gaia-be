export function extractBearerToken(header: string | undefined): string | null {
  const [scheme, token, ...rest] = header?.split(' ') ?? []
  return scheme?.toLowerCase() === 'bearer' && token && rest.length === 0 ? token : null
}
