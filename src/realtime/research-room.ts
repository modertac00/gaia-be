// The one place that knows how a research maps to a socket.io room.
export function researchRoom(researchId: string): string {
  return `research:${researchId}`
}
