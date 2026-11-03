import { EXPORT_FORMAT, EXPORT_SCOPE, type CreateExportDto } from '@moderta/api-contracts/gaia'

export interface ExportParts {
  note: boolean
  sources: boolean
  evidence: boolean
}

/** Which parts of the research an export contains. The package format always contains everything. */
export function partsOf(dto: CreateExportDto): ExportParts {
  if (dto.format === EXPORT_FORMAT.PACKAGE) {
    return { note: true, sources: true, evidence: true }
  }
  if (dto.scope === EXPORT_SCOPE.NOTE_ONLY) {
    return { note: true, sources: false, evidence: false }
  }
  if (dto.scope === EXPORT_SCOPE.EVIDENCE_MATRIX_ONLY) {
    return { note: false, sources: false, evidence: true }
  }
  return { note: true, sources: true, evidence: false }
}
