import { Card } from '@/components/ui/card'

/**
 * Creative Tim template placeholder.
 * Campaign registration uses `@/components/placement/CampaignRegistrationBasicInfoForm`.
 */
export default function AccountBasicInfo01() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border border-soft bg-card p-8">
        <h2 className="text-2xl font-semibold tracking-tight">Personal Information</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Template reference only. Student campaign registration uses the wired placement form.
        </p>
      </Card>
    </div>
  )
}
