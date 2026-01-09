/**
 * PlaybackControls - Animation playback controls
 */

import { store } from '../../state';
import { Icons } from '../shared/IconButton';

export interface PlaybackControlsOptions {
  container: HTMLElement;
  onSpeedChange?: (speed: number) => void;
  onPlayPause?: (playing: boolean) => void;
}

/**
 * PlaybackControls component
 */
export class PlaybackControls {
  private container: HTMLElement;
  private onSpeedChange?: (speed: number) => void;
  private onPlayPause?: (playing: boolean) => void;

  constructor(options: PlaybackControlsOptions) {
    this.container = options.container;
    this.onSpeedChange = options.onSpeedChange;
    this.onPlayPause = options.onPlayPause;
    this.render();
    this.subscribeToStore();
  }

  private render(): void {
    const state = store.getState();
    const isPlaying = state.ui.previewPlaying;
    const speed = state.ui.previewSpeed;

    this.container.innerHTML = `
      <button class="playback-btn ${isPlaying ? 'playing' : ''}" id="play-pause-btn" title="${isPlaying ? 'Pause' : 'Play'}">
        ${isPlaying ? Icons.pause : Icons.play}
      </button>
      <div class="speed-control">
        <input type="range" id="speed-slider" min="0.1" max="3" step="0.1" value="${speed}">
        <span class="speed-label" id="speed-label">${speed.toFixed(1)}x</span>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const playPauseBtn = this.container.querySelector('#play-pause-btn') as HTMLButtonElement;
    const speedSlider = this.container.querySelector('#speed-slider') as HTMLInputElement;
    const speedLabel = this.container.querySelector('#speed-label') as HTMLSpanElement;

    playPauseBtn?.addEventListener('click', () => {
      store.togglePreviewPlayback();
      const isPlaying = store.getState().ui.previewPlaying;
      this.updatePlayButton(isPlaying);
      this.onPlayPause?.(isPlaying);
    });

    speedSlider?.addEventListener('input', () => {
      const speed = parseFloat(speedSlider.value);
      store.setPreviewSpeed(speed);
      speedLabel.textContent = `${speed.toFixed(1)}x`;
      this.onSpeedChange?.(speed);
    });
  }

  private subscribeToStore(): void {
    store.on('state:changed', ({ state }) => {
      this.updatePlayButton(state.ui.previewPlaying);
      this.updateSpeedSlider(state.ui.previewSpeed);
    });
  }

  private updatePlayButton(isPlaying: boolean): void {
    const btn = this.container.querySelector('#play-pause-btn') as HTMLButtonElement;
    if (btn) {
      btn.innerHTML = isPlaying ? Icons.pause : Icons.play;
      btn.classList.toggle('playing', isPlaying);
      btn.title = isPlaying ? 'Pause' : 'Play';
    }
  }

  private updateSpeedSlider(speed: number): void {
    const slider = this.container.querySelector('#speed-slider') as HTMLInputElement;
    const label = this.container.querySelector('#speed-label') as HTMLSpanElement;
    if (slider && slider.value !== speed.toString()) {
      slider.value = speed.toString();
    }
    if (label) {
      label.textContent = `${speed.toFixed(1)}x`;
    }
  }

  /**
   * Set playing state
   */
  setPlaying(playing: boolean): void {
    store.setPreviewPlaying(playing);
    this.updatePlayButton(playing);
  }

  /**
   * Set speed
   */
  setSpeed(speed: number): void {
    store.setPreviewSpeed(speed);
    this.updateSpeedSlider(speed);
  }
}
