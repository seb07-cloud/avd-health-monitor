import { StateCreator } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { AppState, FslogixSlice } from '../types';
import type { FSLogixStatus } from '../../types';

export const createFslogixSlice: StateCreator<
  AppState,
  [],
  [],
  FslogixSlice
> = (set) => ({
  fslogixPaths: [],
  fslogixStatuses: new Map(),

  setFSLogixPaths: (paths) => {
    set({ fslogixPaths: paths });
  },

  updateFSLogixStatus: (pathId, reachable, latency, error) =>
    set((state) => {
      const path = state.fslogixPaths.find((p) => p.id === pathId);
      if (!path) return state;

      const newStatuses = new Map(state.fslogixStatuses);
      const timestamp = Date.now();
      const currentStatus = newStatuses.get(pathId);

      // Track consecutive failures: increment on failure, reset on success
      const consecutiveFailures = reachable
        ? 0
        : (currentStatus?.consecutiveFailures ?? 0) + 1;

      const status: FSLogixStatus = {
        path,
        reachable,
        latency,
        error,
        isLoading: false,
        lastUpdated: timestamp,
        consecutiveFailures,
      };

      newStatuses.set(pathId, status);
      return { fslogixStatuses: newStatuses };
    }),

  setFSLogixLoading: (pathId, isLoading) =>
    set((state) => {
      const path = state.fslogixPaths.find((p) => p.id === pathId);
      if (!path) return state;

      const newStatuses = new Map(state.fslogixStatuses);
      const currentStatus = newStatuses.get(pathId);

      const status: FSLogixStatus = currentStatus
        ? { ...currentStatus, isLoading }
        : {
            path,
            reachable: false,
            latency: null,
            error: null,
            isLoading,
            lastUpdated: null,
            consecutiveFailures: 0,
          };

      newStatuses.set(pathId, status);
      return { fslogixStatuses: newStatuses };
    }),

  setAllFSLogixLoading: (isLoading) =>
    set((state) => {
      const newStatuses = new Map(state.fslogixStatuses);

      for (const path of state.fslogixPaths) {
        const currentStatus = newStatuses.get(path.id);

        const status: FSLogixStatus = currentStatus
          ? { ...currentStatus, isLoading }
          : {
              path,
              reachable: false,
              latency: null,
              error: null,
              isLoading,
              lastUpdated: null,
              consecutiveFailures: 0,
            };

        newStatuses.set(path.id, status);
      }

      return { fslogixStatuses: newStatuses };
    }),

  updateFSLogixPathMuted: (pathId, muted) => {
    // Update the path in state
    set((state) => {
      const fslogixPaths = state.fslogixPaths.map((path) =>
        path.id === pathId ? { ...path, muted } : path
      );

      // Also update the path reference in fslogixStatuses
      const newStatuses = new Map(state.fslogixStatuses);
      const currentStatus = newStatuses.get(pathId);
      if (currentStatus) {
        newStatuses.set(pathId, {
          ...currentStatus,
          path: { ...currentStatus.path, muted },
        });
      }

      return { fslogixPaths, fslogixStatuses: newStatuses };
    });

    // Persist to settings.json via Tauri command
    invoke('update_fslogix_path_muted', { pathId, muted }).catch((error) => {
      console.error('[fslogixSlice] Failed to persist FSLogix muted state:', error);
    });
  },
});
