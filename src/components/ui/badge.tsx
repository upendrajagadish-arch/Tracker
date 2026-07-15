import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-console px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.4px] whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "border-[#9a000c] bg-primary text-primary-foreground",
        secondary: "bg-panel-dark text-foreground",
        destructive: "bg-primary/15 text-primary",
        outline: "bg-console text-foreground",
        ghost: "border-transparent text-secondary hover:bg-panel-dark/50",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
        success: "border-[#1f9b55]/40 bg-success/15 text-[#1a7a45]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants }
