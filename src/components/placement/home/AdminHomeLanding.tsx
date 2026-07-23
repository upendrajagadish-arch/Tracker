import { RoleHomeLanding } from '@/components/placement/home/RoleHomeLanding'

export function AdminHomeLanding({ displayName }: { displayName: string }) {
  return <RoleHomeLanding role="admin" displayName={displayName} />
}
