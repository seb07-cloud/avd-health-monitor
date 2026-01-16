// Zustand mock for automatic state reset between tests
// Source: https://zustand.docs.pmnd.rs/guides/testing
import { act } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import type * as ZustandExportedTypes from 'zustand';

// Re-export everything from zustand
export * from 'zustand';

// Import actual implementations
const { create: actualCreate, createStore: actualCreateStore } =
  await vi.importActual<typeof ZustandExportedTypes>('zustand');

// Track all stores for reset
export const storeResetFns = new Set<() => void>();

// Wrapper for create() that tracks stores
const createUncurried = <T>(
  stateCreator: ZustandExportedTypes.StateCreator<T>
) => {
  const store = actualCreate(stateCreator);
  const initialState = store.getInitialState();
  storeResetFns.add(() => {
    store.setState(initialState, true);
  });
  return store;
};

// Export create function that handles both curried and uncurried forms
export const create = (<T>(
  stateCreator: ZustandExportedTypes.StateCreator<T>
) => {
  return typeof stateCreator === 'function'
    ? createUncurried(stateCreator)
    : createUncurried;
}) as typeof ZustandExportedTypes.create;

// Wrapper for createStore() that tracks stores
const createStoreUncurried = <T>(
  stateCreator: ZustandExportedTypes.StateCreator<T>
) => {
  const store = actualCreateStore(stateCreator);
  const initialState = store.getInitialState();
  storeResetFns.add(() => {
    store.setState(initialState, true);
  });
  return store;
};

// Export createStore function that handles both curried and uncurried forms
export const createStore = (<T>(
  stateCreator: ZustandExportedTypes.StateCreator<T>
) => {
  return typeof stateCreator === 'function'
    ? createStoreUncurried(stateCreator)
    : createStoreUncurried;
}) as typeof ZustandExportedTypes.createStore;

// Reset all tracked stores after each test
afterEach(() => {
  act(() => {
    storeResetFns.forEach((resetFn) => {
      resetFn();
    });
  });
});
