// Contract Test: POST /api/emoji/upload
// TDD: This test MUST FAIL before implementation (T016-T021)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { unstable_dev } from 'wrangler';

describe('POST /api/emoji/upload', () => {
  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('should return 401 Unauthorized without auth token', async () => {
    const formData = new FormData();
    formData.append('shortcode', 'my_emoji');
    formData.append('file', new Blob(['fake-image-data'], { type: 'image/png' }));

    const resp = await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      body: formData,
    });

    expect(resp.status).toBe(401);
  });

  it('should return 400 Bad Request with invalid image format', async () => {
    const token = 'mock-jwt-token-member'; // TODO: Generate valid JWT for member

    const formData = new FormData();
    formData.append('shortcode', 'my_emoji');
    formData.append(
      'file',
      new Blob(['fake-image-data'], { type: 'image/jpeg' }) // JPEG not supported
    );

    const resp = await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    expect(resp.status).toBe(400);
    const data = await resp.json();
    expect(data.error).toMatch(/format|type/i);
  });

  it('should return 400 Bad Request with image size exceeding 512KB', async () => {
    const token = 'mock-jwt-token-member';

    // Create a 600KB fake image
    const oversizedImage = new Uint8Array(600 * 1024);
    const formData = new FormData();
    formData.append('shortcode', 'my_emoji');
    formData.append('file', new Blob([oversizedImage], { type: 'image/png' }));

    const resp = await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    expect(resp.status).toBe(400);
    const data = await resp.json();
    expect(data.error).toMatch(/size|large/i);
  });

  it('should return 400 Bad Request with invalid shortcode format', async () => {
    const token = 'mock-jwt-token-member';

    const formData = new FormData();
    formData.append('shortcode', 'Invalid-Shortcode!'); // Must be lowercase alphanumeric + underscore
    formData.append('file', new Blob(['fake-image-data'], { type: 'image/png' }));

    const resp = await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    expect(resp.status).toBe(400);
    const data = await resp.json();
    expect(data.error).toMatch(/shortcode/i);
  });

  it('should return 400 Bad Request with shortcode length < 2 or > 32', async () => {
    const token = 'mock-jwt-token-member';

    // Too short
    const formData1 = new FormData();
    formData1.append('shortcode', 'a');
    formData1.append('file', new Blob(['fake-image-data'], { type: 'image/png' }));

    const resp1 = await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData1,
    });

    expect(resp1.status).toBe(400);

    // Too long
    const formData2 = new FormData();
    formData2.append('shortcode', 'a'.repeat(33));
    formData2.append('file', new Blob(['fake-image-data'], { type: 'image/png' }));

    const resp2 = await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData2,
    });

    expect(resp2.status).toBe(400);
  });

  it('should return 409 Conflict if shortcode already exists for user', async () => {
    const token = 'mock-jwt-token-member';

    // First upload (should succeed)
    const formData1 = new FormData();
    formData1.append('shortcode', 'duplicate_test');
    formData1.append('file', new Blob(['fake-image-data'], { type: 'image/png' }));

    await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData1,
    });

    // Duplicate upload (should fail)
    const formData2 = new FormData();
    formData2.append('shortcode', 'duplicate_test');
    formData2.append('file', new Blob(['fake-image-data-2'], { type: 'image/png' }));

    const resp = await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData2,
    });

    expect(resp.status).toBe(409);
    const data = await resp.json();
    expect(data.error).toMatch(/duplicate|exists/i);
  });

  it('should return 200 OK with emojiURI and blob on successful upload (PNG)', async () => {
    const token = 'mock-jwt-token-member';

    const formData = new FormData();
    formData.append('shortcode', 'success_png');
    formData.append('file', new Blob(['fake-png-data'], { type: 'image/png' }));

    const resp = await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.emojiURI).toMatch(
      /^at:\/\/did:(plc|web):[a-zA-Z0-9._-]+\/net\.atrarium\.emoji\.custom\/[a-zA-Z0-9]+$/
    );
    expect(data.blob).toHaveProperty('$type', 'blob');
    expect(data.blob).toHaveProperty('ref');
    expect(data.blob).toHaveProperty('mimeType', 'image/png');
    expect(data.blob).toHaveProperty('size');
  });

  it('should return 200 OK with emojiURI and blob on successful upload (GIF)', async () => {
    const token = 'mock-jwt-token-member';

    const formData = new FormData();
    formData.append('shortcode', 'success_gif');
    formData.append('file', new Blob(['fake-gif-data'], { type: 'image/gif' }));

    const resp = await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.emojiURI).toMatch(
      /^at:\/\/did:(plc|web):[a-zA-Z0-9._-]+\/net\.atrarium\.emoji\.custom\/[a-zA-Z0-9]+$/
    );
    expect(data.blob).toHaveProperty('mimeType', 'image/gif');
  });

  it('should return 200 OK with emojiURI and blob on successful upload (WebP)', async () => {
    const token = 'mock-jwt-token-member';

    const formData = new FormData();
    formData.append('shortcode', 'success_webp');
    formData.append('file', new Blob(['fake-webp-data'], { type: 'image/webp' }));

    const resp = await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.emojiURI).toMatch(
      /^at:\/\/did:(plc|web):[a-zA-Z0-9._-]+\/net\.atrarium\.emoji\.custom\/[a-zA-Z0-9]+$/
    );
    expect(data.blob).toHaveProperty('mimeType', 'image/webp');
  });

  it('should return 400 Bad Request with missing file', async () => {
    const token = 'mock-jwt-token-member';

    const formData = new FormData();
    formData.append('shortcode', 'missing_file');

    const resp = await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    expect(resp.status).toBe(400);
    const data = await resp.json();
    expect(data.error).toMatch(/file/i);
  });

  it('should return 400 Bad Request with missing shortcode', async () => {
    const token = 'mock-jwt-token-member';

    const formData = new FormData();
    formData.append('file', new Blob(['fake-image-data'], { type: 'image/png' }));

    const resp = await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    expect(resp.status).toBe(400);
    const data = await resp.json();
    expect(data.error).toMatch(/shortcode/i);
  });
});
