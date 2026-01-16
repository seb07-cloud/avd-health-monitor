import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../useAppStore';

describe('uiSlice', () => {
  beforeEach(() => {
    // Reset UI slice state to defaults
    useAppStore.setState({
      currentView: 'dashboard',
      isMonitoring: false,
      isPaused: false,
      pendingTestTrigger: false,
    });
  });

  describe('setCurrentView', () => {
    it('should switch to settings view', () => {
      const { setCurrentView } = useAppStore.getState();
      setCurrentView('settings');
      expect(useAppStore.getState().currentView).toBe('settings');
    });

    it('should switch back to dashboard view', () => {
      useAppStore.setState({ currentView: 'settings' });
      const { setCurrentView } = useAppStore.getState();
      setCurrentView('dashboard');
      expect(useAppStore.getState().currentView).toBe('dashboard');
    });
  });

  describe('setMonitoring', () => {
    it('should set monitoring to true', () => {
      const { setMonitoring } = useAppStore.getState();
      setMonitoring(true);
      expect(useAppStore.getState().isMonitoring).toBe(true);
    });

    it('should set monitoring to false', () => {
      useAppStore.setState({ isMonitoring: true });
      const { setMonitoring } = useAppStore.getState();
      setMonitoring(false);
      expect(useAppStore.getState().isMonitoring).toBe(false);
    });
  });

  describe('setPaused', () => {
    it('should set paused to true', () => {
      const { setPaused } = useAppStore.getState();
      setPaused(true);
      expect(useAppStore.getState().isPaused).toBe(true);
    });

    it('should set paused to false', () => {
      useAppStore.setState({ isPaused: true });
      const { setPaused } = useAppStore.getState();
      setPaused(false);
      expect(useAppStore.getState().isPaused).toBe(false);
    });
  });

  describe('triggerTestNow', () => {
    it('should set pendingTestTrigger to true', () => {
      const { triggerTestNow } = useAppStore.getState();
      triggerTestNow();
      expect(useAppStore.getState().pendingTestTrigger).toBe(true);
    });
  });

  describe('clearTestTrigger', () => {
    it('should set pendingTestTrigger to false', () => {
      useAppStore.setState({ pendingTestTrigger: true });
      const { clearTestTrigger } = useAppStore.getState();
      clearTestTrigger();
      expect(useAppStore.getState().pendingTestTrigger).toBe(false);
    });
  });
});
