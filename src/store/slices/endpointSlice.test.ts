import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../useAppStore';
import { DEFAULT_ENDPOINTS } from '../persistence';
import type { Endpoint, CustomEndpoint } from '../../types';

// Mock Tauri invoke to prevent file system operations
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

// Mock crypto.randomUUID for consistent test IDs
vi.stubGlobal(
  'crypto',
  {
    ...crypto,
    randomUUID: vi.fn().mockReturnValue('test-uuid-1234'),
  }
);

// Test fixtures
const testEndpoints: Endpoint[] = [
  {
    id: 'endpoint-1',
    name: 'Test Endpoint 1',
    url: 'test1.example.com',
    enabled: true,
    port: 443,
    protocol: 'tcp',
    category: 'Test',
    required: true,
  },
  {
    id: 'endpoint-2',
    name: 'Test Endpoint 2',
    url: 'test2.example.com',
    enabled: true,
    port: 443,
    protocol: 'https',
    category: 'Test',
    required: false,
  },
];

describe('endpointSlice', () => {
  beforeEach(() => {
    // Reset endpoint slice state
    useAppStore.setState({
      endpoints: DEFAULT_ENDPOINTS,
      customEndpoints: [],
      modeInfo: null,
      endpointStatuses: new Map(),
    });
  });

  describe('setEndpoints', () => {
    it('should replace endpoint list', () => {
      const { setEndpoints } = useAppStore.getState();
      setEndpoints(testEndpoints);

      const state = useAppStore.getState();
      expect(state.endpoints).toHaveLength(2);
      expect(state.endpoints[0].id).toBe('endpoint-1');
      expect(state.endpoints[1].id).toBe('endpoint-2');
    });

    it('should preserve endpointStatuses map for existing endpoints', () => {
      // First set up some statuses
      const { updateLatency, setEndpoints } = useAppStore.getState();
      updateLatency('azure-login', 50, true);

      // Then replace endpoints (keeping azure-login)
      setEndpoints([...DEFAULT_ENDPOINTS, ...testEndpoints]);

      const state = useAppStore.getState();
      // Status should still exist for azure-login
      const status = state.endpointStatuses.get('azure-login');
      expect(status).toBeDefined();
      expect(status?.currentLatency).toBe(50);
    });
  });

  describe('setModeInfo', () => {
    it('should set mode info object', () => {
      const { setModeInfo } = useAppStore.getState();
      setModeInfo({
        name: 'Session Host Mode',
        description: 'For AVD session hosts',
      });

      const state = useAppStore.getState();
      expect(state.modeInfo?.name).toBe('Session Host Mode');
      expect(state.modeInfo?.description).toBe('For AVD session hosts');
    });
  });

  describe('updateEndpointEnabled', () => {
    beforeEach(() => {
      useAppStore.setState({ endpoints: testEndpoints });
    });

    it('should toggle endpoint to disabled', () => {
      const { updateEndpointEnabled } = useAppStore.getState();
      updateEndpointEnabled('endpoint-1', false);

      const state = useAppStore.getState();
      const endpoint = state.endpoints.find((e) => e.id === 'endpoint-1');
      expect(endpoint?.enabled).toBe(false);
    });

    it('should toggle endpoint to enabled', () => {
      useAppStore.setState({
        endpoints: testEndpoints.map((e) =>
          e.id === 'endpoint-1' ? { ...e, enabled: false } : e
        ),
      });

      const { updateEndpointEnabled } = useAppStore.getState();
      updateEndpointEnabled('endpoint-1', true);

      const state = useAppStore.getState();
      const endpoint = state.endpoints.find((e) => e.id === 'endpoint-1');
      expect(endpoint?.enabled).toBe(true);
    });

    it('should also update endpoint in endpointStatuses', () => {
      const { updateLatency, updateEndpointEnabled } = useAppStore.getState();

      // Create a status first
      updateLatency('endpoint-1', 50, true);

      // Then update enabled
      updateEndpointEnabled('endpoint-1', false);

      const status = useAppStore.getState().endpointStatuses.get('endpoint-1');
      expect(status?.endpoint.enabled).toBe(false);
    });
  });

  describe('updateEndpointMuted', () => {
    beforeEach(() => {
      useAppStore.setState({ endpoints: testEndpoints });
    });

    it('should toggle muted flag to true', () => {
      const { updateEndpointMuted } = useAppStore.getState();
      updateEndpointMuted('endpoint-1', true);

      const state = useAppStore.getState();
      const endpoint = state.endpoints.find((e) => e.id === 'endpoint-1');
      expect(endpoint?.muted).toBe(true);
    });

    it('should toggle muted flag to false', () => {
      useAppStore.setState({
        endpoints: testEndpoints.map((e) =>
          e.id === 'endpoint-1' ? { ...e, muted: true } : e
        ),
      });

      const { updateEndpointMuted } = useAppStore.getState();
      updateEndpointMuted('endpoint-1', false);

      const state = useAppStore.getState();
      const endpoint = state.endpoints.find((e) => e.id === 'endpoint-1');
      expect(endpoint?.muted).toBe(false);
    });
  });

  describe('addCustomEndpoint', () => {
    it('should add to customEndpoints array', () => {
      const { addCustomEndpoint } = useAppStore.getState();
      addCustomEndpoint({
        name: 'Custom Test',
        url: 'custom.example.com',
        port: 443,
        protocol: 'tcp',
        category: 'Custom',
        enabled: true,
      });

      const state = useAppStore.getState();
      expect(state.customEndpoints).toHaveLength(1);
      expect(state.customEndpoints[0].name).toBe('Custom Test');
    });

    it('should generate ID starting with custom-', () => {
      const { addCustomEndpoint } = useAppStore.getState();
      addCustomEndpoint({
        name: 'Custom Test',
        url: 'custom.example.com',
        port: 443,
        protocol: 'tcp',
        enabled: true,
      });

      const state = useAppStore.getState();
      expect(state.customEndpoints[0].id).toBe('custom-test-uuid-1234');
    });

    it('should also add to endpoints list', () => {
      const { addCustomEndpoint } = useAppStore.getState();
      addCustomEndpoint({
        name: 'Custom Test',
        url: 'custom.example.com',
        port: 443,
        protocol: 'tcp',
        enabled: true,
      });

      const state = useAppStore.getState();
      const inEndpoints = state.endpoints.find((e) => e.name === 'Custom Test');
      expect(inEndpoints).toBeDefined();
      expect(inEndpoints?.id).toBe('custom-test-uuid-1234');
    });

    it('should use default category if not provided', () => {
      const { addCustomEndpoint } = useAppStore.getState();
      addCustomEndpoint({
        name: 'No Category',
        url: 'nocategory.example.com',
        port: 443,
        protocol: 'tcp',
        enabled: true,
      });

      const state = useAppStore.getState();
      expect(state.customEndpoints[0].category).toBe('Custom');
    });
  });

  describe('updateCustomEndpoint', () => {
    beforeEach(() => {
      // Add a custom endpoint first
      useAppStore.setState({
        customEndpoints: [
          {
            id: 'custom-1',
            name: 'Original Name',
            url: 'original.example.com',
            port: 443,
            protocol: 'tcp',
            category: 'Custom',
            enabled: true,
          },
        ],
        endpoints: [
          ...DEFAULT_ENDPOINTS,
          {
            id: 'custom-1',
            name: 'Original Name',
            url: 'original.example.com',
            port: 443,
            protocol: 'tcp',
            category: 'Custom',
            enabled: true,
            required: false,
            purpose: 'Custom endpoint',
          },
        ],
      });
    });

    it('should update name property', () => {
      const { updateCustomEndpoint } = useAppStore.getState();
      updateCustomEndpoint('custom-1', { name: 'Updated Name' });

      const state = useAppStore.getState();
      expect(state.customEndpoints[0].name).toBe('Updated Name');
    });

    it('should also update in endpoints list', () => {
      const { updateCustomEndpoint } = useAppStore.getState();
      updateCustomEndpoint('custom-1', { name: 'Updated Name' });

      const state = useAppStore.getState();
      const inEndpoints = state.endpoints.find((e) => e.id === 'custom-1');
      expect(inEndpoints?.name).toBe('Updated Name');
    });

    it('should update multiple properties', () => {
      const { updateCustomEndpoint } = useAppStore.getState();
      updateCustomEndpoint('custom-1', {
        name: 'New Name',
        url: 'new.example.com',
        port: 8443,
      });

      const state = useAppStore.getState();
      expect(state.customEndpoints[0].name).toBe('New Name');
      expect(state.customEndpoints[0].url).toBe('new.example.com');
      expect(state.customEndpoints[0].port).toBe(8443);
    });
  });

  describe('removeCustomEndpoint', () => {
    beforeEach(() => {
      useAppStore.setState({
        customEndpoints: [
          {
            id: 'custom-1',
            name: 'To Remove',
            url: 'remove.example.com',
            port: 443,
            protocol: 'tcp',
            category: 'Custom',
            enabled: true,
          },
        ],
        endpoints: [
          ...DEFAULT_ENDPOINTS,
          {
            id: 'custom-1',
            name: 'To Remove',
            url: 'remove.example.com',
            port: 443,
            protocol: 'tcp',
            category: 'Custom',
            enabled: true,
            required: false,
            purpose: 'Custom endpoint',
          },
        ],
        endpointStatuses: new Map([
          [
            'custom-1',
            {
              endpoint: {
                id: 'custom-1',
                name: 'To Remove',
                url: 'remove.example.com',
                enabled: true,
              },
              currentLatency: 50,
              status: 'good',
              lastUpdated: Date.now(),
              history: [],
              error: null,
              isLoading: false,
            },
          ],
        ]),
      });
    });

    it('should remove from customEndpoints', () => {
      const { removeCustomEndpoint } = useAppStore.getState();
      removeCustomEndpoint('custom-1');

      const state = useAppStore.getState();
      expect(state.customEndpoints).toHaveLength(0);
    });

    it('should remove from endpoints list', () => {
      const { removeCustomEndpoint } = useAppStore.getState();
      removeCustomEndpoint('custom-1');

      const state = useAppStore.getState();
      const found = state.endpoints.find((e) => e.id === 'custom-1');
      expect(found).toBeUndefined();
    });

    it('should remove from endpointStatuses', () => {
      const { removeCustomEndpoint } = useAppStore.getState();
      removeCustomEndpoint('custom-1');

      const state = useAppStore.getState();
      expect(state.endpointStatuses.has('custom-1')).toBe(false);
    });
  });

  describe('updateLatency', () => {
    beforeEach(() => {
      useAppStore.setState({ endpoints: testEndpoints });
    });

    it('should create status entry on first update', () => {
      const { updateLatency } = useAppStore.getState();
      updateLatency('endpoint-1', 45, true);

      const status = useAppStore.getState().endpointStatuses.get('endpoint-1');
      expect(status).toBeDefined();
      expect(status?.currentLatency).toBe(45);
      expect(status?.isLoading).toBe(false);
    });

    it('should add to history on success', () => {
      const { updateLatency } = useAppStore.getState();
      updateLatency('endpoint-1', 45, true);

      const status = useAppStore.getState().endpointStatuses.get('endpoint-1');
      expect(status?.history).toHaveLength(1);
      expect(status?.history[0].latency).toBe(45);
    });

    it('should update existing status', () => {
      const { updateLatency } = useAppStore.getState();
      updateLatency('endpoint-1', 45, true);
      updateLatency('endpoint-1', 50, true);

      const status = useAppStore.getState().endpointStatuses.get('endpoint-1');
      expect(status?.currentLatency).toBe(50);
      expect(status?.history).toHaveLength(2);
    });

    it('should set error on failure', () => {
      const { updateLatency } = useAppStore.getState();
      updateLatency('endpoint-1', 0, false, 'Connection timeout');

      const status = useAppStore.getState().endpointStatuses.get('endpoint-1');
      expect(status?.error).not.toBeNull();
      expect(status?.currentLatency).toBeNull();
    });

    it('should not add to history on failure', () => {
      const { updateLatency } = useAppStore.getState();
      updateLatency('endpoint-1', 45, true);
      updateLatency('endpoint-1', 0, false, 'Error');

      const status = useAppStore.getState().endpointStatuses.get('endpoint-1');
      expect(status?.history).toHaveLength(1); // Only success added
    });

    it('should clear error on subsequent success', () => {
      const { updateLatency } = useAppStore.getState();
      updateLatency('endpoint-1', 0, false, 'Error');
      updateLatency('endpoint-1', 50, true);

      const status = useAppStore.getState().endpointStatuses.get('endpoint-1');
      expect(status?.error).toBeNull();
      expect(status?.currentLatency).toBe(50);
    });
  });

  describe('setEndpointLoading', () => {
    beforeEach(() => {
      useAppStore.setState({ endpoints: testEndpoints });
    });

    it('should set isLoading flag', () => {
      const { setEndpointLoading } = useAppStore.getState();
      setEndpointLoading('endpoint-1', true);

      const status = useAppStore.getState().endpointStatuses.get('endpoint-1');
      expect(status?.isLoading).toBe(true);
    });

    it('should create status entry if none exists', () => {
      const { setEndpointLoading } = useAppStore.getState();
      setEndpointLoading('endpoint-1', true);

      const status = useAppStore.getState().endpointStatuses.get('endpoint-1');
      expect(status).toBeDefined();
      expect(status?.currentLatency).toBeNull();
      expect(status?.status).toBe('unknown');
    });

    it('should preserve existing status when updating', () => {
      const { updateLatency, setEndpointLoading } = useAppStore.getState();
      updateLatency('endpoint-1', 50, true);
      setEndpointLoading('endpoint-1', true);

      const status = useAppStore.getState().endpointStatuses.get('endpoint-1');
      expect(status?.isLoading).toBe(true);
      expect(status?.currentLatency).toBe(50); // preserved
    });
  });

  describe('setAllEndpointsLoading', () => {
    beforeEach(() => {
      useAppStore.setState({ endpoints: testEndpoints });
    });

    it('should set loading for all enabled endpoints', () => {
      const { setAllEndpointsLoading } = useAppStore.getState();
      setAllEndpointsLoading(true);

      const state = useAppStore.getState();
      const status1 = state.endpointStatuses.get('endpoint-1');
      const status2 = state.endpointStatuses.get('endpoint-2');

      expect(status1?.isLoading).toBe(true);
      expect(status2?.isLoading).toBe(true);
    });

    it('should not set loading for disabled endpoints', () => {
      useAppStore.setState({
        endpoints: testEndpoints.map((e) =>
          e.id === 'endpoint-2' ? { ...e, enabled: false } : e
        ),
      });

      const { setAllEndpointsLoading } = useAppStore.getState();
      setAllEndpointsLoading(true);

      const state = useAppStore.getState();
      expect(state.endpointStatuses.get('endpoint-1')?.isLoading).toBe(true);
      expect(state.endpointStatuses.has('endpoint-2')).toBe(false);
    });
  });

  describe('clearEndpointError', () => {
    beforeEach(() => {
      useAppStore.setState({ endpoints: testEndpoints });
    });

    it('should clear error field', () => {
      const { updateLatency, clearEndpointError } = useAppStore.getState();

      // Create an error
      updateLatency('endpoint-1', 0, false, 'Connection failed');

      let status = useAppStore.getState().endpointStatuses.get('endpoint-1');
      expect(status?.error).not.toBeNull();

      // Clear it
      clearEndpointError('endpoint-1');

      status = useAppStore.getState().endpointStatuses.get('endpoint-1');
      expect(status?.error).toBeNull();
    });

    it('should preserve other status fields when clearing error', () => {
      const { updateLatency, clearEndpointError } = useAppStore.getState();

      // First success, then error
      updateLatency('endpoint-1', 50, true);
      updateLatency('endpoint-1', 0, false, 'Error');

      // Clear error
      clearEndpointError('endpoint-1');

      const status = useAppStore.getState().endpointStatuses.get('endpoint-1');
      expect(status?.error).toBeNull();
      expect(status?.history).toHaveLength(1); // history preserved
    });
  });

  describe('getEndpointStatus', () => {
    beforeEach(() => {
      useAppStore.setState({ endpoints: testEndpoints });
    });

    it('should return status for existing endpoint', () => {
      const { updateLatency, getEndpointStatus } = useAppStore.getState();
      updateLatency('endpoint-1', 50, true);

      const status = getEndpointStatus('endpoint-1');
      expect(status).toBeDefined();
      expect(status?.currentLatency).toBe(50);
    });

    it('should return undefined for non-existent endpoint', () => {
      const { getEndpointStatus } = useAppStore.getState();
      const status = getEndpointStatus('non-existent');
      expect(status).toBeUndefined();
    });
  });
});
