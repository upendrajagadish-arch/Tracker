import { requireSupabase } from '@/lib/supabase'
import type { Json } from '@/types/supabase'

export async function logPlacementAudit(input: {
  action: string
  entityType?: string
  entityId?: string
  description?: string
  metadata?: Record<string, unknown>
}) {
  try {
    const client = requireSupabase()
    await client.rpc('log_placement_audit', {
      p_action: input.action,
      p_entity_type: input.entityType ?? '',
      p_entity_id: input.entityId ?? '',
      p_description: input.description ?? '',
      p_metadata: (input.metadata ?? {}) as Json,
    })
  } catch {
    /* audit must not break UX */
  }
}
