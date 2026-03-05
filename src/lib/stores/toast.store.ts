// File: src/lib/stores/toast.store.ts
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
	title?: string;
	duration?: number;
	dismissible?: boolean;
}

interface ToastOptions {
	title?: string;
	duration?: number;
	dismissible?: boolean;
}

class ToastState {
	toasts = $state<Toast[]>([]);

	private generateId() {
		return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}

	addToast(type: ToastType, message: string, options: ToastOptions = {}) {
		const id = this.generateId();
		const toast: Toast = {
			id,
			type,
			message,
			title: options.title,
			duration: options.duration ?? (type === 'error' ? 5000 : 3000),
			dismissible: options.dismissible ?? true
		};

		this.toasts.push(toast);

		if (toast.duration && toast.duration > 0) {
			setTimeout(() => {
				this.dismiss(id);
			}, toast.duration);
		}

		return id;
	}

	dismiss(id: string) {
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}

	clear() {
		this.toasts = [];
	}

	success(message: string, options?: ToastOptions) {
		return this.addToast('success', message, options);
	}

	error(message: string, options?: ToastOptions) {
		return this.addToast('error', message, { ...options, duration: options?.duration ?? 5000 });
	}

	warning(message: string, options?: ToastOptions) {
		return this.addToast('warning', message, options);
	}

	info(message: string, options?: ToastOptions) {
		return this.addToast('info', message, options);
	}
}

export const toast = new ToastState();