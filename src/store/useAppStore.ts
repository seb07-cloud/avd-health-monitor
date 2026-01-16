import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppState } from './types';
import type { PersistedState } from './persistence';
import {
  createConfigSlice,
  createEndpointSlice,
  createFslogixSlice,
  createUiSlice,
} from './slices';
import {
  STORAGE_KEY,
  DEFAULT_CONFIG,
  DEFAULT_ENDPOINTS,
  serializeHistory,
  deserializeHistory,
  handleMigration,
} from './persistence';

export const useAppStore = create<AppState>()(
  persist(
    (...args) => ({
      ...createConfigSlice(...args),
      ...createEndpointSlice(...args),
      ...createFslogixSlice(...args),
      ...createUiSlice(...args),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedState => ({
        config: state.config,
        customEndpoints: state.customEndpoints,
        historyData: serializeHistory(state.endpointStatuses),
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as PersistedState | undefined;
        return {
          ...currentState,
          config: persisted?.config
            ? { ...DEFAULT_CONFIG, ...persisted.config }
            : currentState.config,
          customEndpoints: persisted?.customEndpoints ?? [],
          endpoints: currentState.endpoints,
          endpointStatuses: persisted?.historyData
            ? deserializeHistory(persisted.historyData, DEFAULT_ENDPOINTS)
            : currentState.endpointStatuses,
        };
      },
      version: 10, // Incremented from v9 for slice refactor
      migrate: handleMigration,
    }
  )
);
