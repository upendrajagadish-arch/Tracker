import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-console border border-transparent text-[15px] font-semibold whitespace-nowrap transition-all duration-200 outline-none select-none active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-[#E60012] focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "h-11 border-[#9a000c] bg-primary text-primary-foreground shadow-[0_2px_0_#9a000c] hover:-translate-y-0.5 hover:shadow-[0_4px_0_#9a000c]",
        outline:
          "h-11 border-console bg-console text-foreground shadow-[0_2px_0_#4D5C9A] hover:-translate-y-0.5 hover:shadow-[0_4px_0_#4D5C9A]",
        secondary:
          "h-11 border-[#15171e] bg-secondary text-secondary-foreground shadow-[0_2px_0_#15171e] hover:-translate-y-0.5 hover:shadow-[0_4px_0_#15171e]",
        ghost:
          "h-11 text-foreground hover:bg-panel-dark/50",
        destructive:
          "h-11 border-[#9a000c] bg-primary/90 text-white shadow-[0_2px_0_#9a000c]",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
        success:
          "h-11 border-[#1f9b55] bg-success text-white shadow-[0_2px_0_#1f9b55] hover:-translate-y-0.5",
      },
      size: {
        default: "h-11 gap-2 px-5",
        xs: "h-8 gap-1 px-3 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-4 text-[13px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-7 text-[15px]",
        icon: "size-11",
        "icon-xs": "size-8 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
