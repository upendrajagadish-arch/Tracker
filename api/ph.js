const POSTHOG_HOST = 'https://eu.i.posthog.com'

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

function getPath(req, url) {
  const queryPath = req.query?.path ?? url.searchParams.get('path') ?? ''
  return Array.isArray(queryPath) ? queryPath.join('/') : queryPath
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const incomingUrl = new URL(req.url || '/', 'https://codetrace.tashif.codes')
  const posthogPath = getPath(req, incomingUrl).replace(/^\/+/, '')
  incomingUrl.searchParams.delete('path')

  const upstreamUrl = `${POSTHOG_HOST}/${posthogPath}${incomingUrl.search}`
  const headers = new Headers()

  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (['host', 'content-length'].includes(key.toLowerCase())) continue
    headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }

  const upstream = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req),
    redirect: 'manual',
  })

  res.status(upstream.status)
  upstream.headers.forEach((value, key) => {
    if (['connection', 'content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) return
    res.setHeader(key, value)
  })

  const body = Buffer.from(await upstream.arrayBuffer())
  res.end(body)
}

export const config = {
  api: {
    bodyParser: false,
  },
}
