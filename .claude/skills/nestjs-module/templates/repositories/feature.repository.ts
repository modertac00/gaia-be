import type {
  __Feature__Status,
  Create__Feature__Dto,
  List__Feature__Query,
  Update__Feature__Dto,
} from '@moderta/api-contracts/gaia'
import type { RecordPage } from '../../../common/database/cursor-pagination'
import type { RepositoryOptions } from '../../../common/database/repository-options'

export const __FEATURE___REPOSITORY = Symbol('__FEATURE___REPOSITORY')

// Plain persistence shape returned by the port (no Sequelize instances).
export interface __Feature__Record {
  id: string
  ownerId: string
  title: string
  status: __Feature__Status
  createdAt: Date
  updatedAt: Date
}

export interface __Feature__Repository {
  findOwnedById(id: string, ownerId: string, options?: RepositoryOptions): Promise<__Feature__Record | null>
  listOwned(ownerId: string, query: List__Feature__Query): Promise<RecordPage<__Feature__Record>>
  create(ownerId: string, input: Create__Feature__Dto, options?: RepositoryOptions): Promise<__Feature__Record>
  updateOwned(
    id: string,
    ownerId: string,
    input: Update__Feature__Dto,
    options?: RepositoryOptions,
  ): Promise<__Feature__Record | null>
  /** @returns false when no owned row matched */
  archiveOwned(id: string, ownerId: string, options?: RepositoryOptions): Promise<boolean>
}
