// Contract Test: POST /api/emoji/upload (T031)
// Validates emoji upload endpoint with file validation

import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

describe('Contract: POST /api/emoji/upload', () => {
  let authToken: string;

  beforeAll(() => {
    // Mock JWT token (in production, this would be from auth service)
    authToken = 'mock-jwt-token';
  });

  it('should upload valid PNG emoji and return URI + BlobRef', async () => {
    const mockBlob = new Blob([new Uint8Array(100000)], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', mockBlob, 'test_emoji.png');
    formData.append('shortcode', 'test_upload');

    const response = await env.WORKER.fetch('http://test/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.emojiURI).toMatch(/^at:\/\//);
    expect(result.blob.$type).toBe('blob');
    expect(result.blob.mimeType).toBe('image/png');
  });

  it('should reject oversized file (>500KB)', async () => {
    const largeBlob = new Blob([new Uint8Array(600000)], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', largeBlob, 'large.png');
    formData.append('shortcode', 'too_large');

    const response = await env.WORKER.fetch('http://test/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('exceeds 500KB limit');
  });

  it('should reject unsupported format (JPEG)', async () => {
    const jpegBlob = new Blob([new Uint8Array(50000)], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', jpegBlob, 'test.jpg');
    formData.append('shortcode', 'jpeg_test');

    const response = await env.WORKER.fetch('http://test/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('Unsupported format');
  });

  it('should reject invalid shortcode (uppercase)', async () => {
    const mockBlob = new Blob([new Uint8Array(50000)], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', mockBlob, 'test.png');
    formData.append('shortcode', 'Invalid_Name'); // Uppercase not allowed

    const response = await env.WORKER.fetch('http://test/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toBeDefined();
  });

  it('should require authentication', async () => {
    const mockBlob = new Blob([new Uint8Array(50000)], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', mockBlob, 'test.png');
    formData.append('shortcode', 'auth_test');

    const response = await env.WORKER.fetch('http://test/api/emoji/upload', {
      method: 'POST',
      // No Authorization header
      body: formData,
    });

    expect(response.status).toBe(401);
  });
});
