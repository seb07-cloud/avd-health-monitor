import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { LatencyStatus, LatencyThresholds } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getLatencyStatus(
  latency: number | null,
  thresholds: LatencyThresholds
): LatencyStatus {
  if (latency === null) return 'unknown';
  if (latency <= thresholds.excellent) return 'excellent';
  if (latency <= thresholds.good) return 'good';
  if (latency <= thresholds.warning) return 'warning';
  return 'critical';
}

export function getStatusColor(status: LatencyStatus): string {
  switch (status) {
    case 'excellent':
      return 'text-green-500';
    case 'good':
      return 'text-yellow-500';
    case 'warning':
      return 'text-orange-500';
    case 'critical':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

export function getStatusBgColor(status: LatencyStatus): string {
  switch (status) {
    case 'excellent':
      return 'bg-green-500';
    case 'good':
      return 'bg-yellow-500';
    case 'warning':
      return 'bg-orange-500';
    case 'critical':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Returns a text label for the latency status.
 * This provides accessibility for colorblind users who cannot distinguish status by color alone.
 */
export function getStatusLabel(status: LatencyStatus): string {
  switch (status) {
    case 'excellent':
      return 'OK';
    case 'good':
      return 'GOOD';
    case 'warning':
      return 'WARN';
    case 'critical':
      return 'CRIT';
    default:
      return '—';
  }
}

/**
 * Returns a pattern/icon identifier for the status.
 * Can be used to add visual patterns alongside colors.
 */
export function getStatusPattern(status: LatencyStatus): string {
  switch (status) {
    case 'excellent':
      return 'checkmark'; // Checkmark pattern
    case 'good':
      return 'dash'; // Single dash
    case 'warning':
      return 'triangle'; // Warning triangle
    case 'critical':
      return 'cross'; // X pattern
    default:
      return 'question';
  }
}

/**
 * Validates a URL string for endpoint configuration.
 * Returns an error message if invalid, or null if valid.
 */
export function validateEndpointUrl(url: string): string | null {
  if (!url || url.trim() === '') {
    return 'URL is required';
  }

  const trimmedUrl = url.trim();

  // Check for protocol - if present, validate full URL
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    try {
      new URL(trimmedUrl);
      return null;
    } catch {
      return 'Invalid URL format';
    }
  }

  // For hostnames without protocol (like "westeurope.rdgateway.azure.com")
  // Basic validation: no spaces, contains at least one dot, valid characters
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
  if (!hostnameRegex.test(trimmedUrl)) {
    return 'Invalid hostname format';
  }

  if (!trimmedUrl.includes('.')) {
    return 'Hostname must include a domain (e.g., example.com)';
  }

  return null;
}

/**
 * Validates latency thresholds to ensure logical ordering.
 * Returns an object with validation errors for each field.
 */
export function validateThresholds(thresholds: LatencyThresholds): {
  excellent: string | null;
  good: string | null;
  warning: string | null;
  general: string | null;
} {
  const errors = {
    excellent: null as string | null,
    good: null as string | null,
    warning: null as string | null,
    general: null as string | null,
  };

  if (thresholds.excellent < 0) {
    errors.excellent = 'Must be non-negative';
  }

  if (thresholds.good < 0) {
    errors.good = 'Must be non-negative';
  }

  if (thresholds.warning < 0) {
    errors.warning = 'Must be non-negative';
  }

  // Check logical ordering: excellent < good < warning
  if (thresholds.excellent >= thresholds.good) {
    errors.excellent = 'Excellent must be less than Good';
    errors.good = 'Good must be greater than Excellent';
  }

  if (thresholds.good >= thresholds.warning) {
    errors.good = errors.good || 'Good must be less than Warning';
    errors.warning = 'Warning must be greater than Good';
  }

  if (thresholds.excellent >= thresholds.warning) {
    errors.general = 'Thresholds must be in order: Excellent < Good < Warning';
  }

  return errors;
}

export function formatLatency(latency: number | null): string {
  if (latency === null) return 'N/A';
  return `${latency.toFixed(1)}ms`;
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}
