import type { IAnimationLoop } from './types';

/**
 * Manages the global animation loop using requestAnimationFrame.
 * Provides time synchronization across all registered shaders.
 */
export class AnimationLoop implements IAnimationLoop {
  private shaders: Map<string, (time: number, deltaTime: number) => void> = new Map();
  private running = false;
  private animationFrameId: number | null = null;
  private globalSpeed = 1.0;
  private startTime = 0;
  private currentTime = 0;
  private lastFrameTime = 0;
  private frameInterval: number;

  constructor(targetFPS = 60) {
    this.frameInterval = 1000 / targetFPS;
  }

  /**
   * Start the animation loop
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.tick();
  }

  /**
   * Stop the animation loop
   */
  stop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Check if the loop is currently running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Add a shader update callback
   */
  addShader(id: string, updateFn: (time: number, deltaTime: number) => void): void {
    this.shaders.set(id, updateFn);
  }

  /**
   * Remove a shader update callback
   */
  removeShader(id: string): void {
    this.shaders.delete(id);
  }

  /**
   * Set global speed multiplier
   */
  setGlobalSpeed(speed: number): void {
    this.globalSpeed = Math.max(0, speed);
  }

  /**
   * Get current global time in seconds
   */
  getTime(): number {
    return this.currentTime;
  }

  /**
   * Get number of registered shaders
   */
  getShaderCount(): number {
    return this.shaders.size;
  }

  /**
   * Main animation tick
   */
  private tick = (): void => {
    if (!this.running) return;

    this.animationFrameId = requestAnimationFrame(this.tick);

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    // Throttle to target FPS
    if (elapsed < this.frameInterval) return;

    // Calculate delta time in seconds
    const deltaTime = ((elapsed * this.globalSpeed) / 1000);
    this.currentTime += deltaTime;
    this.lastFrameTime = now - (elapsed % this.frameInterval);

    // Update all registered shaders
    this.shaders.forEach((updateFn) => {
      updateFn(this.currentTime, deltaTime);
    });
  };

  /**
   * Reset the animation time
   */
  reset(): void {
    this.startTime = performance.now();
    this.currentTime = 0;
    this.lastFrameTime = this.startTime;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    this.shaders.clear();
  }
}
