import { describe, it, expect } from 'vitest';
import { getLatencyStatus, formatLatency, getStatusColor, getStatusBgColor } from './utils';

describe('utils', () => {
  describe('getLatencyStatus', () => {
    const thresholds = {
      excellent: 30,
      good: 80,
      warning: 150,
    };

    it('should return excellent for low latency', () => {
      expect(getLatencyStatus(20, thresholds)).toBe('excellent');
      expect(getLatencyStatus(30, thresholds)).toBe('excellent');
    });

    it('should return good for moderate latency', () => {
      expect(getLatencyStatus(50, thresholds)).toBe('good');
      expect(getLatencyStatus(80, thresholds)).toBe('good');
    });

    it('should return warning for high latency', () => {
      expect(getLatencyStatus(100, thresholds)).toBe('warning');
      expect(getLatencyStatus(150, thresholds)).toBe('warning');
    });

    it('should return critical for very high latency', () => {
      expect(getLatencyStatus(200, thresholds)).toBe('critical');
      expect(getLatencyStatus(500, thresholds)).toBe('critical');
    });

    it('should return unknown for null latency', () => {
      expect(getLatencyStatus(null, thresholds)).toBe('unknown');
    });
  });

  describe('formatLatency', () => {
    it('should format latency with one decimal place', () => {
      expect(formatLatency(45.678)).toBe('45.7ms');
      expect(formatLatency(123.4)).toBe('123.4ms');
    });

    it('should return N/A for null', () => {
      expect(formatLatency(null)).toBe('N/A');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct color classes', () => {
      expect(getStatusColor('excellent')).toBe('text-green-500');
      expect(getStatusColor('good')).toBe('text-yellow-500');
      expect(getStatusColor('warning')).toBe('text-orange-500');
      expect(getStatusColor('critical')).toBe('text-red-500');
      expect(getStatusColor('unknown')).toBe('text-gray-500');
    });
  });

  describe('getStatusBgColor', () => {
    it('should return correct background color classes', () => {
      expect(getStatusBgColor('excellent')).toBe('bg-green-500');
      expect(getStatusBgColor('good')).toBe('bg-yellow-500');
      expect(getStatusBgColor('warning')).toBe('bg-orange-500');
      expect(getStatusBgColor('critical')).toBe('bg-red-500');
      expect(getStatusBgColor('unknown')).toBe('bg-gray-500');
    });
  });
});
