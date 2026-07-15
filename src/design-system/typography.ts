/** Inter body + Archivo Black for game-title headings. */
export const typography = {
  display: {
    family: "'Archivo Black', Inter, system-ui, sans-serif",
    weight: 400,
    letterSpacing: '-0.01em',
  },
  body: {
    family: 'Inter, system-ui, sans-serif',
    size: '16px',
    weight: 400,
    lineHeight: 1.55,
  },
  nav: {
    family: 'Inter, system-ui, sans-serif',
    weight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  button: {
    size: '15px',
    weight: 600,
  },
} as const
