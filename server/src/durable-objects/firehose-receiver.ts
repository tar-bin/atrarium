// FirehoseReceiver Durable Object
// Maintains WebSocket connection to Jetstream (Bluesky Firehose)
// Performs lightweight filtering and batches messages to Queue

import { DurableObject } from 'cloudflare:workers';

interface Env {
  FIREHOSE_EVENTS: Queue;
}

interface JetstreamEvent {
  did: string;
  time_us: number;
  kind: string;
  commit?: {
    record?: {
      text?: string;
      createdAt?: string;
      [key: string]: unknown;
    };
    operation: string;
    collection: string;
    rkey: string;
  };
}

export class FirehoseReceiver extends DurableObject {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private batch: JetstreamEvent[] = [];
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_SIZE = 100;
  private readonly BATCH_TIMEOUT_MS = 5000; // 5 seconds
  private readonly JETSTREAM_URL =
    'wss://jetstream.atproto.tools/subscribe?wantedCollections=app.bsky.feed.post';
  protected env: Env;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/start':
        await this.startConnection();
        return new Response(JSON.stringify({ status: 'started' }), {
          headers: { 'Content-Type': 'application/json' },
        });

      case '/stop':
        await this.stopConnection();
        return new Response(JSON.stringify({ status: 'stopped' }), {
          headers: { 'Content-Type': 'application/json' },
        });

      case '/status':
        return new Response(
          JSON.stringify({
            connected: this.ws !== null && this.ws.readyState === WebSocket.OPEN,
            batchSize: this.batch.length,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );

      default:
        return new Response('Not Found', { status: 404 });
    }
  }

  async alarm(): Promise<void> {
    // Flush batch on timeout
    await this.flushBatch();
  }

  private async startConnection(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      // Load cursor from storage
      const cursor = await this.ctx.storage.get<number>('cursor');
      const urlWithCursor = cursor ? `${this.JETSTREAM_URL}&cursor=${cursor}` : this.JETSTREAM_URL;

      this.ws = new WebSocket(urlWithCursor);

      this.ws.addEventListener('open', () => {});

      this.ws.addEventListener('message', async (event) => {
        await this.handleMessage(event.data);
      });

      this.ws.addEventListener('close', () => {
        this.scheduleReconnect();
      });

      this.ws.addEventListener('error', (_error) => {});
    } catch (_error) {
      this.scheduleReconnect();
    }
  }

  private async stopConnection(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Flush remaining batch
    await this.flushBatch();
  }

  private async handleMessage(data: string): Promise<void> {
    try {
      const event = JSON.parse(data) as JetstreamEvent;

      // Update cursor
      if (event.time_us) {
        await this.ctx.storage.put('cursor', event.time_us);
      }

      // Lightweight filter: Check if post text contains '#atrarium_'
      if (
        event.kind === 'commit' &&
        event.commit?.operation === 'create' &&
        event.commit?.collection === 'app.bsky.feed.post' &&
        event.commit?.record?.text?.includes('#atrarium_')
      ) {
        // Add to batch
        this.batch.push(event);

        // Flush if batch is full
        if (this.batch.length >= this.BATCH_SIZE) {
          await this.flushBatch();
        } else if (!this.batchTimer) {
          // Schedule batch flush
          this.batchTimer = setTimeout(async () => {
            await this.flushBatch();
          }, this.BATCH_TIMEOUT_MS);
        }
      }
    } catch (_error) {}
  }

  private async flushBatch(): Promise<void> {
    if (this.batch.length === 0) {
      return;
    }

    try {
      // Send batch to Queue
      await this.env.FIREHOSE_EVENTS.send(this.batch);

      // Clear batch
      this.batch = [];

      // Clear timer
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
        this.batchTimer = null;
      }
    } catch (_error) {
      // Keep batch for retry
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return; // Already scheduled
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.startConnection();
    }, 5000); // Reconnect after 5 seconds
  }
}
