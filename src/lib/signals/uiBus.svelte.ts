// src/lib/signals/uiBus.svelte.ts
import { getModalStore, getToastStore, getDrawerStore } from '@skeletonlabs/skeleton';
import type { ModalSettings, ToastSettings, DrawerSettings } from '@skeletonlabs/skeleton';

type UIEvents = {
  'ui:modal:open': ModalSettings;
  'ui:toast:show': ToastSettings;
  'ui:drawer:open': DrawerSettings;
  'ui:confirm': { message: string; onConfirm: () => void };
};

class UIBus extends SignalBus<UIEvents> {
  #modalStore = getModalStore();
  #toastStore = getToastStore();
  #drawerStore = getDrawerStore();

  constructor() {
    super();
    this.#setupListeners();
  }

  #setupListeners() {
    this.on('ui:modal:open', (settings) => {
      this.#modalStore.trigger(settings);
    });

    this.on('ui:toast:show', (settings) => {
      this.#toastStore.trigger(settings);
    });

    this.on('ui:drawer:open', (settings) => {
      this.#drawerStore.open(settings);
    });
  }

  // Convenience methods
  showToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    this.emit('ui:toast:show', {
      message,
      background: `variant-filled-${type}`,
      autohide: true,
      timeout: 3000
    });
  }

  async confirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.#modalStore.trigger({
        type: 'confirm',
        title: 'Confirm',
        body: message,
        response: (confirmed: boolean) => resolve(confirmed)
      });
    });
  }
}

export const uiBus = new UIBus();