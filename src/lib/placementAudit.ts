import { requireSupabase } from '@/lib/supabase'
import type { Json } from '@/types/supabase'

export async function logPlacementAudit(input: {
  action: string
  entityType?: string
  entityId?: string
  description?: string
  metadata?: Record<string, unknown>
  actorUserId?: string | null
  actorRole?: string
}) {
  try {
    const client = requireSupabase()
    await client.from('audit_logs').insert({
      actor_user_id: input.actorUserId ?? null,
      actor_role: input.actorRole ?? '',
      action: input.action,
      entity_type: input.entityType ?? '',
      entity_id: input.entityId ?? '',
      description: input.description ?? '',
      metadata: (input.metadata ?? {}) as Json,
    })
  } catch {
    /* audit must not break UX */
  }
}
