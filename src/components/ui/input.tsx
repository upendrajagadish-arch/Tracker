import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-input border border-console bg-console px-4 py-2.5 text-base text-foreground shadow-[inset_0_1px_2px_rgba(33,36,46,0.08)] transition-all duration-200 outline-none placeholder:text-secondary focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_rgba(230,0,18,0.2)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
