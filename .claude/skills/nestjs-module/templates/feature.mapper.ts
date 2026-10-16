import type { __Feature__ } from '@moderta/api-contracts/gaia'
import type { __Feature__Record } from './repositories/__feature__.repository'

// Pure: record → response contract. Never expose columns absent from the contract.
export function to__Feature__Response(record: __Feature__Record): __Feature__ {
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}
