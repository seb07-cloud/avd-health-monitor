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

  setCurrentView: (view) => set({ currentView: view }),
  setMonitoring: (isMonitoring) => set({ isMonitoring }),
  setPaused: (isPaused) => set({ isPaused }),
  triggerTestNow: () => set({ pendingTestTrigger: true }),
  clearTestTrigger: () => set({ pendingTestTrigger: false }),
});
