const SECURITY_HEADERS = [
  {
    name: 'X-Frame-Options',
    description: 'Protects against clickjacking attacks',
    severity: 'medium',
  },
  {
    name: 'Content-Security-Policy',
    description: 'Prevents XSS and data injection attacks',
    severity: 'high',
  },
  {
    name: 'X-XSS-Protection',
    description: 'Enables browser XSS filtering',
    severity: 'medium',
  },
  {
    name: 'Strict-Transport-Security',
    description: 'Enforces HTTPS connections',
    severity: 'high',
  },
  {
    name: 'X-Content-Type-Options',
    description: 'Prevents MIME type sniffing',
    severity: 'low',
  },
]

export function scanResponseHeaders(headers = {}) {
  const normalizedHeaders = {}
  Object.entries(headers).forEach(([k, v]) => {
    normalizedHeaders[k.toLowerCase()] = v
  })

  return SECURITY_HEADERS.map((h) => {
    const present = h.name.toLowerCase() in normalizedHeaders
    return {
      header: h.name,
      description: h.description,
      severity: h.severity,
      present,
      value: present ? normalizedHeaders[h.name.toLowerCase()] : null,
    }
  })
}
