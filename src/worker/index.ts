import { MyosDO } from './do'
export { MyosDO }

export interface Env {
  MYOS_DO: DurableObjectNamespace
  GEMINI_API_KEY: string
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  CF_ACCESS_JWT_ASSERTION?: string
}

async function verifyAccess(request: Request, env: Env): Promise<boolean> {
  if (!env.CF_ACCESS_JWT_ASSERTION) return true
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion')
  if (!jwt) return false
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1]))
    return payload.aud === env.CF_ACCESS_JWT_ASSERTION
  } catch {
    return false
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (!await verifyAccess(request, env)) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (url.pathname.startsWith('/api/')) {
      const doId = env.MYOS_DO.idFromName('primary')
      const stub = env.MYOS_DO.get(doId)

      const internalUrl = new URL(request.url)
      internalUrl.pathname = url.pathname.replace(/^\/api/, '')

      const internalReq = new Request(internalUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      })

      return stub.fetch(internalReq)
    }

    try {
      return await env.ASSETS.fetch(request)
    } catch {
      return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request))
    }
  },
}
