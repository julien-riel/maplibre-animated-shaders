/**
 * PerformanceMonitor - FPS counter and performance metrics overlay
 * Displays real-time performance information on the map
 */

/**
 * PerformanceMonitor component
 */
export class PerformanceMonitor {
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private fps: number = 0;
  private rafId: number | null = null;
  private isRunning: boolean = false;
  private fpsHistory: number[] = [];
  private maxHistory: number = 60;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) {
      throw new Error(`Container #${containerId} not found`);
    }
    this.container = el;
    this.createElement();
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Create the monitor element
   */
  private createElement(): void {
    this.element = document.createElement('div');
    this.element.className = 'perf-monitor';
    this.element.innerHTML = `
      <div class="perf-fps">-- FPS</div>
      <div class="perf-detail">Frame time: --ms</div>
    `;
    this.container.appendChild(this.element);
  }

  /**
   * Animation frame tick
   */
  private tick(): void {
    if (!this.isRunning) return;

    this.frameCount++;
    const currentTime = performance.now();
    const elapsed = currentTime - this.lastTime;

    // Update FPS every 500ms
    if (elapsed >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastTime = currentTime;

      // Track history
      this.fpsHistory.push(this.fps);
      if (this.fpsHistory.length > this.maxHistory) {
        this.fpsHistory.shift();
      }

      this.updateDisplay();
    }

    this.rafId = requestAnimationFrame(() => this.tick());
  }

  /**
   * Update the display
   */
  private updateDisplay(): void {
    if (!this.element) return;

    const fpsElement = this.element.querySelector('.perf-fps');
    const detailElement = this.element.querySelector('.perf-detail');

    if (fpsElement) {
      fpsElement.textContent = `${this.fps} FPS`;
      fpsElement.className = 'perf-fps ' + this.getFPSClass();
    }

    if (detailElement) {
      const frameTime = this.fps > 0 ? (1000 / this.fps).toFixed(1) : '--';
      const avgFps = this.getAverageFPS();
      detailElement.textContent = `${frameTime}ms | avg: ${avgFps} FPS`;
    }
  }

  /**
   * Get CSS class based on FPS
   */
  private getFPSClass(): string {
    if (this.fps >= 50) return '';
    if (this.fps >= 30) return 'warning';
    return 'critical';
  }

  /**
   * Get average FPS from history
   */
  private getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.fpsHistory.length);
  }

  /**
   * Get current metrics
   */
  getMetrics(): { fps: number; avgFps: number; frameTime: number } {
    return {
      fps: this.fps,
      avgFps: this.getAverageFPS(),
      frameTime: this.fps > 0 ? 1000 / this.fps : 0,
    };
  }

  /**
   * Destroy the monitor
   */
  destroy(): void {
    this.stop();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
