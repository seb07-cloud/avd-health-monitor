import { StateCreator } from 'zustand';
import type { AppState, ConfigSlice } from '../types';
import { DEFAULT_CONFIG, saveSettingsToFile } from '../persistence';

export const createConfigSlice: StateCreator<
  AppState,
  [],
  [],
  ConfigSlice
> = (set, get) => ({
  config: DEFAULT_CONFIG,

  setConfig: (config) => {
    set((state) => ({
      config: { ...state.config, ...config },
    }));
    // Auto-save to JSON file
    const state = get();
    saveSettingsToFile(state.config, state.customEndpoints);
  },
});
