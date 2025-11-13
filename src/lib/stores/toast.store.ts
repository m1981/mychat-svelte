// src/lib/stores/toast.store.ts
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

function createToastStore() {
	let toasts = $state<Toast[]>([]);

	const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

	function addToast(type: ToastType, message: string, options: ToastOptions = {}) {
		const id = generateId();
		const toast: Toast = {
			id,
			type,
			message,
			title: options.title,
			duration: options.duration ?? (type === 'error' ? 5000 : 3000),
			dismissible: options.dismissible ?? true
		};

		toasts.push(toast);

		if (toast.duration && toast.duration > 0) {
			setTimeout(() => dismiss(id), toast.duration);
		}

		return id;
	}

	function dismiss(id: string) {
		const index = toasts.findIndex((t) => t.id === id);
		if (index > -1) {
			toasts.splice(index, 1);
	}
	}

	async function promise<T>(
		promise: Promise<T>,
		messages: {
			loading: string;
			success: string | ((data: T) => string);
			error: string | ((error: Error) => string);
		}
	): Promise<T> {
		const loadingId = addToast('info', messages.loading, { duration: 0, dismissible: false });
		try {
			const data = await promise;
			dismiss(loadingId);
			const successMsg = typeof messages.success === 'function' ? messages.success(data) : messages.success;
			addToast('success', successMsg);
			return data;
		} catch (err) {
			dismiss(loadingId);
			const errorMsg = typeof messages.error === 'function' ? messages.error(err as Error) : messages.error;
			addToast('error', errorMsg);
			throw err;
		}
	}

	return {
		get toasts() {
			return toasts;
		},
		success: (message: string, options?: ToastOptions) => addToast('success', message, options),
		error: (message: string, options?: ToastOptions) => addToast('error', message, { ...options, duration: options?.duration ?? 5000 }),
		warning: (message: string, options?: ToastOptions) => addToast('warning', message, options),
		info: (message: string, options?: ToastOptions) => addToast('info', message, options),
		dismiss,
		clear: () => (toasts.length = 0),
		promise
	};
}

export const toast = createToastStore();