import { StateCreator } from 'zustand';
import type { AppState, EndpointSlice } from '../types';
import {
  DEFAULT_ENDPOINTS,
  STORAGE_KEY,
  saveSettingsToFile,
  updateEndpointInFile,
  cleanupOldHistory,
  SerializedHistory,
} from '../persistence';
import { getLatencyStatus } from '../../lib/utils';
import { parseBackendError, getUserFriendlyErrorMessage } from '../../errors';
import type { Endpoint, EndpointStatus, EndpointError, CustomEndpoint } from '../../types';

export const createEndpointSlice: StateCreator<
  AppState,
  [],
  [],
  EndpointSlice
> = (set, get) => ({
  // Initial state
  endpoints: DEFAULT_ENDPOINTS,
  customEndpoints: [],
  modeInfo: null,
  endpointStatuses: new Map(),

  // Actions
  setEndpoints: (endpoints) => {
    // Just set the endpoints - history restoration is handled by restoreHistoryForEndpoints
    // The endpointStatuses map is preserved to maintain history for endpoints that still exist
    set({ endpoints });
  },

  setModeInfo: (modeInfo) => {
    set({ modeInfo });
  },

  updateEndpointEnabled: (id, enabled) => {
    const state = get();
    const isCustom = state.customEndpoints.some((ep) => ep.id === id);

    set((state) => {
      // Update endpoint in state
      const endpoints = state.endpoints.map((ep) =>
        ep.id === id ? { ...ep, enabled } : ep
      );

      // Also update the endpoint reference in endpointStatuses
      const newStatuses = new Map(state.endpointStatuses);
      const currentStatus = newStatuses.get(id);
      if (currentStatus) {
        newStatuses.set(id, {
          ...currentStatus,
          endpoint: { ...currentStatus.endpoint, enabled },
        });
      }

      if (isCustom) {
        const customEndpoints = state.customEndpoints.map((ep) =>
          ep.id === id ? { ...ep, enabled } : ep
        );
        return { customEndpoints, endpoints, endpointStatuses: newStatuses };
      }

      return { endpoints, endpointStatuses: newStatuses };
    });

    // Save to appropriate file
    if (isCustom) {
      const newState = get();
      saveSettingsToFile(newState.config, newState.customEndpoints);
    } else {
      updateEndpointInFile(state.config.mode, id, { enabled });
    }
  },

  updateEndpointMuted: (id, muted) => {
    const state = get();

    set((state) => {
      // Update endpoint in state
      const endpoints = state.endpoints.map((ep) =>
        ep.id === id ? { ...ep, muted } : ep
      );

      // Also update the endpoint reference in endpointStatuses so tray icon hook sees the change
      const newStatuses = new Map(state.endpointStatuses);
      const currentStatus = newStatuses.get(id);
      if (currentStatus) {
        newStatuses.set(id, {
          ...currentStatus,
          endpoint: { ...currentStatus.endpoint, muted },
        });
      }

      return { endpoints, endpointStatuses: newStatuses };
    });

    // Save directly to endpoint JSON file
    updateEndpointInFile(state.config.mode, id, { muted });
  },

  updateModeEndpoint: (id, updates) => {
    const state = get();

    set((state) => {
      // Update endpoint in state
      const endpoints = state.endpoints.map((ep) =>
        ep.id === id ? { ...ep, ...updates } : ep
      );

      // Also update the endpoint reference in endpointStatuses
      const newStatuses = new Map(state.endpointStatuses);
      const currentStatus = newStatuses.get(id);
      if (currentStatus) {
        newStatuses.set(id, {
          ...currentStatus,
          endpoint: { ...currentStatus.endpoint, ...updates },
        });
      }

      return { endpoints, endpointStatuses: newStatuses };
    });

    // Save directly to endpoint JSON file
    updateEndpointInFile(state.config.mode, id, updates);
  },

  // Custom endpoint management
  addCustomEndpoint: (endpoint) => {
    const id = `custom-${crypto.randomUUID()}`;
    const newEndpoint: CustomEndpoint = {
      ...endpoint,
      id,
      category: endpoint.category || 'Custom',
    };

    set((state) => {
      const customEndpoints = [...state.customEndpoints, newEndpoint];
      // Also add to endpoints list
      const endpointForList: Endpoint = {
        id: newEndpoint.id,
        name: newEndpoint.name,
        url: newEndpoint.url,
        port: newEndpoint.port,
        protocol: newEndpoint.protocol,
        category: newEndpoint.category,
        enabled: newEndpoint.enabled,
        required: false,
        purpose: 'Custom endpoint',
      };
      const endpoints = [...state.endpoints, endpointForList];
      return { customEndpoints, endpoints };
    });

    // Auto-save to JSON
    const state = get();
    saveSettingsToFile(state.config, state.customEndpoints);
  },

  updateCustomEndpoint: (id, updates) => {
    set((state) => {
      const customEndpoints = state.customEndpoints.map((ep) =>
        ep.id === id ? { ...ep, ...updates } : ep
      );
      // Also update in endpoints list
      const endpoints = state.endpoints.map((ep) =>
        ep.id === id
          ? {
              ...ep,
              ...updates,
              // Ensure these fields are properly mapped
              name: updates.name ?? ep.name,
              url: updates.url ?? ep.url,
              port: updates.port ?? ep.port,
              protocol: updates.protocol ?? ep.protocol,
              category: updates.category ?? ep.category,
              enabled: updates.enabled ?? ep.enabled,
            }
          : ep
      );
      return { customEndpoints, endpoints };
    });

    // Auto-save to JSON
    const state = get();
    saveSettingsToFile(state.config, state.customEndpoints);
  },

  removeCustomEndpoint: (id) => {
    set((state) => {
      const customEndpoints = state.customEndpoints.filter((ep) => ep.id !== id);
      const endpoints = state.endpoints.filter((ep) => ep.id !== id);
      // Also remove from statuses
      const newStatuses = new Map(state.endpointStatuses);
      newStatuses.delete(id);
      return { customEndpoints, endpoints, endpointStatuses: newStatuses };
    });

    // Auto-save to JSON
    const state = get();
    saveSettingsToFile(state.config, state.customEndpoints);
  },

  setCustomEndpoints: (customEndpoints) => {
    set({ customEndpoints });
  },

  updateLatency: (endpointId, latency, success, error?) =>
    set((state) => {
      const endpoint = state.endpoints.find((ep) => ep.id === endpointId);
      if (!endpoint) return state;

      const newStatuses = new Map(state.endpointStatuses);
      const currentStatus = newStatuses.get(endpointId);
      const timestamp = Date.now();

      const newHistory = success
        ? [
            ...(currentStatus?.history || []).slice(-100),
            { timestamp, latency },
          ]
        : currentStatus?.history || [];

      let endpointError: EndpointError | null = null;
      if (!success && error) {
        const parsedError = parseBackendError(error, endpoint.url);
        endpointError = {
          message: parsedError.message,
          code: parsedError.code,
          timestamp,
          userMessage: getUserFriendlyErrorMessage(parsedError),
        };
      }

      const status: EndpointStatus = {
        endpoint,
        currentLatency: success ? latency : null,
        status: getLatencyStatus(success ? latency : null, state.config.thresholds),
        lastUpdated: timestamp,
        history: newHistory,
        error: success ? null : endpointError,
        isLoading: false,
      };

      newStatuses.set(endpointId, status);

      return {
        endpointStatuses: newStatuses,
      };
    }),

  setEndpointLoading: (endpointId, isLoading) =>
    set((state) => {
      const endpoint = state.endpoints.find((ep) => ep.id === endpointId);
      if (!endpoint) return state;

      const newStatuses = new Map(state.endpointStatuses);
      const currentStatus = newStatuses.get(endpointId);

      const status: EndpointStatus = currentStatus
        ? { ...currentStatus, isLoading }
        : {
            endpoint,
            currentLatency: null,
            status: 'unknown',
            lastUpdated: null,
            history: [],
            error: null,
            isLoading,
          };

      newStatuses.set(endpointId, status);

      return {
        endpointStatuses: newStatuses,
      };
    }),

  setAllEndpointsLoading: (isLoading) =>
    set((state) => {
      const newStatuses = new Map(state.endpointStatuses);

      for (const endpoint of state.endpoints.filter((ep) => ep.enabled)) {
        const currentStatus = newStatuses.get(endpoint.id);

        const status: EndpointStatus = currentStatus
          ? { ...currentStatus, isLoading }
          : {
              endpoint,
              currentLatency: null,
              status: 'unknown',
              lastUpdated: null,
              history: [],
              error: null,
              isLoading,
            };

        newStatuses.set(endpoint.id, status);
      }

      return {
        endpointStatuses: newStatuses,
      };
    }),

  clearEndpointError: (endpointId) =>
    set((state) => {
      const newStatuses = new Map(state.endpointStatuses);
      const currentStatus = newStatuses.get(endpointId);

      if (currentStatus) {
        newStatuses.set(endpointId, { ...currentStatus, error: null });
      }

      return {
        endpointStatuses: newStatuses,
      };
    }),

  getEndpointStatus: (endpointId) => {
    const state = get();
    return state.endpointStatuses.get(endpointId);
  },

  restoreHistoryForEndpoints: (endpoints) =>
    set((state) => {
      const storageData = localStorage.getItem(STORAGE_KEY);
      if (!storageData) return state;

      try {
        const parsed = JSON.parse(storageData);
        const historyData = parsed?.state?.historyData as SerializedHistory | undefined;
        if (!historyData) return state;

        const newStatuses = new Map(state.endpointStatuses);

        endpoints.forEach((endpoint) => {
          const savedHistory = historyData[endpoint.id];
          const currentStatus = newStatuses.get(endpoint.id);

          if (savedHistory && savedHistory.history.length > 0) {
            const cleanedHistory = cleanupOldHistory(savedHistory.history);
            if (cleanedHistory.length > 0) {
              newStatuses.set(endpoint.id, {
                endpoint,
                currentLatency: currentStatus?.currentLatency ?? cleanedHistory[cleanedHistory.length - 1]?.latency ?? null,
                status: currentStatus?.status ?? 'unknown',
                lastUpdated: currentStatus?.lastUpdated ?? savedHistory.lastUpdated,
                history: currentStatus?.history?.length ? currentStatus.history : cleanedHistory,
                error: currentStatus?.error ?? null,
                isLoading: currentStatus?.isLoading ?? false,
              });
            }
          }
        });

        return { endpointStatuses: newStatuses };
      } catch (error) {
        console.error('[endpointSlice] Failed to restore history:', error);
        return state;
      }
    }),
});
