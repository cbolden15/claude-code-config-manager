import { NextRequest } from 'next/server'

/**
 * API Test Helpers
 * Helper functions for testing Next.js API routes
 */

/**
 * Create a mock NextRequest for testing API routes
 */
export function createMockRequest(options: {
  method?: string
  url?: string
  body?: any
  headers?: Record<string, string>
  searchParams?: Record<string, string>
} = {}): NextRequest {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body,
    headers = {},
    searchParams = {},
  } = options

  // Build URL with search params
  const urlObj = new URL(url)
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value)
  })

  // Create request init options
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  // Add body for POST/PUT/PATCH requests
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    init.body = JSON.stringify(body)
  }

  return new NextRequest(urlObj, init)
}

/**
 * Create mock route params for dynamic routes
 */
export function createMockParams<T extends Record<string, string>>(
  params: T
): { params: Promise<T> } {
  return {
    params: Promise.resolve(params),
  }
}

/**
 * Parse response from Next.js route handler
 */
export async function parseResponse<T = any>(response: Response): Promise<{
  status: number
  data?: T
  error?: string
}> {
  const status = response.status
  const text = await response.text()

  // Try to parse as JSON
  try {
    const data = JSON.parse(text)
    return { status, data }
  } catch {
    return { status, error: text }
  }
}

/**
 * Assert response is successful (2xx)
 */
export function assertSuccessResponse(response: Response): void {
  if (!response.ok) {
    throw new Error(`Expected successful response, got ${response.status}`)
  }
}

/**
 * Assert response has specific status code
 */
export function assertStatus(response: Response, expectedStatus: number): void {
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}`
    )
  }
}

/**
 * Create a test API context with request and params
 */
export function createTestContext<P extends Record<string, string> = {}>(options: {
  method?: string
  url?: string
  body?: any
  headers?: Record<string, string>
  searchParams?: Record<string, string>
  params?: P
} = {}) {
  const { params, ...requestOptions } = options

  return {
    request: createMockRequest(requestOptions),
    ...(params && createMockParams(params)),
  }
}
