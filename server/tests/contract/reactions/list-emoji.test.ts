// Contract Test: GET /api/emoji/list
// TDD: This test MUST FAIL before implementation (T016-T021)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { unstable_dev } from 'wrangler';

describe('GET /api/emoji/list', () => {
  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('should return 401 Unauthorized without auth token', async () => {
    const resp = await worker.fetch('/api/emoji/list?did=did:plc:alice');

    expect(resp.status).toBe(401);
  });

  it('should return 200 OK with empty emoji array if no emojis uploaded', async () => {
    const token = 'mock-jwt-token-member';

    const resp = await worker.fetch('/api/emoji/list?did=did:plc:newuser', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.emoji).toEqual([]);
  });

  it('should return 200 OK with list of uploaded emojis', async () => {
    const token = 'mock-jwt-token-member';

    // Upload some emojis first
    const formData1 = new FormData();
    formData1.append('shortcode', 'list_test_1');
    formData1.append('file', new Blob(['fake-image-data-1'], { type: 'image/png' }));

    await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData1,
    });

    const formData2 = new FormData();
    formData2.append('shortcode', 'list_test_2');
    formData2.append('file', new Blob(['fake-image-data-2'], { type: 'image/gif' }));

    await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData2,
    });

    // List emojis for the user
    const resp = await worker.fetch('/api/emoji/list?did=did:plc:member', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.emoji).toBeInstanceOf(Array);
    expect(data.emoji.length).toBeGreaterThan(0);

    // Check emoji structure
    const emoji = data.emoji[0];
    expect(emoji).toHaveProperty('uri');
    expect(emoji).toHaveProperty('$type', 'net.atrarium.emoji.custom');
    expect(emoji).toHaveProperty('shortcode');
    expect(emoji).toHaveProperty('blob');
    expect(emoji).toHaveProperty('creator');
    expect(emoji).toHaveProperty('uploadedAt');
    expect(emoji).toHaveProperty('format');
    expect(emoji).toHaveProperty('size');
    expect(emoji).toHaveProperty('dimensions');
    expect(emoji).toHaveProperty('animated');
  });

  it('should return emoji with correct blob structure', async () => {
    const token = 'mock-jwt-token-member';

    // Upload an emoji
    const formData = new FormData();
    formData.append('shortcode', 'blob_test');
    formData.append('file', new Blob(['fake-image-data'], { type: 'image/png' }));

    await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    // List emojis
    const resp = await worker.fetch('/api/emoji/list?did=did:plc:member', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();
    const blobTestEmoji = data.emoji.find(
      (e: { shortcode: string }) => e.shortcode === 'blob_test'
    );

    expect(blobTestEmoji?.blob).toHaveProperty('$type', 'blob');
    expect(blobTestEmoji?.blob).toHaveProperty('ref');
    expect(blobTestEmoji?.blob.ref).toHaveProperty('$link');
    expect(blobTestEmoji?.blob).toHaveProperty('mimeType');
    expect(blobTestEmoji?.blob).toHaveProperty('size');
  });

  it('should return emoji with correct dimensions structure', async () => {
    const token = 'mock-jwt-token-member';

    // Upload an emoji
    const formData = new FormData();
    formData.append('shortcode', 'dimensions_test');
    formData.append('file', new Blob(['fake-image-data'], { type: 'image/png' }));

    await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    // List emojis
    const resp = await worker.fetch('/api/emoji/list?did=did:plc:member', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();
    const dimensionsTestEmoji = data.emoji.find(
      (e: { shortcode: string }) => e.shortcode === 'dimensions_test'
    );

    expect(dimensionsTestEmoji?.dimensions).toHaveProperty('width');
    expect(dimensionsTestEmoji?.dimensions).toHaveProperty('height');
    expect(typeof dimensionsTestEmoji?.dimensions.width).toBe('number');
    expect(typeof dimensionsTestEmoji?.dimensions.height).toBe('number');
  });

  it('should return emoji with animated flag for GIFs', async () => {
    const token = 'mock-jwt-token-member';

    // Upload a GIF emoji
    const formData = new FormData();
    formData.append('shortcode', 'animated_test');
    formData.append('file', new Blob(['fake-gif-data'], { type: 'image/gif' }));

    await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    // List emojis
    const resp = await worker.fetch('/api/emoji/list?did=did:plc:member', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();
    const animatedEmoji = data.emoji.find(
      (e: { shortcode: string }) => e.shortcode === 'animated_test'
    );

    expect(animatedEmoji?.format).toBe('gif');
    expect(typeof animatedEmoji?.animated).toBe('boolean');
  });

  it('should return 400 Bad Request with missing did parameter', async () => {
    const token = 'mock-jwt-token-member';

    const resp = await worker.fetch('/api/emoji/list', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(resp.status).toBe(400);
    const data = await resp.json();
    expect(data.error).toMatch(/did/i);
  });

  it('should return 400 Bad Request with invalid did format', async () => {
    const token = 'mock-jwt-token-member';

    const resp = await worker.fetch('/api/emoji/list?did=invalid-did', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(resp.status).toBe(400);
  });

  it('should return only emojis for the specified DID', async () => {
    const token1 = 'mock-jwt-token-member1';
    const token2 = 'mock-jwt-token-member2';

    // Upload emoji as member1
    const formData1 = new FormData();
    formData1.append('shortcode', 'member1_emoji');
    formData1.append('file', new Blob(['fake-image-1'], { type: 'image/png' }));

    await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: formData1,
    });

    // Upload emoji as member2
    const formData2 = new FormData();
    formData2.append('shortcode', 'member2_emoji');
    formData2.append('file', new Blob(['fake-image-2'], { type: 'image/png' }));

    await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` },
      body: formData2,
    });

    // List emojis for member1
    const resp = await worker.fetch('/api/emoji/list?did=did:plc:member1', {
      headers: { Authorization: `Bearer ${token1}` },
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();
    const member1Emojis = data.emoji.filter(
      (e: { creator: string }) => e.creator === 'did:plc:member1'
    );
    const member2Emojis = data.emoji.filter(
      (e: { creator: string }) => e.creator === 'did:plc:member2'
    );

    expect(member1Emojis.length).toBeGreaterThan(0);
    expect(member2Emojis.length).toBe(0);
  });

  it('should sort emojis by uploadedAt descending (newest first)', async () => {
    const token = 'mock-jwt-token-member';

    // Upload multiple emojis
    const formData1 = new FormData();
    formData1.append('shortcode', 'sort_test_1');
    formData1.append('file', new Blob(['fake-image-1'], { type: 'image/png' }));
    await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData1,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const formData2 = new FormData();
    formData2.append('shortcode', 'sort_test_2');
    formData2.append('file', new Blob(['fake-image-2'], { type: 'image/png' }));
    await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData2,
    });

    // List emojis
    const resp = await worker.fetch('/api/emoji/list?did=did:plc:member', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();
    const sortTestEmojis = data.emoji.filter((e: { shortcode: string }) =>
      e.shortcode.startsWith('sort_test_')
    );

    if (sortTestEmojis.length >= 2) {
      const time1 = new Date(sortTestEmojis[0].uploadedAt).getTime();
      const time2 = new Date(sortTestEmojis[1].uploadedAt).getTime();
      expect(time1).toBeGreaterThanOrEqual(time2); // Newest first
    }
  });
});
