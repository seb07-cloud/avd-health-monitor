---
phase: 3-state-refactor
plan: 04
subsystem: state-management
tags: [zustand, fslogix, slice-pattern]

dependency-graph:
  requires: ["3-01"]
  provides: ["fslogixSlice", "slices-barrel-export"]
  affects: ["3-05"]

tech-stack:
  added: []
  patterns: ["zustand-slice-pattern", "map-based-status-tracking"]

key-files:
  created:
    - src/store/slices/fslogixSlice.ts
    - src/store/slices/index.ts
  modified: []

decisions:
  - key: no-cross-slice-access
    choice: "FSLogix slice is self-contained"
    rationale: "FSLogix state doesn't need config or endpoint data"

metrics:
  duration: ~1 min
  completed: 2026-01-16
---

# Phase 3 Plan 04: FSLogix Slice Summary

FSLogix slice with muted state persistence via Tauri command and barrel export for all slices.

## What Was Built

### fslogixSlice.ts (121 lines)
FSLogix storage path monitoring state and actions:

**State:**
- `fslogixPaths: FSLogixPath[]` - Storage paths from Windows Registry
- `fslogixStatuses: Map<string, FSLogixStatus>` - Path connectivity status

**Actions (5):**
1. `setFSLogixPaths(paths)` - Set paths from registry
2. `updateFSLogixStatus(pathId, reachable, latency, error)` - Update connectivity status with consecutive failure tracking
3. `setFSLogixLoading(pathId, isLoading)` - Set loading state for single path
4. `setAllFSLogixLoading(isLoading)` - Set loading state for all paths
5. `updateFSLogixPathMuted(pathId, muted)` - Toggle muted state with Tauri persistence

### slices/index.ts (4 lines)
Barrel export for store combination:
```typescript
export { createConfigSlice } from './configSlice';
export { createEndpointSlice } from './endpointSlice';
export { createFslogixSlice } from './fslogixSlice';
export { createUiSlice } from './uiSlice';
```

## Key Implementation Details

### Consecutive Failure Tracking
```typescript
const consecutiveFailures = reachable
  ? 0
  : (currentStatus?.consecutiveFailures ?? 0) + 1;
```
Used for alerting after N consecutive failures.

### Muted State Persistence
```typescript
invoke('update_fslogix_path_muted', { pathId, muted }).catch((error) => {
  console.error('[fslogixSlice] Failed to persist FSLogix muted state:', error);
});
```
Fire-and-forget persistence to settings.json via Rust backend.

### Map Operations
All status updates create new Map instances for immutability:
```typescript
const newStatuses = new Map(state.fslogixStatuses);
newStatuses.set(pathId, status);
return { fslogixStatuses: newStatuses };
```

## Commits

| Hash | Description |
|------|-------------|
| 04af2e5 | feat(3-04): create fslogixSlice for FSLogix storage monitoring |
| aa40b77 | feat(3-04): create slices barrel export |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 3-05 (Combined Store)**
- All 4 slices created and exported
- Barrel export enables single-line import
- Slice pattern consistent across all domains
