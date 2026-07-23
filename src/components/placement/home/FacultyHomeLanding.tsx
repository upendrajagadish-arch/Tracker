import { RoleHomeLanding } from '@/components/placement/home/RoleHomeLanding'

export function FacultyHomeLanding({ displayName }: { displayName: string }) {
  return <RoleHomeLanding role="faculty" displayName={displayName} />
}
