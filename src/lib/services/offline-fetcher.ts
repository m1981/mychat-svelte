// src/lib/services/offline-fetcher.ts
/**
 * OfflineAwareFetcher: Factory for API calls with automatic queueing
 * Wraps ApiClient; decouples stores from direct fetches
 * Stores call fetcher.createNote(data) instead of mixing logic
 */

import { api } from '$lib/api/client';
import { syncService } from './sync.service';
import type { CreateNoteDTO, UpdateNoteDTO } from '$lib/types/note';
import type { CreateHighlightDTO, UpdateHighlightDTO } from '$lib/types/highlight';
import type { CreateAttachmentDTO } from '$lib/types/attachment';
import { browser } from '$app/environment';

class OfflineAwareFetcher {
  /**
   * Generic queueing wrapper for offline ops
   */
  private queueIfOffline<T>(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    entity: string,
    entityId: string,
    data?: any
  ): Promise<T | null> {
    if (!browser) return Promise.resolve(null);

    // If online, execute immediately via ApiClient
    if (navigator.onLine) {
      return this.executeOnline(operation, entity, entityId, data);
    }

    // Offline: Queue for sync
    syncService.queueOperation(operation, entity as any, entityId, data);
    return Promise.resolve(null); // Optimistic: return null, store handles local update
  }

  private async executeOnline<T>(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    entity: string,
    entityId: string,
    data?: any
  ): Promise<T> {
    let endpoint = `/api/${entity.toLowerCase()}`;
    let method: 'POST' | 'PATCH' | 'DELETE' = 'POST';

    if (operation === 'UPDATE' || operation === 'DELETE') {
      endpoint += `/${entityId}`;
      method = operation === 'UPDATE' ? 'PATCH' : 'DELETE';
    }

    const response = await (method === 'DELETE'
      ? api.delete(endpoint)
      : api[method](endpoint, data));

    return response;
  }

  // Note operations
  async createNote(data: CreateNoteDTO): Promise<any> {
    return this.queueIfOffline('CREATE', 'NOTE', '', data);
  }

  async updateNote(noteId: string, data: UpdateNoteDTO): Promise<any> {
    return this.queueIfOffline('UPDATE', 'NOTE', noteId, data);
  }

  async deleteNote(noteId: string): Promise<any> {
    return this.queueIfOffline('DELETE', 'NOTE', noteId);
  }

  // Highlight operations
  async createHighlight(data: CreateHighlightDTO): Promise<any> {
    return this.queueIfOffline('CREATE', 'HIGHLIGHT', '', data);
  }

  async updateHighlight(highlightId: string, data: UpdateHighlightDTO): Promise<any> {
    return this.queueIfOffline('UPDATE', 'HIGHLIGHT', highlightId, data);
  }

  async deleteHighlight(highlightId: string): Promise<any> {
    return this.queueIfOffline('DELETE', 'HIGHLIGHT', highlightId);
  }

  // Attachment operations
  async createAttachment(data: CreateAttachmentDTO): Promise<any> {
    return this.queueIfOffline('CREATE', 'ATTACHMENT', '', data);
  }

  async deleteAttachment(attachmentId: string): Promise<any> {
    return this.queueIfOffline('DELETE', 'ATTACHMENT', attachmentId);
  }
}

export const offlineFetcher = new OfflineAwareFetcher();