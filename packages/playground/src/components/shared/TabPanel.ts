/**
 * TabPanel - Reusable tab component
 */

export interface Tab {
  id: string;
  label: string;
  icon?: string;
}

export interface TabPanelOptions {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export class TabPanel {
  private container: HTMLElement;
  private options: TabPanelOptions;

  constructor(container: HTMLElement, options: TabPanelOptions) {
    this.container = container;
    this.options = options;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.className = `tabs ${this.options.className || ''}`;

    this.options.tabs.forEach((tab) => {
      const button = document.createElement('button');
      button.className = `tab ${tab.id === this.options.activeTab ? 'active' : ''}`;
      button.dataset.tabId = tab.id;

      if (tab.icon) {
        button.innerHTML = `<span class="tab-icon">${tab.icon}</span>`;
      }
      button.innerHTML += `<span class="tab-label">${tab.label}</span>`;

      button.addEventListener('click', () => {
        this.setActiveTab(tab.id);
        this.options.onTabChange(tab.id);
      });

      this.container.appendChild(button);
    });
  }

  setActiveTab(tabId: string): void {
    this.options.activeTab = tabId;
    const buttons = this.container.querySelectorAll('.tab');
    buttons.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tab-id') === tabId);
    });
  }

  update(options: Partial<TabPanelOptions>): void {
    Object.assign(this.options, options);
    this.render();
  }
}
