# Phase 2: Component Refactor - Research

**Researched:** 2026-01-16
**Domain:** React component architecture, TypeScript, Zustand state management
**Confidence:** HIGH

## Summary

This research addresses refactoring `SettingsPanel.tsx` (currently 1160 lines) into maintainable, single-responsibility components (target: under 300 lines). The codebase already demonstrates solid component patterns in `EndpointTile.tsx`, `EndpointCard.tsx`, and `FSLogixSection.tsx` that should be followed.

The refactoring involves extracting 5 distinct UI sections into their own components while preserving all existing functionality and the established patterns. The existing Zustand store already provides well-structured actions that child components can consume directly via selectors.

**Primary recommendation:** Extract each settings section (ModeSelector, ThresholdSettings, CustomEndpointManager, ModeEndpointList, FSLogixSettings) as self-contained components using the existing patterns, with local state for form editing and Zustand selectors for global state access.

## Standard Stack

The established libraries/tools for this domain (already in use):

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.1.0 | UI framework | Already in project, latest stable |
| TypeScript | 5.8.3 | Type safety | Already in project |
| Zustand | 5.0.9 | State management | Already in project, handles all global state |
| TailwindCSS | 3.4.19 | Styling | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.562.0 | Icons | Already used throughout components |
| clsx + tailwind-merge | 2.1.1 / 3.4.0 | Conditional classes | Via existing `cn()` utility |
| @tauri-apps/api | ^2 | Backend commands | Invoke Rust backend |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand selectors | Local context | Unnecessary - Zustand already handles this efficiently |
| Prop drilling | Context | Not needed - Zustand provides direct store access |
| Form library (react-hook-form) | Manual state | Overkill for settings forms with simple validation |

**Installation:**
No new dependencies required - refactor uses existing stack.

## Architecture Patterns

### Recommended Project Structure
```
src/components/
├── SettingsPanel.tsx           # Container: routing, layout, section headers (~250 lines)
├── settings/                   # New folder for settings sub-components
│   ├── ModeSelector.tsx        # COMP-01: Mode selection buttons (~120 lines)
│   ├── ThresholdSettings.tsx   # COMP-02: Latency threshold config (~180 lines)
│   ├── CustomEndpointManager.tsx # COMP-03: Add/edit/remove custom endpoints (~200 lines)
│   ├── ModeEndpointList.tsx    # COMP-04: Mode-specific endpoint list (~180 lines)
│   └── FSLogixSettings.tsx     # COMP-05: FSLogix monitoring config (~150 lines)
├── Dashboard.tsx               # Existing
├── EndpointCard.tsx            # Existing - reference pattern
├── EndpointTile.tsx            # Existing - reference pattern
├── FSLogixSection.tsx          # Existing - reference pattern
└── ErrorBoundary.tsx           # Existing
```

### Pattern 1: Direct Zustand Store Access (Established Pattern)
**What:** Components access store directly via `useAppStore` with selectors
**When to use:** All settings components that need global state
**Example:**
```typescript
// Source: Existing pattern from EndpointTile.tsx (lines 153-154)
export function ModeSelector() {
  const config = useAppStore((state) => state.config);
  const setConfig = useAppStore((state) => state.setConfig);
  // Component implementation
}
```

### Pattern 2: Local State for Editing (Established Pattern)
**What:** Use `useState` for form editing state, commit to store on save
**When to use:** Forms with edit/cancel patterns
**Example:**
```typescript
// Source: Existing pattern from SettingsPanel.tsx (lines 41-46)
const [editingId, setEditingId] = useState<string | null>(null);
const [editForm, setEditForm] = useState<Partial<CustomEndpoint>>({});

const startEditing = (endpoint: CustomEndpoint) => {
  setEditingId(endpoint.id);
  setEditForm({ name: endpoint.name, url: endpoint.url, port: endpoint.port });
};

const saveEdit = () => {
  if (!editingId) return;
  updateCustomEndpoint(editingId, editForm);
  setEditingId(null);
};
```

### Pattern 3: TypeScript Props Interface (Established Pattern)
**What:** Define explicit props interfaces for components
**When to use:** All components receiving props
**Example:**
```typescript
// Source: Existing pattern from EndpointTile.tsx (lines 7-10)
interface ThresholdSettingsProps {
  config: AppConfig;
  onConfigChange: (updates: Partial<AppConfig>) => void;
}

export function ThresholdSettings({ config, onConfigChange }: ThresholdSettingsProps) {
  // ...
}
```

### Pattern 4: Collapsible Section Container (Established Pattern)
**What:** Parent provides collapse/expand, children render content
**When to use:** Settings sections that can be collapsed
**Example:**
```typescript
// Source: Existing pattern from SettingsPanel.tsx (lines 351-397)
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  iconBgColor: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}
```

