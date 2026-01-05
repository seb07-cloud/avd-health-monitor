import { invoke } from '@tauri-apps/api/core';
import type { Endpoint, LatencyResult } from '../types';
import { parseBackendError } from '../errors';

/**
 * Latency service for testing endpoint connectivity.
 * Abstracts Tauri IPC calls for latency testing.
 */

/**
 * Test latency to a single endpoint.
 * @param endpoint The endpoint URL to test
 * @param port Optional port number (default: 443)
 * @param protocol Optional protocol ('tcp', 'http', 'https') (default: 'tcp')
 * @returns The latency in milliseconds
 * @throws Error if the test fails
 */
export async function testLatency(
  endpoint: string,
  port?: number,
  protocol?: 'tcp' | 'http' | 'https'
): Promise<number> {
  return invoke<number>('test_latency', { endpoint, port, protocol });
}

/**
 * Test latency to a single endpoint and return a structured result.
 * @param endpoint The endpoint configuration
 * @returns A LatencyResult object with success/failure info
 */
export async function testEndpointLatency(endpoint: Endpoint): Promise<LatencyResult> {
  const timestamp = Date.now();

  try {
    const latency = await testLatency(endpoint.url, endpoint.port, endpoint.protocol);
    return {
      endpointId: endpoint.id,
      latency,
      timestamp,
      success: true,
    };
  } catch (error) {
    const parsedError = parseBackendError(error, endpoint.url);
    return {
      endpointId: endpoint.id,
      latency: 0,
      timestamp,
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}

/**
 * Test latency to multiple endpoints concurrently.
 * @param endpoints Array of endpoints to test
 * @returns Array of LatencyResult objects
 */
export async function testMultipleEndpoints(endpoints: Endpoint[]): Promise<LatencyResult[]> {
  const results = await Promise.all(
    endpoints.map((endpoint) => testEndpointLatency(endpoint))
  );
  return results;
}

/**
 * Test latency to all enabled endpoints and call a callback for each result.
 * This is useful for updating state as results come in.
 * @param endpoints Array of endpoints to test (only enabled ones will be tested)
 * @param onResult Callback function called for each result
 */
export async function testEnabledEndpoints(
  endpoints: Endpoint[],
  onResult: (result: LatencyResult) => void
): Promise<void> {
  const enabledEndpoints = endpoints.filter((e) => e.enabled);

  for (const endpoint of enabledEndpoints) {
    const result = await testEndpointLatency(endpoint);
    onResult(result);
  }
}

/**
 * Test latency to all enabled endpoints concurrently and call a callback for each result.
 * Results are processed as they complete.
 * @param endpoints Array of endpoints to test (only enabled ones will be tested)
 * @param onResult Callback function called for each result
 */
export async function testEnabledEndpointsConcurrently(
  endpoints: Endpoint[],
  onResult: (result: LatencyResult) => void
): Promise<void> {
  const enabledEndpoints = endpoints.filter((e) => e.enabled);

  await Promise.all(
    enabledEndpoints.map(async (endpoint) => {
      const result = await testEndpointLatency(endpoint);
      onResult(result);
    })
  );
}
