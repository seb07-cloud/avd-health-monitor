import { invoke } from '@tauri-apps/api/core';
import type { FSLogixPath } from '../types';

/**
 * FSLogix service for reading storage paths from registry and testing connectivity.
 * Abstracts Tauri IPC calls for FSLogix operations.
 */

/**
 * Result of an FSLogix connectivity test
 */
export interface FSLogixTestResult {
  pathId: string;
  reachable: boolean;
  latency: number | null;
  error: string | null;
}

/**
 * Fetch FSLogix storage paths from Windows Registry.
 * Reads from both Profile Containers and ODFC locations.
 * @returns Array of FSLogixPath objects, empty if no paths configured
 */
export async function fetchFSLogixPaths(): Promise<FSLogixPath[]> {
  try {
    const paths = await invoke<FSLogixPath[]>('get_fslogix_storage_paths');
    return paths;
  } catch (error) {
    console.error('[fslogixService] Failed to fetch FSLogix paths:', error);
    return [];
  }
}

/**
 * Test connectivity to a single FSLogix storage path.
 * Uses TCP connection to port 445 (SMB).
 * @param path The FSLogix path to test
 * @returns FSLogixTestResult with connectivity status
 */
export async function testFSLogixConnectivity(path: FSLogixPath): Promise<FSLogixTestResult> {
  try {
    const latency = await invoke<number>('test_latency', {
      endpoint: path.hostname,
      port: path.port,
      protocol: 'tcp',
    });

    return {
      pathId: path.id,
      reachable: true,
      latency,
      error: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      pathId: path.id,
      reachable: false,
      latency: null,
      error: errorMessage,
    };
  }
}

/**
 * Test connectivity to all FSLogix paths concurrently.
 * @param paths Array of FSLogix paths to test
 * @param onResult Callback function called for each result
 */
export async function testAllFSLogixPaths(
  paths: FSLogixPath[],
  onResult: (result: FSLogixTestResult) => void
): Promise<void> {
  await Promise.all(
    paths.map(async (path) => {
      const result = await testFSLogixConnectivity(path);
      onResult(result);
    })
  );
}
