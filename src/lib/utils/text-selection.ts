/**
 * Utility functions for text selection and highlighting
 */

export interface SelectionInfo {
	text: string;
	startOffset: number;
	endOffset: number;
	containerElement: HTMLElement | null;
}

/**
 * Get information about the current text selection
 */
export function getSelectionInfo(): SelectionInfo | null {
	const selection = window.getSelection();

	if (!selection || selection.rangeCount === 0) {
		return null;
	}

	const range = selection.getRangeAt(0);
	const text = range.toString().trim();

	if (!text) {
		return null;
	}

	// Get the container element (should be a message element)
	const container = range.commonAncestorContainer;
	const containerElement = container.nodeType === Node.TEXT_NODE
		? (container.parentElement as HTMLElement)
		: (container as HTMLElement);

	// Find the message container (element with data-message-id attribute)
	const messageElement = containerElement.closest('[data-message-id]') as HTMLElement | null;

	if (!messageElement) {
		return null;
	}

	// Calculate offsets relative to the message text content
	const messageText = messageElement.textContent || '';
	const selectedText = text;

	// Find the start offset in the message text
	const beforeRange = range.cloneRange();
	beforeRange.selectNodeContents(messageElement);
	beforeRange.setEnd(range.startContainer, range.startOffset);
	const startOffset = beforeRange.toString().length;

	return {
		text: selectedText,
		startOffset,
		endOffset: startOffset + selectedText.length,
		containerElement: messageElement
	};
}

/**
 * Create a highlight span element
 */
export function createHighlightElement(text: string, color: string = '#FFFF00'): HTMLSpanElement {
	const span = document.createElement('span');
	span.className = 'highlight';
	span.style.backgroundColor = color;
	span.style.padding = '2px 0';
	span.style.borderRadius = '2px';
	span.textContent = text;
	return span;
}

/**
 * Apply highlight to a range in an element
 */
export function applyHighlight(
	element: HTMLElement,
	startOffset: number,
	endOffset: number,
	color: string = '#FFFF00',
	highlightId?: string
): boolean {
	try {
		const textContent = element.textContent || '';

		if (startOffset >= textContent.length || endOffset > textContent.length) {
			return false;
		}

		// Create a range for the highlight
		const range = document.createRange();
		let currentOffset = 0;
		let startNode: Node | null = null;
		let startNodeOffset = 0;
		let endNode: Node | null = null;
		let endNodeOffset = 0;

		// Find the start and end text nodes
		const walker = document.createTreeWalker(
			element,
			NodeFilter.SHOW_TEXT,
			null
		);

		let node: Node | null;
		while ((node = walker.nextNode())) {
			const nodeLength = node.textContent?.length || 0;

			if (!startNode && currentOffset + nodeLength > startOffset) {
				startNode = node;
				startNodeOffset = startOffset - currentOffset;
			}

			if (currentOffset + nodeLength >= endOffset) {
				endNode = node;
				endNodeOffset = endOffset - currentOffset;
				break;
			}

			currentOffset += nodeLength;
		}

		if (!startNode || !endNode) {
			return false;
		}

		// Set the range
		range.setStart(startNode, startNodeOffset);
		range.setEnd(endNode, endNodeOffset);

		// Create highlight span
		const highlightSpan = document.createElement('span');
		highlightSpan.className = 'highlight';
		highlightSpan.style.backgroundColor = color;
		highlightSpan.style.padding = '2px 0';
		highlightSpan.style.borderRadius = '2px';
		highlightSpan.style.cursor = 'pointer';

		if (highlightId) {
			highlightSpan.dataset.highlightId = highlightId;
		}

		// Wrap the range content
		range.surroundContents(highlightSpan);

		return true;
	} catch (error) {
		console.error('Error applying highlight:', error);
		return false;
	}
}

/**
 * Remove highlight from an element
 */
export function removeHighlight(highlightId: string): boolean {
	const highlights = document.querySelectorAll(`[data-highlight-id="${highlightId}"]`);

	if (highlights.length === 0) {
		return false;
	}

	highlights.forEach((highlight) => {
		const parent = highlight.parentNode;
		if (parent) {
			// Replace highlight with its text content
			const textNode = document.createTextNode(highlight.textContent || '');
			parent.replaceChild(textNode, highlight);

			// Normalize to merge adjacent text nodes
			parent.normalize();
		}
	});

	return true;
}

/**
 * Get all highlights in an element
 */
export function getHighlightsInElement(element: HTMLElement): Array<{
	id: string;
	element: HTMLElement;
}> {
	const highlights = element.querySelectorAll('[data-highlight-id]');
	return Array.from(highlights).map((highlight) => ({
		id: (highlight as HTMLElement).dataset.highlightId || '',
		element: highlight as HTMLElement
	}));
}

/**
 * Clear text selection
 */
export function clearSelection(): void {
	const selection = window.getSelection();
	if (selection) {
		selection.removeAllRanges();
	}
}

/**
 * Check if there is any text selected
 */
export function hasSelection(): boolean {
	const selection = window.getSelection();
	return !!(selection && selection.toString().trim());
}
