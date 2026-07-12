import posthog from 'posthog-js'

// Local dev uses the Vite /ph proxy; production talks to PostHog directly
// because Vercel rewrites can return 405 on POST analytics requests.
const posthogApiHost = import.meta.env.DEV
  ? '/ph'
  : 'https://eu.i.posthog.com'

posthog.init('phc_xxpoU7jHjt4nKAb4ygdiNwheukaBi7QvoAT4AsrdBcZC', {
  api_host: posthogApiHost,
  ui_host: 'https://eu.posthog.com',
  defaults: '2026-05-30',
})

export { posthog }
