import { requireSupabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

export type AuditLogRow = Database['public']['Tables']['audit_logs']['Row']

export interface AuditLogFilters {
  action?: string
  entityType?: string
  page?: number
  limit?: number
}

export interface PaginatedAuditLogs {
  data: AuditLogRow[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

function normalizePagination(page = 1, limit = 30) {
  const safePage = Math.max(1, page)
  const safeLimit = Math.min(Math.max(1, limit), 100)
  return { page: safePage, limit: safeLimit, from: (safePage - 1) * safeLimit, to: safePage * safeLimit - 1 }
}

export async function listAuditLogs(filters: AuditLogFilters = {}): Promise<PaginatedAuditLogs> {
  const client = requireSupabase()
  const { page, limit, from, to } = normalizePagination(filters.page, filters.limit)

  let query = client
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.action) query = query.ilike('action', `%${filters.action}%`)
  if (filters.entityType) query = query.eq('entity_type', filters.entityType)

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  const total = count ?? 0

  return {
    data: data ?? [],
    pagination: {
      page,
      limit,
      total,
      pages: total ? Math.ceil(total / limit) : 0,
    },
  }
}
