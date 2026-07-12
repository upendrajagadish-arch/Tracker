import { ExternalLink, Star, GitFork } from 'lucide-react'
import type { PinnedRepo } from '../types/api'

interface Props {
  repos: PinnedRepo[]
}

export function PinnedRepos({ repos }: Props) {
  if (!repos.length) return null

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {repos.slice(0, 4).map(repo => (
        <a
          key={repo.name}
          href={repo.url}
          target="_blank"
          rel="noreferrer"
          className="link-quiet tile group flex flex-col gap-1.5 p-3 hover:border-primary/30"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="truncate font-mono text-xs text-foreground transition-colors group-hover:text-primary">
              {repo.name}
            </span>
            <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
          </div>
          {repo.description && (
            <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
              {repo.description}
            </p>
          )}
          <div className="mt-auto flex items-center gap-3 pt-1">
            {repo.primary_language && (
              <span className="text-[10px] text-muted-foreground/60">{repo.primary_language}</span>
            )}
            <span className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground/60">
              <Star className="size-2.5" /> <span className="tnum">{repo.stars}</span>
            </span>
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60">
              <GitFork className="size-2.5" /> <span className="tnum">{repo.forks}</span>
            </span>
          </div>
        </a>
      ))}
    </div>
  )
}
