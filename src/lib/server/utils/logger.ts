import type { Chat } from '$lib/types/chat';

// In a real app, you might use a library like Pino or Winston
// For this example, a structured console logger is sufficient.

interface LogContext {
	userId?: number;
	chatId?: string;
	requestId?: string; // Useful for tracing a single request through logs
	error?: unknown;
}

class ServerLogger {
	private generateRequestId(): string {
		// A simple unique ID for the request
		return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}

	private log(level: 'INFO' | 'WARN' | 'ERROR', message: string, context: LogContext = {}) {
		const logObject = {
			timestamp: new Date().toISOString(),
			level,
			message,
			...context,
			error: context.error
				? {
						message: (context.error as Error).message,
						stack: (context.error as Error).stack,
						name: (context.error as Error).name
					}
				: undefined
		};

		// Output as a single JSON string for easy parsing by log management systems
		console.log(JSON.stringify(logObject));
	}

	info(message: string, context?: LogContext) {
		this.log('INFO', message, context);
	}

	warn(message: string, context?: LogContext) {
		this.log('WARN', message, context);
	}

	error(message: string, context?: LogContext) {
		this.log('ERROR', message, context);
	}

	// Helper to create a logger instance scoped to a specific request
	getRequestLogger(chat?: Chat, userId?: number) {
		const requestId = this.generateRequestId();
		const baseContext: LogContext = {
			requestId,
			userId: userId || chat?.userId,
			chatId: chat?.id
		};

		return {
			info: (message: string, context?: Omit<LogContext, 'requestId'>) =>
				this.info(message, { ...baseContext, ...context }),
			warn: (message: string, context?: Omit<LogContext, 'requestId'>) =>
				this.warn(message, { ...baseContext, ...context }),
			error: (message: string, context?: Omit<LogContext, 'requestId'>) =>
				this.error(message, { ...baseContext, ...context })
		};
	}
}

export const logger = new ServerLogger();