import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../useAppStore';
import type { FSLogixPath } from '../../types';

// Mock Tauri invoke to prevent file system operations
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

// Test fixtures
const mockFSLogixPaths: FSLogixPath[] = [
  {
    id: 'profile-1',
    type: 'profile',
    path: '\\\\storageaccount.file.core.windows.net\\profiles',
    hostname: 'storageaccount.file.core.windows.net',
    port: 445,
    muted: false,
  },
  {
    id: 'odfc-1',
    type: 'odfc',
    path: '\\\\storageaccount.file.core.windows.net\\odfc',
    hostname: 'storageaccount.file.core.windows.net',
    port: 445,
    muted: false,
  },
];

describe('fslogixSlice', () => {
  beforeEach(() => {
    // Reset FSLogix slice state
    useAppStore.setState({
      fslogixPaths: [],
      fslogixStatuses: new Map(),
    });
  });

  describe('setFSLogixPaths', () => {
    it('should set array of FSLogix paths', () => {
      const { setFSLogixPaths } = useAppStore.getState();
      setFSLogixPaths(mockFSLogixPaths);

      const state = useAppStore.getState();
      expect(state.fslogixPaths).toHaveLength(2);
      expect(state.fslogixPaths[0].id).toBe('profile-1');
      expect(state.fslogixPaths[1].id).toBe('odfc-1');
    });

    it('should replace existing paths', () => {
      useAppStore.setState({ fslogixPaths: mockFSLogixPaths });

      const newPaths: FSLogixPath[] = [
        {
          id: 'new-path',
          type: 'profile',
          path: '\\\\newserver\\share',
          hostname: 'newserver',
          port: 445,
        },
      ];

      const { setFSLogixPaths } = useAppStore.getState();
      setFSLogixPaths(newPaths);

      const state = useAppStore.getState();
      expect(state.fslogixPaths).toHaveLength(1);
      expect(state.fslogixPaths[0].id).toBe('new-path');
    });
  });

  describe('updateFSLogixStatus', () => {
    beforeEach(() => {
      useAppStore.setState({ fslogixPaths: mockFSLogixPaths });
    });

    it('should create new status entry on first update', () => {
      const { updateFSLogixStatus } = useAppStore.getState();
      updateFSLogixStatus('profile-1', true, 25, null);

      const state = useAppStore.getState();
      const status = state.fslogixStatuses.get('profile-1');

      expect(status).toBeDefined();
      expect(status?.reachable).toBe(true);
      expect(status?.latency).toBe(25);
      expect(status?.error).toBeNull();
      expect(status?.isLoading).toBe(false);
      expect(status?.consecutiveFailures).toBe(0);
    });

    it('should increment consecutiveFailures on failure', () => {
      const { updateFSLogixStatus } = useAppStore.getState();

      // First failure
      updateFSLogixStatus('profile-1', false, null, 'Connection failed');
      let status = useAppStore.getState().fslogixStatuses.get('profile-1');
      expect(status?.consecutiveFailures).toBe(1);

      // Second failure
      updateFSLogixStatus('profile-1', false, null, 'Connection failed');
      status = useAppStore.getState().fslogixStatuses.get('profile-1');
      expect(status?.consecutiveFailures).toBe(2);

      // Third failure
      updateFSLogixStatus('profile-1', false, null, 'Connection failed');
      status = useAppStore.getState().fslogixStatuses.get('profile-1');
      expect(status?.consecutiveFailures).toBe(3);
    });

    it('should reset consecutiveFailures on success', () => {
      const { updateFSLogixStatus } = useAppStore.getState();

      // Simulate 3 failures
      updateFSLogixStatus('profile-1', false, null, 'Error');
      updateFSLogixStatus('profile-1', false, null, 'Error');
      updateFSLogixStatus('profile-1', false, null, 'Error');

      let status = useAppStore.getState().fslogixStatuses.get('profile-1');
      expect(status?.consecutiveFailures).toBe(3);

      // Now succeed
      updateFSLogixStatus('profile-1', true, 30, null);
      status = useAppStore.getState().fslogixStatuses.get('profile-1');
      expect(status?.consecutiveFailures).toBe(0);
      expect(status?.reachable).toBe(true);
    });

    it('should not update status for unknown path', () => {
      const { updateFSLogixStatus } = useAppStore.getState();
      updateFSLogixStatus('unknown-path', true, 25, null);

      const state = useAppStore.getState();
      expect(state.fslogixStatuses.has('unknown-path')).toBe(false);
    });
  });

  describe('setFSLogixLoading', () => {
    beforeEach(() => {
      useAppStore.setState({ fslogixPaths: mockFSLogixPaths });
    });

    it('should set isLoading for specific path', () => {
      const { setFSLogixLoading } = useAppStore.getState();
      setFSLogixLoading('profile-1', true);

      const status = useAppStore.getState().fslogixStatuses.get('profile-1');
      expect(status?.isLoading).toBe(true);
    });

    it('should create status entry if none exists', () => {
      const { setFSLogixLoading } = useAppStore.getState();
      setFSLogixLoading('profile-1', true);

      const status = useAppStore.getState().fslogixStatuses.get('profile-1');
      expect(status).toBeDefined();
      expect(status?.isLoading).toBe(true);
      expect(status?.reachable).toBe(false); // default
      expect(status?.latency).toBeNull();
    });

    it('should preserve existing status when updating isLoading', () => {
      const { updateFSLogixStatus, setFSLogixLoading } = useAppStore.getState();

      // First set some status
      updateFSLogixStatus('profile-1', true, 30, null);

      // Then set loading
      setFSLogixLoading('profile-1', true);

      const status = useAppStore.getState().fslogixStatuses.get('profile-1');
      expect(status?.isLoading).toBe(true);
      expect(status?.reachable).toBe(true); // preserved
      expect(status?.latency).toBe(30); // preserved
    });
  });

  describe('setAllFSLogixLoading', () => {
    beforeEach(() => {
      useAppStore.setState({ fslogixPaths: mockFSLogixPaths });
    });

    it('should set isLoading for all paths', () => {
      const { setAllFSLogixLoading } = useAppStore.getState();
      setAllFSLogixLoading(true);

      const state = useAppStore.getState();
      const status1 = state.fslogixStatuses.get('profile-1');
      const status2 = state.fslogixStatuses.get('odfc-1');

      expect(status1?.isLoading).toBe(true);
      expect(status2?.isLoading).toBe(true);
    });

    it('should set all to not loading', () => {
      const { setAllFSLogixLoading } = useAppStore.getState();

      // Set loading
      setAllFSLogixLoading(true);

      // Then unset
      setAllFSLogixLoading(false);

      const state = useAppStore.getState();
      const status1 = state.fslogixStatuses.get('profile-1');
      const status2 = state.fslogixStatuses.get('odfc-1');

      expect(status1?.isLoading).toBe(false);
      expect(status2?.isLoading).toBe(false);
    });
  });

  describe('updateFSLogixPathMuted', () => {
    beforeEach(() => {
      useAppStore.setState({ fslogixPaths: mockFSLogixPaths });
    });

    it('should update muted flag on path', () => {
      const { updateFSLogixPathMuted } = useAppStore.getState();
      updateFSLogixPathMuted('profile-1', true);

      const state = useAppStore.getState();
      const path = state.fslogixPaths.find((p) => p.id === 'profile-1');
      expect(path?.muted).toBe(true);
    });

    it('should also update muted in status if status exists', () => {
      const { updateFSLogixStatus, updateFSLogixPathMuted } =
        useAppStore.getState();

      // First create a status
      updateFSLogixStatus('profile-1', true, 30, null);

      // Then update muted
      updateFSLogixPathMuted('profile-1', true);

      const status = useAppStore.getState().fslogixStatuses.get('profile-1');
      expect(status?.path.muted).toBe(true);
    });

    it('should unmute path', () => {
      // Start with muted path
      useAppStore.setState({
        fslogixPaths: mockFSLogixPaths.map((p) =>
          p.id === 'profile-1' ? { ...p, muted: true } : p
        ),
      });

      const { updateFSLogixPathMuted } = useAppStore.getState();
      updateFSLogixPathMuted('profile-1', false);

      const state = useAppStore.getState();
      const path = state.fslogixPaths.find((p) => p.id === 'profile-1');
      expect(path?.muted).toBe(false);
    });
  });
});
