import axios from 'axios'

function interpolateVars(str, env) {
  if (!str || typeof str !== 'string' || !env?.length) return str
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const v = env.find(e => e.enabled && e.key === key)
    return v !== undefined ? v.value : match
  })
}

export async function sendRequest({ method, url, headers = [], params = [], body, auth }, env = []) {
  const iv = (s) => interpolateVars(s, env)

  const headersObj = {}
  headers.forEach(({ key, value, enabled }) => {
    if (enabled && key) headersObj[key] = iv(value)
  })

  const paramsObj = {}
  params.forEach(({ key, value, enabled }) => {
    if (enabled && key) paramsObj[key] = iv(value)
  })

  if (auth?.type === 'bearer' && auth.token) {
    headersObj['Authorization'] = `Bearer ${iv(auth.token)}`
  } else if (auth?.type === 'basic' && auth.username) {
    const encoded = btoa(`${iv(auth.username)}:${iv(auth.password || '')}`)
    headersObj['Authorization'] = `Basic ${encoded}`
  }

  const interpolatedUrl = iv(url)

  let parsedBody = undefined
  if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    const interpolatedBody = iv(body)
    try {
      parsedBody = JSON.parse(interpolatedBody)
      if (!headersObj['Content-Type']) {
        headersObj['Content-Type'] = 'application/json'
      }
    } catch {
      parsedBody = interpolatedBody
    }
  }

  const start = performance.now()

  try {
    const response = await axios({
      method: method.toLowerCase(),
      url: interpolatedUrl,
      headers: headersObj,
      params: paramsObj,
      data: parsedBody,
      timeout: 30000,
      validateStatus: () => true,
    })

    const elapsed = Math.round(performance.now() - start)
    const responseText = typeof response.data === 'object'
      ? JSON.stringify(response.data, null, 2)
      : String(response.data)

    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
      responseText,
      time: elapsed,
      size: new Blob([responseText]).size,
      error: null,
    }
  } catch (err) {
    const elapsed = Math.round(performance.now() - start)
    return {
      status: err.response?.status || 0,
      statusText: err.message,
      headers: err.response?.headers || {},
      data: null,
      responseText: err.message,
      time: elapsed,
      size: 0,
      error: err.message,
    }
  }
}
