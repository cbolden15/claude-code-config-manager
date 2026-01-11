/**
 * Fetch Mock Helpers
 *
 * Utilities for mocking fetch API calls in tests
 */

/**
 * Mock fetch response
 */
export interface MockFetchResponse {
  status: number;
  ok: boolean;
  statusText: string;
  json: () => Promise<any>;
  text: () => Promise<string>;
  headers: Headers;
}

/**
 * Mock fetch options
 */
export interface MockFetchOptions {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  delay?: number;
}

/**
 * Creates a mock fetch response
 */
export function createMockResponse(
  data: any,
  options: MockFetchOptions = {}
): MockFetchResponse {
  const {
    status = 200,
    statusText = 'OK',
    headers = {},
  } = options;

  const mockHeaders = new Headers(headers);

  return {
    status,
    ok: status >= 200 && status < 300,
    statusText,
    headers: mockHeaders,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

/**
 * Creates a mock fetch error
 */
export function createMockError(message: string): Error {
  return new Error(message);
}

/**
 * Creates a mock fetch function
 */
export function createMockFetch(
  mockResponses: Map<string, any> = new Map()
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';
    const key = `${method}:${url}`;

    if (mockResponses.has(key)) {
      const response = mockResponses.get(key);
      if (response instanceof Error) {
        throw response;
      }
      return response;
    }

    // Default 404 response
    return createMockResponse(
      { error: 'Not found' },
      { status: 404, statusText: 'Not Found' }
    );
  };
}

/**
 * Mock fetch builder for fluent API
 */
export class MockFetchBuilder {
  private responses = new Map<string, any>();

  /**
   * Add a mock response for a specific endpoint
   */
  get(url: string, data: any, options?: MockFetchOptions): this {
    this.responses.set(`GET:${url}`, createMockResponse(data, options));
    return this;
  }

  /**
   * Add a POST mock response
   */
  post(url: string, data: any, options?: MockFetchOptions): this {
    this.responses.set(`POST:${url}`, createMockResponse(data, options));
    return this;
  }

  /**
   * Add a PATCH mock response
   */
  patch(url: string, data: any, options?: MockFetchOptions): this {
    this.responses.set(`PATCH:${url}`, createMockResponse(data, options));
    return this;
  }

  /**
   * Add a DELETE mock response
   */
  delete(url: string, data: any, options?: MockFetchOptions): this {
    this.responses.set(`DELETE:${url}`, createMockResponse(data, options));
    return this;
  }

  /**
   * Add an error response
   */
  error(method: string, url: string, error: Error): this {
    this.responses.set(`${method.toUpperCase()}:${url}`, error);
    return this;
  }

  /**
   * Build the mock fetch function
   */
  build(): typeof fetch {
    return createMockFetch(this.responses);
  }
}

/**
 * Creates a new mock fetch builder
 */
export function mockFetch(): MockFetchBuilder {
  return new MockFetchBuilder();
}

/**
 * Install mock fetch globally (for testing)
 */
export function installMockFetch(mockFn: typeof fetch): () => void {
  const originalFetch = global.fetch;
  global.fetch = mockFn as any;

  // Return cleanup function
  return () => {
    global.fetch = originalFetch;
  };
}

/**
 * Helper to verify fetch was called with expected arguments
 */
export class FetchSpy {
  private calls: Array<{ url: string; init?: RequestInit }> = [];
  private originalFetch: typeof fetch;

  constructor() {
    this.originalFetch = global.fetch;
    global.fetch = this.createSpyFetch();
  }

  private createSpyFetch(): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      this.calls.push({ url, init });
      return this.originalFetch(input, init);
    };
  }

  /**
   * Get all fetch calls
   */
  getCalls() {
    return this.calls;
  }

  /**
   * Check if fetch was called with specific URL
   */
  wasCalledWith(url: string): boolean {
    return this.calls.some(call => call.url === url);
  }

  /**
   * Get call count
   */
  getCallCount(): number {
    return this.calls.length;
  }

  /**
   * Clear recorded calls
   */
  clear(): void {
    this.calls = [];
  }

  /**
   * Restore original fetch
   */
  restore(): void {
    global.fetch = this.originalFetch;
  }
}
