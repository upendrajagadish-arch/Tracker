import { motion } from 'framer-motion'
import { ArrowRight, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BRAND_NAME } from '@/lib/brand'

const STEPS = [
  {
    number: 1,
    title: 'Complete your profile',
    description: 'Add your details to personalize your placement experience',
  },
  {
    number: 2,
    title: 'Register for Better Opportunities',
    description: 'Apply to company drives and open doors to top recruiters',
  },
  {
    number: 3,
    title: 'Achieve Your Dream Career',
    description: 'Track readiness and land the role you have been working toward',
  },
] as const

type Props = {
  onRegister: () => void
  campaignTitle?: string
}

/**
 * First screen for shared student registration links.
 * Inspired by Creative Tim OnboardingWelcomeBlock.
 */
export function RegistrationWelcomeScreen({ onRegister, campaignTitle }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
      <motion.div
        className="w-full rounded-2xl border border-soft bg-card p-6 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.8)] sm:p-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.05 }}
        >
          <Heart className="size-5 fill-primary text-primary" aria-hidden />
        </motion.div>

        <p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          {BRAND_NAME}
          {campaignTitle ? ` · ${campaignTitle}` : ''}
        </p>

        <h1 className="mt-3 text-center font-heading text-[26px] font-bold tracking-tight text-foreground sm:text-[30px]">
          Welcome to our community!
        </h1>
        <p className="mt-2 text-center text-[15px] font-medium text-secondary sm:text-[16px]">
          Your Career Journey Starts Here
        </p>

        <ol className="mt-8 space-y-5">
          {STEPS.map((step, index) => (
            <motion.li
              key={step.number}
              className="flex gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.12 + index * 0.08 }}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[13px] font-bold text-primary">
                {step.number}
              </span>
              <div className="min-w-0 pt-0.5">
                <h2 className="text-[14px] font-semibold text-foreground">{step.title}</h2>
                <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </motion.li>
          ))}
        </ol>

        <motion.div
          className="mt-8 flex justify-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Button type="button" size="sm" className="gap-1.5 px-4" onClick={onRegister}>
            Register
            <ArrowRight className="size-3.5" aria-hidden />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default RegistrationWelcomeScreen
