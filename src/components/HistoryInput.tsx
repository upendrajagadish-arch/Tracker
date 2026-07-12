import { useState } from 'react'
import { History, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useInputHistory } from '../hooks/useInputHistory'

interface HistoryInputProps {
  platform: string
  value: string
  onChange: (val: string) => void
  placeholder?: string
  /** Platform accent color for the focus ring (CSS color). */
  accent?: string
}

export function HistoryInput({ platform, value, onChange, placeholder, accent }: HistoryInputProps) {
  const { history, removeHistory } = useInputHistory(platform)
  const [open, setOpen] = useState(false)

  return (
    <div className="relative flex w-full items-center">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="platform-input font-mono bg-muted/30 border-transparent transition-colors focus-visible:bg-transparent pr-10"
        style={accent ? { ['--row-accent' as string]: accent } : undefined}
      />
      {history.length > 0 && (
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 size-8 text-muted-foreground hover:text-primary"
            >
              <History className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl border-white/10 bg-background/90 p-2 font-mono text-xs shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95">
            <div className="px-3 pb-1.5 pt-1 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50">
              Recent {platform}
            </div>
            {history.map((item) => (
              <DropdownMenuItem
                key={item}
                className="group flex cursor-pointer items-center justify-between rounded-lg py-1.5 px-3 transition-colors hover:bg-muted/50"
                onSelect={() => {
                  onChange(item)
                  setOpen(false)
                }}
              >
                <span className="truncate text-muted-foreground transition-colors group-hover:text-foreground">{item}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeHistory(item)
                  }}
                >
                  <X className="size-3" />
                </Button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
