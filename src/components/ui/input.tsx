import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-input border border-soft bg-[#0B0E11] px-3 py-2 text-[14px] font-medium text-foreground transition-colors duration-150 outline-none placeholder:text-muted focus-visible:border-[#3B82F6] focus-visible:ring-2 focus-visible:ring-[#3B82F6]/35 disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
