/**
 * SaveLoadPanel - Save/Load dialog components
 */

import { store } from '../../state';
import { downloadProject, importProjectFromFile } from '../../services/ProjectService';
import * as Toast from '../shared/Toast';

export interface SaveLoadPanelOptions {
  type: 'save' | 'load';
  onClose: () => void;
}

/**
 * Create dialog overlay
 */
function createDialogOverlay(content: string, onClose: () => void): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  overlay.innerHTML = content;

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      onClose();
      overlay.remove();
    }
  });

  // Close button
  const closeBtn = overlay.querySelector('.dialog-close');
  closeBtn?.addEventListener('click', () => {
    onClose();
    overlay.remove();
  });

  document.body.appendChild(overlay);
  return overlay;
}

/**
 * Show save dialog
 */
export function showSaveDialog(): void {
  const state = store.getState();

  const content = `
    <div class="dialog">
      <div class="dialog-header">
        <h2>Save Project</h2>
        <button class="btn btn-icon dialog-close" title="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="dialog-body">
        <div class="form-field">
          <label class="form-label">Project Name</label>
          <input type="text" class="form-input" id="project-name" value="${state.metadata.name}" />
        </div>
        <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); margin-top: var(--spacing-md);">
          The project will be saved as <code>${state.metadata.name}.shader-plugin.json</code>
        </p>
      </div>
      <div class="dialog-footer">
        <button class="btn dialog-cancel">Cancel</button>
        <button class="btn btn-primary" id="save-btn">Download</button>
      </div>
    </div>
  `;

  const overlay = createDialogOverlay(content, () => {});

  // Handle save
  const saveBtn = overlay.querySelector('#save-btn');
  const nameInput = overlay.querySelector('#project-name') as HTMLInputElement;
  const cancelBtn = overlay.querySelector('.dialog-cancel');

  saveBtn?.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (name) {
      store.updateMetadata({ name });
    }
    downloadProject();
    Toast.success('Project saved successfully');
    overlay.remove();
  });

  cancelBtn?.addEventListener('click', () => {
    overlay.remove();
  });

  // Focus input
  nameInput?.focus();
  nameInput?.select();
}

/**
 * Show load dialog
 */
export function showLoadDialog(): void {
  const content = `
    <div class="dialog">
      <div class="dialog-header">
        <h2>Load Project</h2>
        <button class="btn btn-icon dialog-close" title="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="dialog-body">
        <div class="drop-zone" id="drop-zone">
          <div class="drop-zone-text">Drop a .shader-plugin.json file here</div>
          <div class="drop-zone-hint">or click to select a file</div>
        </div>
        <input type="file" id="file-input" accept=".json,.shader-plugin.json" style="display: none;" />
      </div>
      <div class="dialog-footer">
        <button class="btn dialog-cancel">Cancel</button>
      </div>
    </div>
  `;

  const overlay = createDialogOverlay(content, () => {});

  const dropZone = overlay.querySelector('#drop-zone') as HTMLElement;
  const fileInput = overlay.querySelector('#file-input') as HTMLInputElement;
  const cancelBtn = overlay.querySelector('.dialog-cancel');

  // Handle file selection
  const handleFile = async (file: File) => {
    const success = await importProjectFromFile(file);
    if (success) {
      Toast.success('Project loaded successfully');
      overlay.remove();
    } else {
      Toast.error('Failed to load project');
    }
  };

  // Click to select
  dropZone?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) {
      handleFile(file);
    }
  });

  // Drag and drop
  dropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('active');
  });

  dropZone?.addEventListener('dragleave', () => {
    dropZone.classList.remove('active');
  });

  dropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('active');
    const file = e.dataTransfer?.files[0];
    if (file) {
      handleFile(file);
    }
  });

  cancelBtn?.addEventListener('click', () => {
    overlay.remove();
  });
}

/**
 * Show new project confirmation dialog
 */
export function showNewProjectDialog(): void {
  const state = store.getState();

  if (!state.ui.isDirty) {
    store.reset();
    Toast.info('New project created');
    return;
  }

  const content = `
    <div class="dialog">
      <div class="dialog-header">
        <h2>Unsaved Changes</h2>
        <button class="btn btn-icon dialog-close" title="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="dialog-body">
        <p>You have unsaved changes. Do you want to save before creating a new project?</p>
      </div>
      <div class="dialog-footer">
        <button class="btn" id="discard-btn">Discard</button>
        <button class="btn" id="cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="save-btn">Save</button>
      </div>
    </div>
  `;

  const overlay = createDialogOverlay(content, () => {});

  const discardBtn = overlay.querySelector('#discard-btn');
  const cancelBtn = overlay.querySelector('#cancel-btn');
  const saveBtn = overlay.querySelector('#save-btn');

  discardBtn?.addEventListener('click', () => {
    store.reset();
    Toast.info('New project created');
    overlay.remove();
  });

  cancelBtn?.addEventListener('click', () => {
    overlay.remove();
  });

  saveBtn?.addEventListener('click', () => {
    downloadProject();
    store.reset();
    Toast.info('Project saved and new project created');
    overlay.remove();
  });
}
