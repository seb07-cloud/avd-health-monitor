import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './useAppStore';

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      endpointStatuses: new Map(),
      isMonitoring: false,
      isPaused: false,
      customEndpoints: [],
    });
  });

  it('should initialize with default config', () => {
    const state = useAppStore.getState();
    expect(state.config.testInterval).toBe(10);
    expect(state.config.thresholds.excellent).toBe(30);
    expect(state.config.thresholds.good).toBe(80);
    expect(state.config.thresholds.warning).toBe(150);
    expect(state.config.mode).toBe('sessionhost');
  });

  it('should have default endpoints', () => {
    const state = useAppStore.getState();
    // Fallback has at least 1 endpoint (real defaults come from settings.json)
    expect(state.endpoints.length).toBeGreaterThanOrEqual(1);
    // First fallback endpoint is Azure AD Authentication
    expect(state.endpoints[0].name).toBe('Azure AD Authentication');
    expect(state.endpoints[0].url).toBe('login.microsoftonline.com');
  });

  it('should update config', () => {
    const { setConfig } = useAppStore.getState();
    setConfig({ testInterval: 20 });

    const state = useAppStore.getState();
    expect(state.config.testInterval).toBe(20);
  });

  it('should add custom endpoint', () => {
    const { addCustomEndpoint } = useAppStore.getState();
    const newEndpoint = {
      name: 'Test Endpoint',
      url: 'test.example.com',
      port: 443,
      protocol: 'tcp' as const,
      category: 'Custom',
      enabled: true,
    };

    addCustomEndpoint(newEndpoint);

    const state = useAppStore.getState();
    expect(state.customEndpoints.length).toBe(1);
    expect(state.customEndpoints[0].name).toBe('Test Endpoint');
    // Custom endpoint should also be in the endpoints list
    expect(state.endpoints.some((e) => e.name === 'Test Endpoint')).toBe(true);
  });

  it('should update endpoint enabled state', () => {
    const state = useAppStore.getState();
    const firstEndpoint = state.endpoints[0];

    const { updateEndpointEnabled } = useAppStore.getState();
    updateEndpointEnabled(firstEndpoint.id, false);

    const updatedState = useAppStore.getState();
    const updated = updatedState.endpoints.find((e) => e.id === firstEndpoint.id);
    expect(updated?.enabled).toBe(false);
    // Endpoint status should also have updated endpoint reference
    const status = updatedState.endpointStatuses.get(firstEndpoint.id);
    if (status) {
      expect(status.endpoint.enabled).toBe(false);
    }
  });

  it('should remove custom endpoint', () => {
    const { addCustomEndpoint, removeCustomEndpoint } = useAppStore.getState();

    // First add a custom endpoint
    addCustomEndpoint({
      name: 'To Remove',
      url: 'remove.example.com',
      port: 443,
      protocol: 'tcp' as const,
      category: 'Custom',
      enabled: true,
    });

    let state = useAppStore.getState();
    const customEndpoint = state.customEndpoints[0];

    // Then remove it
    removeCustomEndpoint(customEndpoint.id);

    state = useAppStore.getState();
    expect(state.customEndpoints.length).toBe(0);
    expect(state.endpoints.find((e) => e.id === customEndpoint.id)).toBeUndefined();
  });

  it('should update latency', () => {
    const state = useAppStore.getState();
    const firstEndpoint = state.endpoints[0];

    const { updateLatency } = useAppStore.getState();
    updateLatency(firstEndpoint.id, 45.5, true);

    const updatedState = useAppStore.getState();
    const status = updatedState.endpointStatuses.get(firstEndpoint.id);

    expect(status).toBeDefined();
    expect(status?.currentLatency).toBe(45.5);
    expect(status?.status).toBe('good'); // 45.5ms is in the "good" range
    expect(status?.history.length).toBe(1);
  });

  it('should toggle monitoring state', () => {
    const { setMonitoring } = useAppStore.getState();

    setMonitoring(true);
    expect(useAppStore.getState().isMonitoring).toBe(true);

    setMonitoring(false);
    expect(useAppStore.getState().isMonitoring).toBe(false);
  });

  it('should toggle paused state', () => {
    const { setPaused } = useAppStore.getState();

    setPaused(true);
    expect(useAppStore.getState().isPaused).toBe(true);

    setPaused(false);
    expect(useAppStore.getState().isPaused).toBe(false);
  });
});
