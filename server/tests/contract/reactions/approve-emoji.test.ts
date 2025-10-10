// Contract Test: POST /api/emoji/approve
// TDD: This test MUST FAIL before implementation (T016-T021)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { unstable_dev } from 'wrangler';

describe('POST /api/emoji/approve', () => {
  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('should return 401 Unauthorized without auth token', async () => {
    const resp = await worker.fetch('/api/communities/a1b2c3d4/emoji/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        communityId: 'a1b2c3d4',
        emojiURI: 'at://did:plc:alice/net.atrarium.emoji.custom/abc123',
        approve: true,
      }),
    });

    expect(resp.status).toBe(401);
  });

  it('should return 403 Forbidden if user is not community owner', async () => {
    const token = 'mock-jwt-token-member'; // TODO: Generate valid JWT for non-owner member

    const resp = await worker.fetch('/api/communities/a1b2c3d4/emoji/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        communityId: 'a1b2c3d4',
        emojiURI: 'at://did:plc:alice/net.atrarium.emoji.custom/abc123',
        approve: true,
      }),
    });

    expect(resp.status).toBe(403);
    const data = await resp.json();
    expect(data.error).toMatch(/owner|permission/i);
  });

  it('should return 404 Not Found if emoji does not exist', async () => {
    const token = 'mock-jwt-token-owner'; // TODO: Generate valid JWT for owner

    const resp = await worker.fetch('/api/communities/a1b2c3d4/emoji/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        communityId: 'a1b2c3d4',
        emojiURI: 'at://did:plc:alice/net.atrarium.emoji.custom/nonexistent',
        approve: true,
      }),
    });

    expect(resp.status).toBe(404);
    const data = await resp.json();
    expect(data.error).toMatch(/not found/i);
  });

  it('should return 200 OK on successful approval', async () => {
    const token = 'mock-jwt-token-owner'; // TODO: Generate valid JWT for owner

    // First, upload an emoji (as different user)
    const memberToken = 'mock-jwt-token-member';
    const uploadFormData = new FormData();
    uploadFormData.append('shortcode', 'approve_test');
    uploadFormData.append('file', new Blob(['fake-image-data'], { type: 'image/png' }));

    const uploadResp = await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}` },
      body: uploadFormData,
    });
    const uploadData = await uploadResp.json();
    const emojiURI = uploadData.emojiURI;

    // Then, approve it as owner
    const resp = await worker.fetch('/api/communities/a1b2c3d4/emoji/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        communityId: 'a1b2c3d4',
        emojiURI,
        approve: true,
      }),
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.approvalURI).toMatch(
      /^at:\/\/did:(plc|web):[a-zA-Z0-9._-]+\/net\.atrarium\.emoji\.approval\/[a-zA-Z0-9]+$/
    );
    expect(data.status).toBe('approved');
  });

  it('should return 200 OK on successful rejection', async () => {
    const token = 'mock-jwt-token-owner';

    // Upload an emoji
    const memberToken = 'mock-jwt-token-member';
    const uploadFormData = new FormData();
    uploadFormData.append('shortcode', 'reject_test');
    uploadFormData.append('file', new Blob(['fake-image-data'], { type: 'image/png' }));

    const uploadResp = await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}` },
      body: uploadFormData,
    });
    const uploadData = await uploadResp.json();
    const emojiURI = uploadData.emojiURI;

    // Reject it as owner
    const resp = await worker.fetch('/api/communities/a1b2c3d4/emoji/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        communityId: 'a1b2c3d4',
        emojiURI,
        approve: false,
        reason: 'Inappropriate content',
      }),
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.approvalURI).toMatch(
      /^at:\/\/did:(plc|web):[a-zA-Z0-9._-]+\/net\.atrarium\.emoji\.approval\/[a-zA-Z0-9]+$/
    );
    expect(data.status).toBe('rejected');
  });

  it('should return 400 Bad Request with invalid communityId format', async () => {
    const token = 'mock-jwt-token-owner';

    const resp = await worker.fetch('/api/communities/invalid-id/emoji/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        communityId: 'invalid-id', // Must be 8-char hex
        emojiURI: 'at://did:plc:alice/net.atrarium.emoji.custom/abc123',
        approve: true,
      }),
    });

    expect(resp.status).toBe(400);
  });

  it('should return 400 Bad Request with invalid emojiURI format', async () => {
    const token = 'mock-jwt-token-owner';

    const resp = await worker.fetch('/api/communities/a1b2c3d4/emoji/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        communityId: 'a1b2c3d4',
        emojiURI: 'not-a-valid-uri',
        approve: true,
      }),
    });

    expect(resp.status).toBe(400);
  });

  it('should return 400 Bad Request with missing approve field', async () => {
    const token = 'mock-jwt-token-owner';

    const resp = await worker.fetch('/api/communities/a1b2c3d4/emoji/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        communityId: 'a1b2c3d4',
        emojiURI: 'at://did:plc:alice/net.atrarium.emoji.custom/abc123',
      }),
    });

    expect(resp.status).toBe(400);
  });

  it('should accept optional reason field on rejection', async () => {
    const token = 'mock-jwt-token-owner';

    // Upload an emoji
    const memberToken = 'mock-jwt-token-member';
    const uploadFormData = new FormData();
    uploadFormData.append('shortcode', 'reason_test');
    uploadFormData.append('file', new Blob(['fake-image-data'], { type: 'image/png' }));

    const uploadResp = await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}` },
      body: uploadFormData,
    });
    const uploadData = await uploadResp.json();
    const emojiURI = uploadData.emojiURI;

    // Reject with reason
    const resp = await worker.fetch('/api/communities/a1b2c3d4/emoji/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        communityId: 'a1b2c3d4',
        emojiURI,
        approve: false,
        reason: 'Does not fit community guidelines',
      }),
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.status).toBe('rejected');
  });

  it('should return 400 Bad Request with reason exceeding 500 characters', async () => {
    const token = 'mock-jwt-token-owner';

    const resp = await worker.fetch('/api/communities/a1b2c3d4/emoji/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        communityId: 'a1b2c3d4',
        emojiURI: 'at://did:plc:alice/net.atrarium.emoji.custom/abc123',
        approve: false,
        reason: 'a'.repeat(501),
      }),
    });

    expect(resp.status).toBe(400);
  });
});
