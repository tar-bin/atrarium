import { AtpAgent } from '@atproto/api';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// import { renderMarkdown } from '../../../client/src/lib/markdown';
import { ATProtoService } from '../../src/services/atproto';
import type { Env } from '../../src/types';

/**
 * Integration test: Revoked Emoji Fallback (015-markdown-pds: T051)
 * Scenario: Create post with emoji → revoke approval → verify shortcode displays as plain text
 *
 * Requires local PDS running on localhost:3000
 *
 * Setup:
 * 1. DevContainer should start PDS automatically
 * 2. Run: bash .devcontainer/setup-pds.sh
 * 3. Run tests: pnpm test tests/integration/emoji-revoked-fallback.test.ts
 */

const PDS_URL = process.env.PDS_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds

describe.skip('Integration: Revoked Emoji Fallback', { timeout: TEST_TIMEOUT }, () => {
  let aliceAgent: AtpAgent;
  let bobAgent: AtpAgent;
  let aliceService: ATProtoService;
  let bobService: ATProtoService;
  let mockEnv: Env;

  beforeAll(async () => {
    // Health check
    const healthCheck = await fetch(`${PDS_URL}/xrpc/_health`);
    if (!healthCheck.ok) {
      throw new Error('PDS health check failed');
    }

    // Initialize agents
    aliceAgent = new AtpAgent({ service: PDS_URL });
    bobAgent = new AtpAgent({ service: PDS_URL });

    await aliceAgent.login({
      identifier: 'alice.test',
      password: 'test123',
    });

    await bobAgent.login({
      identifier: 'bob.test',
      password: 'test123',
    });

    // Mock environment
    mockEnv = {
      BLUESKY_HANDLE: 'alice.test',
      BLUESKY_APP_PASSWORD: 'test123',
      PDS_URL,
    } as Env;

    aliceService = new ATProtoService(mockEnv);
    bobService = new ATProtoService({
      ...mockEnv,
      BLUESKY_HANDLE: 'bob.test',
    } as Env);
  });

  afterAll(async () => {
    // Cleanup: delete test records if needed
  });

  it('should display shortcode as plain text when emoji approval is revoked', async () => {
    // Step 1: Alice uploads emoji
    const mockPngBlob = new Blob(
      [
        new Uint8Array([
          137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8,
          6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0,
          1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
        ]),
      ],
      { type: 'image/png' }
    );

    const blobRef = await aliceService.uploadEmojiBlob(aliceAgent, mockPngBlob);
    const emojiRecord = await aliceService.createCustomEmoji(
      aliceAgent,
      'revocable_emoji',
      blobRef,
      'png',
      mockPngBlob.size,
      { width: 1, height: 1 },
      false
    );

    // Step 2: Bob (community owner) approves emoji
    const communityId = 'abc12345';
    const approvalRecord = await bobService.createEmojiApproval(
      bobAgent,
      'revocable_emoji',
      emojiRecord.uri,
      communityId,
      'approved'
    );

    expect(approvalRecord.value.status).toBe('approved');

    // Step 3: Alice creates post with approved emoji
    const postMarkdown = 'Using approved emoji: :revocable_emoji:';
    const postRecord = await aliceService.createPost(
      aliceAgent,
      'Using approved emoji: :revocable_emoji:',
      communityId,
      undefined,
      postMarkdown,
      ['revocable_emoji']
    );

    expect(postRecord.value.emojiShortcodes).toContain('revocable_emoji');

    // Initial rendering with approved emoji
    const initialRegistry = {
      revocable_emoji: {
        emojiURI: emojiRecord.uri,
        blobURI: `${PDS_URL}/xrpc/com.atproto.sync.getBlob?did=${aliceAgent.session?.did}&cid=${blobRef.ref}`,
        animated: false,
      },
    };

    const initialHtml = renderMarkdown(postMarkdown, initialRegistry);
    expect(initialHtml).toContain('<img');
    expect(initialHtml).toContain('alt="revocable_emoji"');

    // Step 4: Bob revokes emoji approval
    const revokedApproval = await bobService.createEmojiApproval(
      bobAgent,
      'revocable_emoji',
      emojiRecord.uri,
      communityId,
      'revoked',
      'Inappropriate content'
    );

    expect(revokedApproval.value.status).toBe('revoked');

    // Step 5: Re-render post after revocation (emoji removed from registry)
    const updatedRegistry = {}; // Revoked emoji no longer in registry

    const updatedHtml = renderMarkdown(postMarkdown, updatedRegistry);

    // Verify shortcode is displayed as plain text (fallback behavior)
    expect(updatedHtml).toContain(':revocable_emoji:');
    expect(updatedHtml).not.toContain('<img'); // No image tag
    expect(updatedHtml).not.toContain('alt="revocable_emoji"');
  });

  it('should handle approval status transitions correctly', async () => {
    const mockPngBlob = new Blob(
      [
        new Uint8Array([
          137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8,
          6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0,
          1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
        ]),
      ],
      { type: 'image/png' }
    );

    const blobRef = await aliceService.uploadEmojiBlob(aliceAgent, mockPngBlob);
    const emojiRecord = await aliceService.createCustomEmoji(
      aliceAgent,
      'status_test',
      blobRef,
      'png',
      mockPngBlob.size,
      { width: 1, height: 1 },
      false
    );

    const communityId = 'abc12345';
    const markdown = 'Test emoji: :status_test:';

    // Scenario 1: Pending → should not render
    await bobService.createEmojiApproval(
      bobAgent,
      'status_test',
      emojiRecord.uri,
      communityId,
      'pending'
    );

    const pendingHtml = renderMarkdown(markdown, {});
    expect(pendingHtml).toContain(':status_test:');
    expect(pendingHtml).not.toContain('<img');

    // Scenario 2: Approved → should render
    await bobService.createEmojiApproval(
      bobAgent,
      'status_test',
      emojiRecord.uri,
      communityId,
      'approved'
    );

    const approvedRegistry = {
      status_test: {
        emojiURI: emojiRecord.uri,
        blobURI: `${PDS_URL}/xrpc/com.atproto.sync.getBlob?did=${aliceAgent.session?.did}&cid=${blobRef.ref}`,
        animated: false,
      },
    };

    const approvedHtml = renderMarkdown(markdown, approvedRegistry);
    expect(approvedHtml).toContain('<img');
    expect(approvedHtml).toContain('alt="status_test"');

    // Scenario 3: Revoked → should not render
    await bobService.createEmojiApproval(
      bobAgent,
      'status_test',
      emojiRecord.uri,
      communityId,
      'revoked'
    );

    const revokedHtml = renderMarkdown(markdown, {}); // Removed from registry
    expect(revokedHtml).toContain(':status_test:');
    expect(revokedHtml).not.toContain('<img');
  });

  it('should preserve other content when emoji is revoked', async () => {
    const markdown = '# Heading\n\n**Bold** and *italic* with :revoked:';
    const emptyRegistry = {};

    const html = renderMarkdown(markdown, emptyRegistry);

    // Markdown formatting should still work
    expect(html).toContain('<h1');
    expect(html).toContain('Heading');
    expect(html).toContain('<strong>Bold</strong>');
    expect(html).toContain('<em>italic</em>');

    // Revoked emoji as plain text
    expect(html).toContain(':revoked:');
    expect(html).not.toContain('<img');
  });
});
