import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  open: boolean
  onClose: () => void
  /** Primary line under the tick. Defaults to “Upload successful”. */
  title?: string
  /** Optional secondary detail. */
  message?: string | null
}

/**
 * Shared success dialog for student-facing registration / upload links
 * (campaign registration, profile update, company drive, etc.).
 */
export function RegistrationSuccessPopup({
  open,
  onClose,
  title = 'Upload successful',
  message = null,
}: Props) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          role="presentation"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="registration-success-title"
            className="flex w-full max-w-[280px] flex-col items-center rounded-2xl border border-[#0ECB81]/25 bg-[#12151A] px-5 pb-4 pt-7 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.85)]"
            initial={{ opacity: 0, scale: 0.55 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22, mass: 0.75 }}
            onClick={(event) => event.stopPropagation()}
          >
            <motion.div
              className="flex size-16 items-center justify-center rounded-full bg-[#0ECB81]/15 ring-2 ring-[#0ECB81]/40"
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.08 }}
            >
              <motion.span
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.18 }}
              >
                <Check className="size-8 stroke-[3] text-[#0ECB81]" aria-hidden />
              </motion.span>
            </motion.div>

            <h2
              id="registration-success-title"
              className="mt-4 text-center text-[15px] font-bold tracking-tight text-[#0ECB81]"
            >
              {title}
            </h2>
            {message ? (
              <p className="mt-1.5 text-center text-[12px] leading-snug text-muted-foreground">
                {message}
              </p>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-5 h-8 min-w-[88px] rounded-lg border-soft text-[12px] font-semibold"
              onClick={onClose}
            >
              Close
            </Button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
