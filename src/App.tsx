import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Activity, Settings, Play, Pause, RotateCw, Loader2, FileEdit } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from './store/useAppStore';
import { Dashboard } from './components/Dashboard';
import { SettingsPanel } from './components/SettingsPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { cn } from './lib/utils';
import { useTrayIcon } from './hooks/useTrayIcon';
import { useSettingsSync } from './hooks/useSettingsSync';
import { testMultipleEndpoints } from './services/latencyService';

function AppContent() {
  const {
    currentView,
    setCurrentView,
    isMonitoring,
    isPaused,
    setMonitoring,
    setPaused,
    endpoints,
    config,
    updateLatency,
    endpointStatuses,
    setAllEndpointsLoading,
  } = useAppStore();

  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isTesting, setIsTesting] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');

  // Request deduplication: track if a test is currently in progress
  const isTestingRef = useRef(false);
  // Track if initial test has been run after endpoints are loaded
  const hasRunInitialTest = useRef(false);

  // Calculate average latency across all endpoints
  const averageLatency = useMemo(() => {
    const latencies = Array.from(endpointStatuses.values())
      .map((status) => status.currentLatency)
      .filter((lat): lat is number => lat !== null && lat > 0);

    if (latencies.length === 0) return null;
    return latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
  }, [endpointStatuses]);

  // Use tray icon hook for dynamic icon updates and notifications
  useTrayIcon({
    averageLatency,
    thresholds: config.thresholds,
    notificationsEnabled: config.notificationsEnabled,
    endpointStatuses, // Pass endpoint statuses for detailed notifications
    alertThreshold: config.alertThreshold, // Consecutive checks before notification
    alertCooldown: config.alertCooldown, // Minutes between repeated alerts
  });

  // Use settings sync hook to load settings from JSON on startup and watch for changes
  useSettingsSync();

  // Open settings.json in default editor
  const handleOpenSettingsFile = useCallback(async () => {
    try {
      await invoke('open_settings_file');
    } catch (error) {
      console.error('Failed to open settings file:', error);
    }
  }, []);

  // Apply theme
  useEffect(() => {
    if (config.theme === 'system') {
      // Detect system theme
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(isDark ? 'dark' : 'light');
    } else {
      setTheme(config.theme);
    }
  }, [config.theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Start monitoring on component mount
  useEffect(() => {
    setMonitoring(true);
  }, [setMonitoring]);

  // Fetch app version from Tauri
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const version = await invoke<string>('get_app_version');
        setAppVersion(version);
      } catch (error) {
        console.error('Failed to get app version:', error);
        setAppVersion('unknown');
      }
    };
    fetchVersion();
  }, []);

  // Parallelized latency testing function with deduplication
  // Uses fresh state from the store to avoid stale closure issues after mode switch
  const runTests = useCallback(async () => {
    // Prevent overlapping requests
    if (isTestingRef.current) {
      console.log('Test already in progress, skipping...');
      return;
    }

    // Get fresh endpoints from store to avoid stale closure after mode switch
    const currentEndpoints = useAppStore.getState().endpoints;
    const enabledEndpoints = currentEndpoints.filter((e) => e.enabled);
    if (enabledEndpoints.length === 0) {
      console.log('[App] No enabled endpoints to test');
      return;
    }

    isTestingRef.current = true;
    setIsTesting(true);
    setAllEndpointsLoading(true);

    try {
      // Test all endpoints in parallel using the latency service
      const results = await testMultipleEndpoints(enabledEndpoints);

      // Process results - pass error for proper error message handling
      results.forEach((result) => {
        if (result.success) {
          updateLatency(result.endpointId, result.latency, true);
        } else {
          console.error(`Failed to test endpoint ${result.endpointId}:`, result.error);
          // Pass the error through so the store can create proper error messages
          updateLatency(result.endpointId, 0, false, result.error);
        }
      });
    } catch (error) {
      // Handle unexpected errors during testing
      console.error('Unexpected error during latency tests:', error);
      // Mark all endpoints as failed
      enabledEndpoints.forEach((endpoint) => {
        updateLatency(endpoint.id, 0, false, error);
      });
    } finally {
      isTestingRef.current = false;
      setIsTesting(false);
      setAllEndpointsLoading(false);
    }
  }, [updateLatency, setAllEndpointsLoading]);
  // Log directory info on startup
  useEffect(() => {
    const logDirectoryInfo = async () => {
      try {
        const logDir = await invoke<string>('get_log_directory');
        console.log(`📁 Latency logs are saved to: ${logDir}`);
      } catch (error) {
        console.error('Failed to get log directory:', error);
      }
    };
    logDirectoryInfo();
  }, []);

  // Run initial test when endpoints are first loaded
  // This ensures tests run immediately on app startup, regardless of the test interval
  useEffect(() => {
    const enabledEndpoints = endpoints.filter((e) => e.enabled);

    // Only run once when we have real endpoints loaded (more than the default)
    if (!hasRunInitialTest.current && enabledEndpoints.length > 1 && isMonitoring && !isPaused) {
      hasRunInitialTest.current = true;
      console.log('[App] Running initial test for', enabledEndpoints.length, 'endpoints');
      runTests();
    }
  }, [endpoints.length, isMonitoring, isPaused, runTests]);

  // Latency testing loop (runs on interval after initial test)
  useEffect(() => {
    if (!isMonitoring || isPaused) return;

    // Set up the interval for subsequent tests
    const interval = setInterval(runTests, config.testInterval * 1000);

    return () => clearInterval(interval);
  }, [isMonitoring, isPaused, config.testInterval, runTests]);

  // Watch for pending test trigger (e.g., after mode switch)
  // Use Zustand subscribe to avoid React re-render timing issues
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(
      (state, prevState) => {
        // Check if pendingTestTrigger changed from false to true
        if (state.pendingTestTrigger && !prevState.pendingTestTrigger) {
          // Clear the trigger immediately
          useAppStore.getState().clearTestTrigger();
          // Small delay to ensure endpoints are fully loaded in the store
          setTimeout(() => {
            runTests();
          }, 100);
        }
      }
    );
    return () => unsubscribe();
  }, [runTests]);

  const handleTestNow = useCallback(() => {
    runTests();
  }, [runTests]);

  // Listen for tray menu events
  useEffect(() => {
    const handleTrayPause = () => {
      // Get fresh isPaused value from store to avoid stale closure
      const currentIsPaused = useAppStore.getState().isPaused;
      setPaused(!currentIsPaused);
    };

    const handleTrayTest = () => {
      runTests();
    };

    const handleTraySettings = () => {
      setCurrentView('settings');
    };

    window.addEventListener('tray-pause', handleTrayPause);
    window.addEventListener('tray-test', handleTrayTest);
    window.addEventListener('tray-settings', handleTraySettings);

    return () => {
      window.removeEventListener('tray-pause', handleTrayPause);
      window.removeEventListener('tray-test', handleTrayTest);
      window.removeEventListener('tray-settings', handleTraySettings);
    };
  }, [setPaused, runTests, setCurrentView]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-500 p-2 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  AVD Health Monitor
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Monitoring Controls */}
              <button
                onClick={() => setPaused(!isPaused)}
                className={cn(
                  'px-3 py-2 rounded-lg transition-colors flex items-center gap-2',
                  isPaused
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                )}
                title={isPaused ? 'Resume Monitoring' : 'Pause Monitoring'}
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4" />
                    <span className="text-sm font-medium">Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4" />
                    <span className="text-sm font-medium">Pause</span>
                  </>
                )}
              </button>

              <button
                onClick={handleTestNow}
                disabled={isTesting}
                className={cn(
                  'p-2 rounded-lg transition-colors flex items-center gap-2',
                  isTesting
                    ? 'bg-blue-400 cursor-not-allowed text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                )}
                title={isTesting ? 'Testing...' : 'Test Now'}
              >
                {isTesting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <RotateCw className="w-5 h-5" />
                )}
              </button>

              {/* Separator */}
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

              {/* Settings Group */}
              <button
                onClick={() =>
                  setCurrentView(currentView === 'dashboard' ? 'settings' : 'dashboard')
                }
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  currentView === 'settings'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                )}
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* Open Settings File in Editor */}
              <button
                onClick={handleOpenSettingsFile}
                className="p-2 rounded-lg transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                title="Open Settings File in Editor"
              >
                <FileEdit className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'dashboard' ? <Dashboard /> : <SettingsPanel />}
      </main>

      {/* Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            {/* Mode indicator */}
            <span className="text-gray-600 dark:text-gray-400">
              Mode:{' '}
              <span className="font-semibold text-primary-500">
                {config.mode === 'sessionhost' ? 'Session Host' : 'End User'}
              </span>
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              Status:{' '}
              <span
                className={cn(
                  'font-semibold',
                  isTesting
                    ? 'text-blue-500'
                    : isPaused
                    ? 'text-yellow-500'
                    : 'text-green-500'
                )}
              >
                {isTesting ? 'Testing...' : isPaused ? 'Paused' : 'Monitoring'}
              </span>
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              Interval: {config.testInterval}s
            </span>
          </div>
          <span className="text-gray-500 dark:text-gray-500 text-xs">
            {appVersion ? `v${appVersion}` : ''}
          </span>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to console for debugging
        console.error('[App] Uncaught error:', error);
        console.error('[App] Component stack:', errorInfo.componentStack);
      }}
    >
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
