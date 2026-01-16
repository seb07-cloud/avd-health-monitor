import { StateCreator } from 'zustand';
import type { AppState, UiSlice } from '../types';

export const createUiSlice: StateCreator<
  AppState,
  [],
  [],
  UiSlice
> = (set) => ({
  currentView: 'dashboard',
  isMonitoring: false,
  isPaused: false,
  pendingTestTrigger: false,
  isOffline: false,
  lastOnlineTimestamp: null,

  setCurrentView: (view) => set({ currentView: view }),
  setMonitoring: (isMonitoring) => set({ isMonitoring }),
  setPaused: (isPaused) => set({ isPaused }),
  setOffline: (isOffline) =>
    set((state) => ({
      isOffline,
      // Update lastOnlineTimestamp when going from offline to online
      lastOnlineTimestamp: !isOffline ? Date.now() : state.lastOnlineTimestamp,
    })),
  triggerTestNow: () => set({ pendingTestTrigger: true }),
  clearTestTrigger: () => set({ pendingTestTrigger: false }),
});
