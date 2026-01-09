/**
 * AutoSaveService - Auto-save to localStorage
 */

import type { PlaygroundState, ProjectFile } from '../state';
import { store } from '../state';
import { projectFileToState, stateToProjectFile } from './ProjectService';

const STORAGE_KEY = 'playground-autosave';
const AUTOSAVE_INTERVAL = 30000; // 30 seconds

/**
 * AutoSaveService class
 */
export class AutoSaveService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastSaveTime: Date | null = null;

  constructor() {
    this.startAutoSave();
  }

  /**
   * Start auto-save interval
   */
  startAutoSave(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      const state = store.getState();
      if (state.ui.isDirty) {
        this.save();
      }
    }, AUTOSAVE_INTERVAL);

    // Also save on visibility change (before user leaves)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        const state = store.getState();
        if (state.ui.isDirty) {
          this.save();
        }
      }
    });

    // Save before unload
    window.addEventListener('beforeunload', () => {
      const state = store.getState();
      if (state.ui.isDirty) {
        this.save();
      }
    });
  }

  /**
   * Stop auto-save interval
   */
  stopAutoSave(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Save current state to localStorage
   */
  save(): boolean {
    try {
      const state = store.getState();
      const project = stateToProjectFile(state);
      const json = JSON.stringify(project);
      localStorage.setItem(STORAGE_KEY, json);
      this.lastSaveTime = new Date();
      return true;
    } catch (e) {
      console.error('Auto-save failed:', e);
      return false;
    }
  }

  /**
   * Load state from localStorage
   */
  load(): PlaygroundState | null {
    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (!json) return null;

      const project = JSON.parse(json) as ProjectFile;
      return projectFileToState(project);
    } catch (e) {
      console.error('Auto-load failed:', e);
      return null;
    }
  }

  /**
   * Check if there's saved data
   */
  hasSavedData(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  /**
   * Get last save time
   */
  getLastSaveTime(): Date | null {
    return this.lastSaveTime;
  }

  /**
   * Clear auto-saved data
   */
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.lastSaveTime = null;
  }

  /**
   * Restore from auto-save
   */
  restore(): boolean {
    const state = this.load();
    if (state) {
      store.loadFromProject(state);
      return true;
    }
    return false;
  }

  /**
   * Dispose service
   */
  dispose(): void {
    this.stopAutoSave();
  }
}

/**
 * Global auto-save service instance
 */
export const autoSaveService = new AutoSaveService();

// Re-export for convenience
export { stateToProjectFile, projectFileToState };
