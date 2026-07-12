import { useEffect, useState } from 'react';
import type { TopLanguage } from '../types/api';

const LANG_COLORS: Record<string, string> = {
  Python: '#3776ab',
  TypeScript: '#3178c6',
  JavaScript: '#f7df1e',
  Go: '#00add8',
  Rust: '#ce422b',
  'C++': '#f34b7d',
  C: '#555555',
  Java: '#b07219',
  'Jupyter Notebook': '#da5b0b',
  CSS: '#563d7c',
  HTML: '#e34c26',
  Astro: '#ff5a03',
  Dockerfile: '#384d54',
  Makefile: '#427819',
};

function langColor(name: string) {
  return LANG_COLORS[name] ?? '#64ffda';
}

interface Props {
  languages: TopLanguage[];
}

export function LanguageBar({ languages }: Props) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 16);
    return () => clearTimeout(t);
  }, []);

  const top = languages.slice(0, 6);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {top.map(lang => (
          <div
            key={lang.name}
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: animated ? `${lang.percentage}%` : '0%',
              background: langColor(lang.name),
              transitionDelay: '0ms',
            }}
            title={`${lang.name}: ${lang.percentage}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {top.map(lang => (
          <div key={lang.name} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: langColor(lang.name) }}
            />
            <span className="text-xs text-foreground">
              {lang.name} <span className="text-muted-foreground">{lang.percentage}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
