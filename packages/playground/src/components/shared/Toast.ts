/**
 * Toast - Notification system
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

let toastContainer: HTMLElement | null = null;

function getContainer(): HTMLElement {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast(options: ToastOptions): void {
  const { message, type = 'info', duration = 3000 } = options;

  const container = getContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

export function success(message: string): void {
  showToast({ message, type: 'success' });
}

export function error(message: string): void {
  showToast({ message, type: 'error' });
}

export function info(message: string): void {
  showToast({ message, type: 'info' });
}

export function warning(message: string): void {
  showToast({ message, type: 'warning' });
}
