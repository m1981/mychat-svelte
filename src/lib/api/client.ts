// src/lib/api/client.ts

import { AppError, handleError } from '$lib/utils/error-handler';
import { toast } from '$lib/stores/toast.store';

interface RequestOptions extends RequestInit {
	showToast?: boolean;
	customErrorMessage?: string;
}

/**
 * API Client with automatic error handling
 */
class ApiClient {
	private baseUrl: string;

	constructor(baseUrl: string = '/api') {
		this.baseUrl = baseUrl;
	}

	/**
	 * Make a fetch request with error handling
	 */
	private async request<T>(
		endpoint: string,
		options: RequestOptions = {}
	): Promise<T> {
		const { showToast = true, customErrorMessage, ...fetchOptions } = options;

		const url = `${this.baseUrl}${endpoint}`;

		try {
			const response = await fetch(url, {
				...fetchOptions,
				headers: {
					'Content-Type': 'application/json',
					...fetchOptions.headers
				}
			});

			// Handle HTTP errors
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));

				throw new AppError(
					errorData.message || customErrorMessage || 'Request failed',
					errorData.code || 'API_ERROR',
					response.status,
					{ url, ...errorData }
				);
			}

			// Parse JSON response
			const data = await response.json();
			return data;
		} catch (error) {
			// Network errors or other issues
			if (error instanceof TypeError && error.message.includes('fetch')) {
				throw new AppError(
					'Network error. Please check your connection.',
					'NETWORK_ERROR',
					0,
					{ url, originalError: error }
				);
			}

			// Re-throw AppError
			if (error instanceof AppError) {
				throw error;
			}

			// Unknown errors
			throw new AppError(
				customErrorMessage || 'An unexpected error occurred',
				'UNKNOWN_ERROR',
				500,
				{ url, originalError: error }
			);
		}
	}

	/**
	 * GET request
	 */
	async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
		return this.request<T>(endpoint, { ...options, method: 'GET' });
	}

	/**
	 * POST request
	 */
	async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
		return this.request<T>(endpoint, {
			...options,
			method: 'POST',
			body: JSON.stringify(body)
		});
	}

	/**
	 * PUT request
	 */
	async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
		return this.request<T>(endpoint, {
			...options,
			method: 'PUT',
			body: JSON.stringify(body)
		});
	}

	/**
	 * PATCH request
	 */
	async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
		return this.request<T>(endpoint, {
			...options,
			method: 'PATCH',
			body: JSON.stringify(body)
		});
	}

	/**
	 * DELETE request
	 */
	async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
		return this.request<T>(endpoint, { ...options, method: 'DELETE' });
	}

	/**
	 * Upload file with progress
	 */
	async upload<T>(
		endpoint: string,
		file: File,
		onProgress?: (progress: number) => void
	): Promise<T> {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			const formData = new FormData();
			formData.append('file', file);

			// Track upload progress
			if (onProgress) {
				xhr.upload.addEventListener('progress', (e) => {
					if (e.lengthComputable) {
						const percentComplete = (e.loaded / e.total) * 100;
						onProgress(percentComplete);
					}
				});
			}

			// Handle completion
			xhr.addEventListener('load', () => {
				if (xhr.status >= 200 && xhr.status < 300) {
					try {
						const data = JSON.parse(xhr.responseText);
						resolve(data);
					} catch (error) {
						reject(new AppError('Failed to parse response', 'PARSE_ERROR'));
					}
				} else {
					reject(
						new AppError(
							'Upload failed',
							'UPLOAD_ERROR',
							xhr.status
						)
					);
				}
			});

			// Handle errors
			xhr.addEventListener('error', () => {
				reject(new AppError('Network error during upload', 'NETWORK_ERROR'));
			});

			xhr.addEventListener('abort', () => {
				reject(new AppError('Upload cancelled', 'UPLOAD_CANCELLED'));
			});

			// Send request
			xhr.open('POST', `${this.baseUrl}${endpoint}`);
			xhr.send(formData);
		});
	}
}

// Export singleton instance
export const api = new ApiClient();

/**
 * Example usage:
 *
 * // GET request
 * const chats = await api.get<Chat[]>('/chats');
 *
 * // POST request with error handling
 * try {
 *   const newChat = await api.post<Chat>('/chats', { title: 'New Chat' });
 *   toast.success('Chat created!');
 * } catch (error) {
 *   handleError(error);
 * }
 *
 * // Using with toast.promise
 * const chatPromise = api.post<Chat>('/chats', { title: 'New Chat' });
 * await toast.promise(chatPromise, {
 *   loading: 'Creating chat...',
 *   success: 'Chat created!',
 *   error: 'Failed to create chat'
 * });
 */