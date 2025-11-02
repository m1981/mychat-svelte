// src/lib/utils/error-handler.ts

import { toast } from '$lib/stores/toast.store';

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
	constructor(
		message: string,
		public code?: string,
		public statusCode?: number,
		public context?: Record<string, unknown>
	) {
		super(message);
		this.name = 'AppError';
	}
}

/**
 * Error types for classification
 */
export enum ErrorType {
	NETWORK = 'NETWORK_ERROR',
	VALIDATION = 'VALIDATION_ERROR',
	AUTHENTICATION = 'AUTHENTICATION_ERROR',
	AUTHORIZATION = 'AUTHORIZATION_ERROR',
	NOT_FOUND = 'NOT_FOUND_ERROR',
	SERVER = 'SERVER_ERROR',
	UNKNOWN = 'UNKNOWN_ERROR'
}

/**
 * Classify error type
 */
export function classifyError(error: unknown): ErrorType {
	if (error instanceof AppError) {
		if (error.code === 'NETWORK_ERROR') return ErrorType.NETWORK;
		if (error.statusCode === 401) return ErrorType.AUTHENTICATION;
		if (error.statusCode === 403) return ErrorType.AUTHORIZATION;
		if (error.statusCode === 404) return ErrorType.NOT_FOUND;
		if (error.statusCode && error.statusCode >= 500) return ErrorType.SERVER;
	}

	if (error instanceof TypeError && error.message.includes('fetch')) {
		return ErrorType.NETWORK;
	}

	return ErrorType.UNKNOWN;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
	const errorType = classifyError(error);

	const messages: Record<ErrorType, string> = {
		[ErrorType.NETWORK]: 'Network error. Please check your connection and try again.',
		[ErrorType.VALIDATION]: 'Please check your input and try again.',
		[ErrorType.AUTHENTICATION]: 'Please log in to continue.',
		[ErrorType.AUTHORIZATION]: "You don't have permission to perform this action.",
		[ErrorType.NOT_FOUND]: 'The requested resource was not found.',
		[ErrorType.SERVER]: 'Server error. Please try again later.',
		[ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.'
	};

	// If it's an AppError with a message, use that
	if (error instanceof AppError && error.message) {
		return error.message;
	}

	// If it's a regular Error, use its message
	if (error instanceof Error && error.message) {
		return error.message;
	}

	// Fallback to classified error message
	return messages[errorType];
}

/**
 * Handle error with toast notification
 */
export function handleError(error: unknown, customMessage?: string): void {
	const message = customMessage || getUserFriendlyMessage(error);
	const errorType = classifyError(error);

	// Log to console in development
	if (import.meta.env.DEV) {
		console.error('Error handled:', {
			type: errorType,
			error,
			message
		});
	}

	// Show toast notification
	toast.error(message, {
		title: 'Error',
		duration: errorType === ErrorType.NETWORK ? 6000 : 5000
	});

	// Send to error tracking service (Sentry, LogRocket, etc.)
	logErrorToService(error, { type: errorType, message });
}

/**
 * Send error to external logging service
 * TODO: Integrate with Sentry, LogRocket, or other service
 */
function logErrorToService(error: unknown, context?: Record<string, unknown>): void {
	if (import.meta.env.PROD) {
		// Example: Sentry.captureException(error, { extra: context });
		console.log('Would send to error tracking service:', { error, context });
	}
}

/**
 * Async function wrapper with error handling
 */
export async function withErrorHandling<T>(
	fn: () => Promise<T>,
	options?: {
		errorMessage?: string;
		showToast?: boolean;
		onError?: (error: unknown) => void;
	}
): Promise<T | null> {
	try {
		return await fn();
	} catch (error) {
		if (options?.showToast !== false) {
			handleError(error, options?.errorMessage);
		}

		if (options?.onError) {
			options.onError(error);
		}

		return null;
	}
}

/**
 * Wrapper for functions that might throw (synchronous)
 */
export function tryCatch<T>(
	fn: () => T,
	options?: {
		errorMessage?: string;
		showToast?: boolean;
		onError?: (error: unknown) => void;
		fallback?: T;
	}
): T | null {
	try {
		return fn();
	} catch (error) {
		if (options?.showToast !== false) {
			handleError(error, options?.errorMessage);
		}

		if (options?.onError) {
			options.onError(error);
		}

		return options?.fallback ?? null;
	}
}

/**
 * Retry failed async operations
 */
export async function retryOperation<T>(
	fn: () => Promise<T>,
	options: {
		maxRetries?: number;
		delay?: number;
		exponentialBackoff?: boolean;
		onRetry?: (attempt: number, error: unknown) => void;
	} = {}
): Promise<T> {
	const { maxRetries = 3, delay = 1000, exponentialBackoff = true, onRetry } = options;

	let lastError: unknown;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			if (attempt < maxRetries) {
				if (onRetry) {
					onRetry(attempt + 1, error);
				}

				const waitTime = exponentialBackoff ? delay * Math.pow(2, attempt) : delay;
				await new Promise((resolve) => setTimeout(resolve, waitTime));
			}
		}
	}

	throw lastError;
}

/**
 * Validate and throw AppError if validation fails
 */
export function validateOrThrow(
	condition: boolean,
	message: string,
	code?: string
): asserts condition {
	if (!condition) {
		throw new AppError(message, code || ErrorType.VALIDATION, 400);
	}
}