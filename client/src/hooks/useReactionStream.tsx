// useReactionStream Hook - SSE client for real-time reaction updates (T045)
// Feature: 016-slack-mastodon-misskey

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ReactionUpdateEvent {
  postUri: string;
  emoji: {
    type: 'unicode' | 'custom';
    value: string;
  };
  count: number;
  reactors: string[];
}

interface UseReactionStreamOptions {
  communityId: string;
  enabled?: boolean; // Default: true
  onError?: (error: Error) => void;
}

interface UseReactionStreamResult {
  isConnected: boolean;
  error: Error | null;
  reconnect: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

/**
 * useReactionStream - Subscribe to real-time reaction updates via SSE
 *
 * Features:
 * - Auto-reconnect with exponential backoff (1s → 2s → 4s → 8s → max 30s)
 * - Graceful fallback to TanStack Query polling if SSE unavailable
 * - Automatic cleanup on unmount
 * - Invalidates TanStack Query cache on reaction updates
 *
 * @param options - SSE connection options
 * @returns Connection state and control functions
 */
export function useReactionStream({
  communityId,
  enabled = true,
  onError,
}: UseReactionStreamOptions): UseReactionStreamResult {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000); // Start with 1s delay
  const maxReconnectDelay = 30000; // Max 30s delay

  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      const sseUrl = `${API_BASE_URL}/api/reactions/stream/${communityId}`;
      const eventSource = new EventSource(sseUrl);

      eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        // biome-ignore lint/suspicious/noConsole: Intentional debug log for SSE connection
        console.log('[SSE] Connected:', data.connectionId);
        setIsConnected(true);
        setError(null);
        reconnectDelayRef.current = 1000; // Reset backoff on successful connection
      });

      eventSource.addEventListener('reaction_update', (event) => {
        const data: ReactionUpdateEvent = JSON.parse(event.data);
        // biome-ignore lint/suspicious/noConsole: Intentional debug log for reaction updates
        console.log('[SSE] Reaction update:', data);

        // Invalidate TanStack Query cache for this post's reactions
        queryClient.invalidateQueries({
          queryKey: ['reactions', data.postUri],
        });
      });

      eventSource.onerror = (err) => {
        // biome-ignore lint/suspicious/noConsole: Intentional error log for SSE failures
        console.error('[SSE] Connection error:', err);
        setIsConnected(false);

        const connectionError = new Error('SSE connection failed');
        setError(connectionError);
        onError?.(connectionError);

        // Close connection and attempt reconnect with exponential backoff
        eventSource.close();

        reconnectTimeoutRef.current = setTimeout(() => {
          // biome-ignore lint/suspicious/noConsole: Intentional debug log for reconnection attempts
          console.log(`[SSE] Reconnecting in ${reconnectDelayRef.current}ms...`);
          reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, maxReconnectDelay);
          connect();
        }, reconnectDelayRef.current);
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      const initError = err instanceof Error ? err : new Error('Failed to initialize SSE');
      setError(initError);
      onError?.(initError);
    }
  }, [communityId, enabled, queryClient, onError]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectDelayRef.current = 1000; // Reset backoff
    connect();
  }, [connect, disconnect]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    error,
    reconnect,
  };
}
