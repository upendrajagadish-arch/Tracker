/** CodeNow API client config — safe when unset. */

export const CODENOW_NOT_CONFIGURED = 'CODENOW_NOT_CONFIGURED'

function readEnv(key: string): string {
  const value = import.meta.env[key]
  return typeof value === 'string' ? value.trim() : ''
}

export function isCodeNowEnabled(): boolean {
  const flag = readEnv('VITE_CODENOW_API_ENABLED').toLowerCase()
  if (flag !== 'true' && flag !== '1' && flag !== 'yes') return false
  return Boolean(getCodeNowBaseUrl() && readEnv('VITE_CODENOW_API_KEY'))
}

export function getCodeNowBaseUrl(): string {
  return readEnv('VITE_CODENOW_API_BASE_URL').replace(/\/+$/, '')
}

export function getCodeNowTimeout(): number {
  const raw = Number(readEnv('VITE_CODENOW_REQUEST_TIMEOUT_MS') || '10000')
  if (Number.isNaN(raw) || raw < 1000) return 10_000
  return Math.min(raw, 60_000)
}

export function getCodeNowApiKey(): string {
  return readEnv('VITE_CODENOW_API_KEY')
}

export function getCodeNowHeaders(): HeadersInit {
  const key = getCodeNowApiKey()
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(key ? { Authorization: `Bearer ${key}`, 'X-API-Key': key } : {}),
  }
}

export function assertCodeNowConfigured(): void {
  if (!isCodeNowEnabled()) {
    throw new Error(CODENOW_NOT_CONFIGURED)
  }
}
