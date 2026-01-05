/**
 * usePerformanceMonitor - Hook for monitoring shader performance
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  ProductionPerformanceMonitor,
  getPerformanceMonitor,
} from 'maplibre-animated-shaders';
import type { PerformanceMetrics } from 'maplibre-animated-shaders';
import type { UsePerformanceMonitorOptions, UsePerformanceMonitorReturn } from '../types';

/**
 * Hook for monitoring shader performance metrics
 *
 * @example
 * ```tsx
 * function PerformanceOverlay({ canvasRef }) {
 *   const { metrics, isMonitoring } = usePerformanceMonitor({
 *     enabled: true,
 *     canvasRef,
 *     onWarning: (type, message) => console.warn(type, message),
 *   });
 *
 *   if (!isMonitoring || !metrics) return null;
 *
 *   return (
 *     <div className="fps-counter">
 *       {metrics.fps} FPS
 *     </div>
 *   );
 * }
 * ```
 */
export function usePerformanceMonitor(
  options: UsePerformanceMonitorOptions = {}
): UsePerformanceMonitorReturn {
  const {
    enabled = true,
    updateInterval = 500,
    canvasRef,
    onMetrics,
    onWarning,
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const monitorRef = useRef<ProductionPerformanceMonitor | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize monitor
  useEffect(() => {
    if (!enabled) {
      if (monitorRef.current) {
        monitorRef.current.stop();
        setIsMonitoring(false);
      }
      return;
    }

    // Get or create monitor
    monitorRef.current = getPerformanceMonitor({
      updateInterval: 1000,
    });

    // Attach canvas if provided
    if (canvasRef?.current) {
      monitorRef.current.attachCanvas(canvasRef.current);
    }

    // Set up warning handlers
    if (onWarning) {
      monitorRef.current.on('fps-warning', (event) => {
        onWarning('fps-warning', event.message);
      });
      monitorRef.current.on('fps-critical', (event) => {
        onWarning('fps-critical', event.message);
      });
      monitorRef.current.on('context-lost', (event) => {
        onWarning('context-lost', event.message);
      });
    }

    // Start monitoring
    monitorRef.current.start();
    setIsMonitoring(true);

    // Set up metrics polling
    intervalRef.current = setInterval(() => {
      if (monitorRef.current) {
        const currentMetrics = monitorRef.current.getMetrics();
        setMetrics(currentMetrics);
        onMetrics?.(currentMetrics);
      }
    }, updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (monitorRef.current) {
        monitorRef.current.stop();
      }
      setIsMonitoring(false);
    };
  }, [enabled, updateInterval, onMetrics, onWarning]);

  // Update canvas attachment when ref changes
  useEffect(() => {
    if (monitorRef.current && canvasRef?.current) {
      monitorRef.current.attachCanvas(canvasRef.current);
    }
  }, [canvasRef?.current]);

  // Manual controls
  const start = useCallback(() => {
    if (monitorRef.current) {
      monitorRef.current.start();
      setIsMonitoring(true);
    }
  }, []);

  const stop = useCallback(() => {
    if (monitorRef.current) {
      monitorRef.current.stop();
      setIsMonitoring(false);
    }
  }, []);

  const reset = useCallback(() => {
    if (monitorRef.current) {
      monitorRef.current.reset();
      setMetrics(null);
    }
  }, []);

  return useMemo(
    () => ({
      metrics,
      isMonitoring,
      start,
      stop,
      reset,
    }),
    [metrics, isMonitoring, start, stop, reset]
  );
}
