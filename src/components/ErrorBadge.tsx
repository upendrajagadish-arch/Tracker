import { AlertTriangle } from 'lucide-react'

interface Props {
  message: string;
}

export function ErrorBadge({ message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center min-h-[160px]">
      <AlertTriangle className="size-6 text-destructive opacity-60" />
      <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
        {message}
      </p>
    </div>
  );
}
