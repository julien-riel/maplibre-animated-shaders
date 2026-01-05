/**
 * EffectsStackPanel - Panel for managing stacked effects (Photoshop-style layers)
 */

import type { EffectId, StackedEffect, EffectStackState, GeometryType } from '../types/effectStack';

type SelectCallback = (effectId: EffectId | null) => void;
type RemoveCallback = (effectId: EffectId) => void;
type ReorderCallback = (newOrder: StackedEffect[]) => void;
type VisibilityCallback = (effectId: EffectId, visible: boolean) => void;

/**
 * Geometry icons for the effect preview
 */
const geometryIcons: Record<GeometryType, string> = {
  point: '<circle cx="8" cy="8" r="5" fill="currentColor"/>',
  line: '<line x1="2" y1="14" x2="14" y2="2" stroke="currentColor" stroke-width="2.5"/>',
  polygon: '<rect x="2" y="2" width="12" height="12" fill="currentColor" rx="1"/>',
  global: '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/>',
};

/**
 * EffectsStackPanel component
 */
export class EffectsStackPanel {
  private container: HTMLElement;
  private selectCallbacks: SelectCallback[] = [];
  private removeCallbacks: RemoveCallback[] = [];
  private reorderCallbacks: ReorderCallback[] = [];
  private visibilityCallbacks: VisibilityCallback[] = [];
  private currentState: EffectStackState | null = null;
  private draggedEffectId: EffectId | null = null;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) {
      throw new Error(`Container #${containerId} not found`);
    }
    this.container = el;
    this.renderEmpty();
  }

  /**
   * Update the panel with current stack state
   */
  update(stackState: EffectStackState): void {
    this.currentState = stackState;
    this.render();
  }

  /**
   * Select an effect programmatically
   */
  selectEffect(effectId: EffectId): void {
    if (this.currentState) {
      this.currentState.selectedEffectId = effectId;
      this.updateSelection();
      this.notifySelect(effectId);
    }
  }

  /**
   * Register callback for effect selection
   */
  onSelect(callback: SelectCallback): void {
    this.selectCallbacks.push(callback);
  }

  /**
   * Register callback for effect removal
   */
  onRemove(callback: RemoveCallback): void {
    this.removeCallbacks.push(callback);
  }

  /**
   * Register callback for effect reorder
   */
  onReorder(callback: ReorderCallback): void {
    this.reorderCallbacks.push(callback);
  }

  /**
   * Register callback for visibility toggle
   */
  onVisibilityToggle(callback: VisibilityCallback): void {
    this.visibilityCallbacks.push(callback);
  }

  /**
   * Render empty state
   */
  private renderEmpty(): void {
    this.container.innerHTML = `
      <div class="effects-stack-header">
        <h2>Active Effects</h2>
        <span class="effects-stack-count">0</span>
      </div>
      <div class="effects-stack-list">
        <div class="effects-stack-empty">
          <p>Click a shader to add it</p>
        </div>
      </div>
    `;
  }

  /**
   * Render the panel
   */
  private render(): void {
    if (!this.currentState || this.currentState.effects.length === 0) {
      this.renderEmpty();
      return;
    }

    const count = this.currentState.effects.length;
    // Reverse for display (top of stack = first in UI)
    const effectsReversed = [...this.currentState.effects].reverse();

    this.container.innerHTML = `
      <div class="effects-stack-header">
        <h2>Active Effects</h2>
        <span class="effects-stack-count">${count}</span>
      </div>
      <div class="effects-stack-list">
        ${effectsReversed.map(effect => this.renderEffectItem(effect)).join('')}
      </div>
      ${count >= 10 ? '<div class="effects-stack-warning">Performance warning: many effects active</div>' : ''}
    `;

    this.attachEventListeners();
  }

  /**
   * Render a single effect item
   */
  private renderEffectItem(effect: StackedEffect): string {
    const isSelected = this.currentState?.selectedEffectId === effect.id;
    const icon = geometryIcons[effect.geometry];

    return `
      <div class="effect-item${isSelected ? ' selected' : ''}${!effect.visible ? ' hidden-effect' : ''}"
           data-effect-id="${effect.id}"
           draggable="true">
        <div class="effect-drag-handle">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <circle cx="3" cy="3" r="1.5" fill="currentColor"/>
            <circle cx="9" cy="3" r="1.5" fill="currentColor"/>
            <circle cx="3" cy="6" r="1.5" fill="currentColor"/>
            <circle cx="9" cy="6" r="1.5" fill="currentColor"/>
            <circle cx="3" cy="9" r="1.5" fill="currentColor"/>
            <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
          </svg>
        </div>
        <button class="effect-visibility" data-visible="${effect.visible}" title="${effect.visible ? 'Hide effect' : 'Show effect'}">
          <svg width="16" height="16" viewBox="0 0 16 16">
            ${effect.visible
              ? '<path d="M8 3C4.5 3 1.5 5.5 0.5 8c1 2.5 4 5 7.5 5s6.5-2.5 7.5-5c-1-2.5-4-5-7.5-5zm0 8c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z" fill="currentColor"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/>'
              : '<path d="M13.5 2.5l-11 11M8 3C4.5 3 1.5 5.5 0.5 8c.5 1.3 1.5 2.5 2.8 3.3M5.8 10.2c.6.5 1.4.8 2.2.8 1.7 0 3-1.3 3-3 0-.8-.3-1.6-.8-2.2M8 13c3.5 0 6.5-2.5 7.5-5-.3-.8-.8-1.5-1.3-2.2" stroke="currentColor" stroke-width="1.5" fill="none"/>'
            }
          </svg>
        </button>
        <div class="effect-preview" data-geometry="${effect.geometry}">
          <svg width="16" height="16" viewBox="0 0 16 16">${icon}</svg>
        </div>
        <div class="effect-info">
          <span class="effect-name">${effect.displayName}</span>
          <span class="effect-geometry">${this.formatGeometry(effect.geometry)}</span>
        </div>
        <button class="effect-remove" title="Remove effect">
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M5 1h4M1 3h12M12 3l-.7 8.4c-.1.9-.8 1.6-1.8 1.6H4.5c-1 0-1.7-.7-1.8-1.6L2 3M5.5 6v4M8.5 6v4"
                  stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `;
  }

  /**
   * Format geometry type for display
   */
  private formatGeometry(geometry: GeometryType): string {
    const labels: Record<GeometryType, string> = {
      point: 'Points',
      line: 'Lines',
      polygon: 'Polygons',
      global: 'Global',
    };
    return labels[geometry];
  }

  /**
   * Update visual selection state
   */
  private updateSelection(): void {
    const items = this.container.querySelectorAll('.effect-item');
    items.forEach(item => {
      const effectId = item.getAttribute('data-effect-id');
      if (effectId === this.currentState?.selectedEffectId) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    const items = this.container.querySelectorAll('.effect-item');

    items.forEach(item => {
      const effectId = item.getAttribute('data-effect-id');
      if (!effectId) return;

      // Click to select
      item.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        // Don't select if clicking buttons
        if (target.closest('.effect-visibility') || target.closest('.effect-remove')) {
          return;
        }
        if (this.currentState) {
          this.currentState.selectedEffectId = effectId;
          this.updateSelection();
          this.notifySelect(effectId);
        }
      });

      // Visibility toggle
      const visibilityBtn = item.querySelector('.effect-visibility');
      visibilityBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentVisible = visibilityBtn.getAttribute('data-visible') === 'true';
        this.notifyVisibilityToggle(effectId, !currentVisible);
      });

      // Remove button
      const removeBtn = item.querySelector('.effect-remove');
      removeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.notifyRemove(effectId);
      });

      // Drag & drop
      this.attachDragListeners(item as HTMLElement, effectId);
    });
  }

  /**
   * Attach drag & drop listeners
   */
  private attachDragListeners(item: HTMLElement, effectId: EffectId): void {
    item.addEventListener('dragstart', (e) => {
      this.draggedEffectId = effectId;
      item.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', effectId);
      }
    });

    item.addEventListener('dragend', () => {
      this.draggedEffectId = null;
      item.classList.remove('dragging');
      // Remove all drag-over classes
      this.container.querySelectorAll('.effect-item').forEach(el => {
        el.classList.remove('drag-over');
      });
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (this.draggedEffectId && this.draggedEffectId !== effectId) {
        item.classList.add('drag-over');
      }
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');

      if (!this.draggedEffectId || !this.currentState) return;
      if (this.draggedEffectId === effectId) return;

      // Calculate new order
      const effects = [...this.currentState.effects];
      const draggedIndex = effects.findIndex(ef => ef.id === this.draggedEffectId);
      const targetIndex = effects.findIndex(ef => ef.id === effectId);

      if (draggedIndex === -1 || targetIndex === -1) return;

      // Move element
      const [draggedEffect] = effects.splice(draggedIndex, 1);
      // UI is reversed, so we need to account for that
      const actualTargetIndex = effects.length - 1 - (effects.length - 1 - targetIndex);

      // Insert at new position (considering UI is top-to-bottom = high-to-low index)
      if (draggedIndex < targetIndex) {
        effects.splice(targetIndex, 0, draggedEffect);
      } else {
        effects.splice(targetIndex, 0, draggedEffect);
      }

      this.notifyReorder(effects);
    });
  }

  /**
   * Notify select callbacks
   */
  private notifySelect(effectId: EffectId | null): void {
    this.selectCallbacks.forEach(cb => cb(effectId));
  }

  /**
   * Notify remove callbacks
   */
  private notifyRemove(effectId: EffectId): void {
    this.removeCallbacks.forEach(cb => cb(effectId));
  }

  /**
   * Notify reorder callbacks
   */
  private notifyReorder(newOrder: StackedEffect[]): void {
    this.reorderCallbacks.forEach(cb => cb(newOrder));
  }

  /**
   * Notify visibility toggle callbacks
   */
  private notifyVisibilityToggle(effectId: EffectId, visible: boolean): void {
    this.visibilityCallbacks.forEach(cb => cb(effectId, visible));
  }
}
