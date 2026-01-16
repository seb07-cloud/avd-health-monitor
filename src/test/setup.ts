import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { setupTauriMocks, cleanupTauriMocks } from './tauriMocks';

// Mock localStorage immediately (before any module imports)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  // Clear localStorage between tests
  localStorageMock.clear();
  // Clean up Tauri mocks
  cleanupTauriMocks();
});

// Setup Tauri mocks globally
// Mock Tauri API base objects - Tauri v2 uses __TAURI_INTERNALS__
(globalThis as any).window = (globalThis as any).window || {};

// Legacy __TAURI__ for compatibility
(globalThis as any).window.__TAURI__ = {
  invoke: async () => Promise.resolve(),
  event: {
    listen: () => Promise.resolve(() => {}),
    emit: () => Promise.resolve(),
  },
};

// Tauri v2 __TAURI_INTERNALS__ structure
(globalThis as any).window.__TAURI_INTERNALS__ = {
  invoke: async () => Promise.resolve(),
  transformCallback: () => 0,
  metadata: {
    currentWindow: { label: 'main' },
    currentWebviewWindow: { label: 'main' },
  },
};

// Initialize Tauri mock handlers (from @tauri-apps/api/mocks)
setupTauriMocks();
