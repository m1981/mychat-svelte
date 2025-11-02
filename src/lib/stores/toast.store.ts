import { writable } from 'svelte/store';

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

// Store for active toasts
function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	// Generate unique ID for each toast
	const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

	// Add a toast to the queue
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

		update((toasts) => [...toasts, toast]);

		// Auto-dismiss after duration
		if (toast.duration && toast.duration > 0) {
			setTimeout(() => {
				dismissToast(id);
			}, toast.duration);
		}

		return id;
	}

	// Remove a toast by ID
	function dismissToast(id: string) {
		update((toasts) => toasts.filter((t) => t.id !== id));
	}

	// Clear all toasts
	function clearAll() {
		update(() => []);
	}

	// Convenience methods for each type
	function success(message: string, options?: ToastOptions) {
		return addToast('success', message, options);
	}

	function error(message: string, options?: ToastOptions) {
		return addToast('error', message, { ...options, duration: options?.duration ?? 5000 });
	}

	function warning(message: string, options?: ToastOptions) {
		return addToast('warning', message, options);
	}

	function info(message: string, options?: ToastOptions) {
		return addToast('info', message, options);
	}

	// Promise-based helper for async operations
	async function promise<T>(
		promise: Promise<T>,
		messages: {
			loading: string;
			success: string | ((data: T) => string);
			error: string | ((error: Error) => string);
		}
	): Promise<T> {
		const loadingId = info(messages.loading, { duration: 0, dismissible: false });

		try {
			const data = await promise;
			dismissToast(loadingId);

			const successMsg =
				typeof messages.success === 'function' ? messages.success(data) : messages.success;
			success(successMsg);

			return data;
		} catch (err) {
			dismissToast(loadingId);

			const errorMsg =
				typeof messages.error === 'function'
					? messages.error(err as Error)
					: messages.error;
			error(errorMsg);

			throw err;
		}
	}

	return {
		subscribe,
		success,
		error,
		warning,
		info,
		dismiss: dismissToast,
		clear: clearAll,
		promise
	};
}

export const toast = createToastStore();