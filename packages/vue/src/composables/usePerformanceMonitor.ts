/**
 * usePerformanceMonitor - Composable for monitoring shader performance
 */

import { ref, watch, onUnmounted } from 'vue';
import { ProductionPerformanceMonitor, getPerformanceMonitor } from 'maplibre-animated-shaders';
import type { PerformanceMetrics } from 'maplibre-animated-shaders';
import type { UsePerformanceMonitorOptions, UsePerformanceMonitorReturn } from '../types';

/**
 * Composable for monitoring shader performance metrics
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { ref } from 'vue';
 * import { usePerformanceMonitor } from '@maplibre-animated-shaders/vue';
 *
 * const enabled = ref(true);
 * const { metrics, isMonitoring } = usePerformanceMonitor({ enabled });
 * </script>
 *
 * <template>
 *   <div v-if="metrics" class="fps-counter">
 *     {{ metrics.fps }} FPS
 *   </div>
 * </template>
 * ```
 */
export function usePerformanceMonitor(
  options: UsePerformanceMonitorOptions = {}
): UsePerformanceMonitorReturn {
  const { enabled = ref(true), updateInterval = 500, canvas } = options;

  const metrics = ref<PerformanceMetrics | null>(null);
  const isMonitoring = ref(false);

  let monitor: ProductionPerformanceMonitor | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  // Start monitoring
  const start = () => {
    if (monitor) {
      monitor.start();
      isMonitoring.value = true;

      // Set up metrics polling
      intervalId = setInterval(() => {
        if (monitor) {
          metrics.value = monitor.getMetrics();
        }
      }, updateInterval);
    }
  };

  // Stop monitoring
  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (monitor) {
      monitor.stop();
    }
    isMonitoring.value = false;
  };

  // Reset metrics
  const reset = () => {
    if (monitor) {
      monitor.reset();
      metrics.value = null;
    }
  };

  // Initialize
  const init = () => {
    monitor = getPerformanceMonitor({ updateInterval: 1000 });

    // Attach canvas if provided
    if (canvas?.value) {
      monitor.attachCanvas(canvas.value);
    }

    if (enabled.value) {
      start();
    }
  };

  // Watch enabled state
  watch(
    enabled,
    (newValue) => {
      if (newValue) {
        if (!monitor) {
          init();
        } else {
          start();
        }
      } else {
        stop();
      }
    },
    { immediate: true }
  );

  // Watch canvas ref
  watch(
    () => canvas?.value,
    (newCanvas) => {
      if (monitor && newCanvas) {
        monitor.attachCanvas(newCanvas);
      }
    }
  );

  // Cleanup on unmount
  onUnmounted(() => {
    stop();
    if (monitor) {
      monitor.detachCanvas();
    }
  });

  // Initialize immediately if enabled
  if (enabled.value) {
    init();
  }

  return {
    metrics,
    isMonitoring,
    start,
    stop,
    reset,
  };
}
