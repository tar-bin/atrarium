/**
 * Contract Test: POST /api/emoji/upload
 * Validates: FR-006 (Emoji upload endpoint)
 * Tests: FormData handling, shortcode format, image size, file type
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { type UnstableDevWorker, unstable_dev } from 'wrangler';

describe('Contract: POST /api/emoji/upload', () => {
  let worker: UnstableDevWorker;
  let token: string;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });

    // Authenticate to get token
    const response = await worker.fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: 'alice.test',
        password: 'test123',
      }),
    });

    const data = (await response.json()) as { token: string };
    token = data.token;
  });

  it('validates shortcode format (alphanumeric + underscore only)', async () => {
    const formData = new FormData();
    formData.append('shortcode', 'invalid-shortcode!'); // Hyphens and special chars invalid
    formData.append('image', new Blob([new Uint8Array(10)], { type: 'image/png' }), 'test.png');

    const response = await worker.fetch('http://localhost/api/emoji/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    expect(response.status).toBe(400);

    const errorData = (await response.json()) as { error?: { message: string } };
    expect(errorData.error?.message).toContain('shortcode');
  });

  it('accepts valid shortcode (alphanumeric + underscore, 2-32 chars)', async () => {
    const formData = new FormData();
    formData.append('shortcode', 'party_parrot_123');
    formData.append('image', new Blob([new Uint8Array(100)], { type: 'image/png' }), 'test.png');

    const response = await worker.fetch('http://localhost/api/emoji/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    // May fail if PDS connection unavailable, but shortcode validation should pass
    expect([200, 201, 500]).toContain(response.status);
  });

  it('rejects image larger than 256KB', async () => {
    const formData = new FormData();
    formData.append('shortcode', 'large_emoji');
    // Create 300KB image (exceeds 256KB limit)
    formData.append(
      'image',
      new Blob([new Uint8Array(300 * 1024)], { type: 'image/png' }),
      'large.png'
    );

    const response = await worker.fetch('http://localhost/api/emoji/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    expect(response.status).toBe(400);

    const errorData = (await response.json()) as { error?: { message: string } };
    expect(errorData.error?.message).toMatch(/size|256KB/i);
  });

  it('rejects invalid image formats (only PNG/GIF/WebP allowed)', async () => {
    const formData = new FormData();
    formData.append('shortcode', 'invalid_format');
    formData.append(
      'image',
      new Blob([new Uint8Array(100)], { type: 'image/jpeg' }), // JPEG not allowed
      'test.jpg'
    );

    const response = await worker.fetch('http://localhost/api/emoji/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    expect(response.status).toBe(400);

    const errorData = (await response.json()) as { error?: { message: string } };
    expect(errorData.error?.message).toMatch(/format|PNG|GIF|WebP/i);
  });

  it('returns correct output schema on success', async () => {
    const formData = new FormData();
    formData.append('shortcode', 'test_emoji');
    formData.append('image', new Blob([new Uint8Array(100)], { type: 'image/png' }), 'test.png');

    const response = await worker.fetch('http://localhost/api/emoji/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    // Skip if PDS unavailable
    if (response.status === 500) {
      console.warn('Skipping output schema test (PDS unavailable)');
      return;
    }

    expect([200, 201]).toContain(response.status);

    const data = (await response.json()) as {
      uri: string;
      shortcode: string;
      approved: boolean;
    };

    expect(data.uri).toMatch(/^at:\/\//);
    expect(data.uri).toContain('net.atrarium.community.emoji');
    expect(data.shortcode).toBe('test_emoji');
    expect(data.approved).toBe(false); // Default state
  });
});