### Anti-Patterns to Avoid
- **Prop drilling through multiple levels:** Use Zustand selectors instead of passing callbacks through 3+ levels
- **Duplicating store logic in components:** Keep business logic in store actions, components just call actions
- **Over-abstracting small sections:** Don't create components for <50 lines of JSX unless truly reusable
- **Mixing presentation and state logic:** Keep form validation in utils, store mutations in store

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Class name conditionals | Manual string concat | `cn()` from `src/lib/utils.ts` | Handles TailwindCSS merge conflicts |
| Form validation | Custom validators | `validateEndpointUrl`, `validateThresholds` from utils | Already handles edge cases |
| Endpoint URL validation | Regex-only | Existing `validateEndpointUrl()` | Handles both URL and hostname formats |
| Status colors | Hardcoded classes | `getStatusColor()`, `getStatusBgColor()` from utils | Consistent across app |
| Threshold validation | Per-field checks | `validateThresholds()` from utils | Already validates ordering |

**Key insight:** The codebase has well-established utilities in `src/lib/utils.ts` - all new components should use these rather than reimplementing.

## Common Pitfalls

### Pitfall 1: Breaking Zustand Selector Optimization
**What goes wrong:** Using multiple selectors that return new objects on every render
**Why it happens:** Creating objects inside selectors defeats reference equality
**How to avoid:** Select primitives or use `useShallow` for object selections
**Warning signs:** Components re-render when unrelated state changes
```typescript
// BAD - creates new object every render
const state = useAppStore((state) => ({
  config: state.config,
  endpoints: state.endpoints
}));

// GOOD - select individually
const config = useAppStore((state) => state.config);
const endpoints = useAppStore((state) => state.endpoints);

// GOOD - if you need object, use useShallow
import { useShallow } from 'zustand/react/shallow';
const { config, endpoints } = useAppStore(useShallow((state) => ({
  config: state.config,
  endpoints: state.endpoints
})));
```

### Pitfall 2: Local State vs Store State Confusion
**What goes wrong:** Editing changes persisted before user clicks Save
**Why it happens:** Directly mutating store state during editing
**How to avoid:** Use local `useState` for edit forms, commit to store only on Save
**Warning signs:** Changes persist even when clicking Cancel

### Pitfall 3: Lost Form State on Re-render
**What goes wrong:** Edit form resets when parent re-renders
**Why it happens:** Local state lives in child but parent controls visibility
**How to avoid:** Keep edit state local to the editing component, not parent
**Warning signs:** Form values disappear while editing

### Pitfall 4: Import Paths After Reorganization
**What goes wrong:** Broken imports after moving components to `settings/` subfolder
**Why it happens:** Relative paths change when file location changes
**How to avoid:** Update all imports in SettingsPanel.tsx when extracting components
**Warning signs:** TypeScript errors about missing modules

### Pitfall 5: TypeScript Strict Mode Violations
**What goes wrong:** New components cause TypeScript errors
**Why it happens:** Project uses `"strict": true` - no implicit any, null checks required
**How to avoid:** Define all prop interfaces, handle null cases explicitly
**Warning signs:** TypeScript compile errors on `pnpm build`

## Code Examples

Verified patterns from existing codebase:

### Component File Structure (from EndpointTile.tsx)
```typescript
// Source: /Users/seb/Git/avd-health-monitor/src/components/EndpointTile.tsx
import { Check, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import type { Endpoint, EndpointStatus } from '../types';
import { cn, getStatusColor, getStatusBgColor } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';
import { useMemo, useState, useCallback } from 'react';

interface EndpointTileProps {
  endpoint: Endpoint;
  status?: EndpointStatus;
}

export function EndpointTile({ endpoint, status }: EndpointTileProps) {
  const updateEndpointEnabled = useAppStore((state) => state.updateEndpointEnabled);
  // ... rest of component
}
```

### Conditional Rendering with Zustand State (from FSLogixSection.tsx)
```typescript
// Source: /Users/seb/Git/avd-health-monitor/src/components/FSLogixSection.tsx
export function FSLogixSection() {
  const fslogixPaths = useAppStore((state) => state.fslogixPaths);
  const fslogixEnabled = useAppStore((state) => state.config.fslogixEnabled);
  const mode = useAppStore((state) => state.config.mode);

  // Early return pattern for conditional rendering
  if (mode !== 'sessionhost' || !fslogixEnabled || fslogixPaths.length === 0) {
    return null;
  }

  return (
    // ... render content
  );
}
```

