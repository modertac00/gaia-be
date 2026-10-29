import type { CitationStyle, Export, ExportFormat, ExportScope, ExportStatus } from '@moderta/api-contracts/gaia'

export const EXPORTS_REPOSITORY = Symbol('EXPORTS_REPOSITORY')

export type ExportRecord = Omit<Export, 'content' | 'createdAt'> & { createdAt: Date }

export interface NewExport {
  researchId: string
  format: ExportFormat
  style: CitationStyle
  scope: ExportScope
  status: ExportStatus
  requestedBy: string
}
