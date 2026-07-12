import posthog from 'posthog-js'

posthog.init('phc_xxpoU7jHjt4nKAb4ygdiNwheukaBi7QvoAT4AsrdBcZC', {
  api_host: '/ph',
  ui_host: 'https://eu.posthog.com',
  defaults: '2026-05-30',
})

export { posthog }