### Form Input with Validation (from SettingsPanel.tsx)
```typescript
// Source: /Users/seb/Git/avd-health-monitor/src/components/SettingsPanel.tsx lines 544-559
<input
  type="number"
  min="0"
  value={config.thresholds.excellent}
  onChange={(e) => handleThresholdChange('excellent', e.target.value)}
  className={cn(
    'w-full px-3 py-2 bg-white dark:bg-gray-700 border rounded-lg',
    thresholdErrors.excellent
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-300 dark:border-gray-600 focus:ring-green-500'
  )}
/>
{thresholdErrors.excellent && (
  <p className="text-xs text-red-500 mt-1">{thresholdErrors.excellent}</p>
)}
```

### Toggle Switch Pattern (from SettingsPanel.tsx)
```typescript
// Source: /Users/seb/Git/avd-health-monitor/src/components/SettingsPanel.tsx lines 450-466
<button
  onClick={() => setConfig({ notificationsEnabled: !config.notificationsEnabled })}
  className={cn(
    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
    config.notificationsEnabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
  )}
>
  <span
    className={cn(
      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
      config.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
    )}
  />
</button>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class components | Function components + hooks | React 16.8 (2019) | Project already uses functions |
| Redux for all state | Zustand for client state | 2020-2024 | Project already uses Zustand 5 |
| Prop drilling | Direct store access with selectors | Zustand pattern | Already established in codebase |
| Separate validation logic | Colocated in utils.ts | Project pattern | Continue using existing utils |

**Deprecated/outdated:**
- Class components: Not used in this codebase, continue with function components
- HOCs for simple cases: Use hooks instead (custom hooks pattern)
- Redux for small-medium apps: Zustand is simpler and already in use

## Open Questions

Things that couldn't be fully resolved:

1. **Component Testing Coverage**
   - What we know: Vitest is configured, some tests exist in `src/store/useAppStore.test.ts`
   - What's unclear: Whether new settings components need dedicated tests
   - Recommendation: Tests not strictly required for this refactor phase since functionality is unchanged, but can be added later

2. **FSLogixSettings vs FSLogixSection Naming**
   - What we know: `FSLogixSection.tsx` exists for dashboard display
   - What's unclear: Whether settings component should follow same naming
   - Recommendation: Use `FSLogixSettings.tsx` to distinguish from existing dashboard component

## Sources

### Primary (HIGH confidence)
- Project codebase analysis: `/Users/seb/Git/avd-health-monitor/src/components/*.tsx`
- Project store: `/Users/seb/Git/avd-health-monitor/src/store/useAppStore.ts`
- Project types: `/Users/seb/Git/avd-health-monitor/src/types.ts`
- Project utilities: `/Users/seb/Git/avd-health-monitor/src/lib/utils.ts`

### Secondary (MEDIUM confidence)
- [React Design Patterns and Best Practices for 2025](https://www.telerik.com/blogs/react-design-patterns-best-practices)
- [Common Sense Refactoring of a Messy React Component](https://alexkondov.com/refactoring-a-messy-react-component/)
- [Zustand GitHub Repository](https://github.com/pmndrs/zustand)
- [React State Management in 2025](https://www.developerway.com/posts/react-state-management-2025)

### Tertiary (LOW confidence)
- General web search for React component patterns 2025

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Analyzed existing project dependencies and patterns
- Architecture: HIGH - Based on established codebase patterns (EndpointTile, FSLogixSection)
- Pitfalls: HIGH - Common issues identified from Zustand docs and existing code review

**Research date:** 2026-01-16
**Valid until:** 60 days (stable patterns, no breaking changes expected)

---

## Component Extraction Summary

For planner reference, here's the breakdown of SettingsPanel.tsx sections to extract:

| Section | Lines (approx) | New Component | Key State |
|---------|----------------|---------------|-----------|
| Mode Selection | 246-348 | `ModeSelector.tsx` | `config.mode`, `loadSettingsForMode()` |
| General Settings (Theme only) | 351-397 | Keep in parent | `config.theme` |
| Test Interval + Notifications | 420-502 | Keep in parent (part of ThresholdSettings) | Various config fields |
| Latency Thresholds | 522-645 | `ThresholdSettings.tsx` | `config.thresholds`, validation |
| Custom Endpoints | 647-845 | `CustomEndpointManager.tsx` | `customEndpoints`, edit state, test state |
| Mode Endpoints | 848-984 | `ModeEndpointList.tsx` | `endpoints`, edit state |
| FSLogix Settings | 989-1154 | `FSLogixSettings.tsx` | FSLogix config, paths |
| Container/Header | 231-244 | Keep in `SettingsPanel.tsx` | Navigation, section collapse state |

**Target line counts:**
- SettingsPanel.tsx: ~200-250 lines (container + general settings)
- ModeSelector.tsx: ~100-120 lines
- ThresholdSettings.tsx: ~150-180 lines
- CustomEndpointManager.tsx: ~180-200 lines
- ModeEndpointList.tsx: ~150-180 lines
- FSLogixSettings.tsx: ~130-150 lines
