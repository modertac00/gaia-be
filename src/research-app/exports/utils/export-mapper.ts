import type { Export, ExportContent } from '@moderta/api-contracts/gaia'
import type { ExportRecord } from '@/research-app/exports/interfaces/exports-repository.interface'

export function toExport(record: ExportRecord, content: ExportContent): Export {
  return { ...record, createdAt: record.createdAt.toISOString(), content }
}
