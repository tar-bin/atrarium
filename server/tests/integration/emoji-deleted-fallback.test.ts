import { AtpAgent } from '@atproto/api';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { renderMarkdown } from '../../../client/src/lib/markdown';
import { ATProtoService } from '../../src/services/atproto';
import type { Env } from '../../src/types';

/**
 * Integration test: Deleted Emoji Fallback (015-markdown-pds: T050)
 * Scenario: Create post with emoji → delete emoji from PDS → verify shortcode displays as plain text
 *
 * Requires local PDS running on localhost:3000
 *
 * Setup:
 * 1. DevContainer should start PDS automatically
 * 2. Run: bash .devcontainer/setup-pds.sh
 * 3. Run tests: pnpm test tests/integration/emoji-deleted-fallback.test.ts
 */

const PDS_URL = process.env.PDS_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds

describe.skip('Integration: Deleted Emoji Fallback', { timeout: TEST_TIMEOUT }, () => {
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

  it('should display shortcode as plain text when emoji is deleted from PDS', async () => {
    // Step 1: Alice uploads and approves emoji
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
      'temp_emoji',
      blobRef,
      'png',
      mockPngBlob.size,
      { width: 1, height: 1 },
      false
    );

    const communityId = 'abc12345';
    await bobService.createEmojiApproval(
      bobAgent,
      'temp_emoji',
      emojiRecord.uri,
      communityId,
      'approved'
    );

    // Step 2: Alice creates post with emoji
    const postMarkdown = 'Check out this emoji: :temp_emoji:';
    const postRecord = await aliceService.createPost(
      aliceAgent,
      'Check out this emoji: :temp_emoji:',
      communityId,
      undefined,
      postMarkdown,
      ['temp_emoji']
    );

    expect(postRecord.value.emojiShortcodes).toContain('temp_emoji');

    // Step 3: Delete emoji from PDS
    const emojiRkey = emojiRecord.uri.split('/').pop();
    if (!emojiRkey) throw new Error('Invalid emoji URI');

    await aliceAgent.com.atproto.repo.deleteRecord({
      repo: aliceAgent.session?.did,
      collection: 'net.atrarium.emoji.custom',
      rkey: emojiRkey,
    });

    // Step 4: Attempt to render post (emoji no longer exists in registry)
    const emptyEmojiRegistry = {}; // Emoji was deleted, registry is empty

    const renderedHtml = renderMarkdown(postMarkdown, emptyEmojiRegistry);

    // Verify shortcode is displayed as plain text (fallback behavior)
    expect(renderedHtml).toContain(':temp_emoji:');
    expect(renderedHtml).not.toContain('<img'); // No image tag
    expect(renderedHtml).not.toContain('alt="temp_emoji"');
  });

  it('should handle multiple emoji where some are deleted', async () => {
    const markdown = 'Hello :emoji1: and :emoji2: and :emoji3:';

    // Registry has emoji1 and emoji3, but emoji2 was deleted
    const partialEmojiRegistry = {
      emoji1: {
        emojiURI: 'at://did:plc:alice/net.atrarium.emoji.custom/1',
        blobURI: 'https://example.com/emoji1.png',
        animated: false,
      },
      emoji3: {
        emojiURI: 'at://did:plc:alice/net.atrarium.emoji.custom/3',
        blobURI: 'https://example.com/emoji3.png',
        animated: false,
      },
    };

    const renderedHtml = renderMarkdown(markdown, partialEmojiRegistry);

    // emoji1 and emoji3 should be rendered as images
    expect(renderedHtml).toContain('alt="emoji1"');
    expect(renderedHtml).toContain('alt="emoji3"');

    // emoji2 should remain as plain text (deleted)
    expect(renderedHtml).toContain(':emoji2:');
  });

  it('should not break rendering when all emoji are deleted', async () => {
    const markdown = '**Bold text** with :deleted1: and :deleted2: emoji';
    const emptyRegistry = {};

    const renderedHtml = renderMarkdown(markdown, emptyRegistry);

    // Bold text should still render
    expect(renderedHtml).toContain('<strong>Bold text</strong>');

    // Emoji shortcodes should remain as plain text
    expect(renderedHtml).toContain(':deleted1:');
    expect(renderedHtml).toContain(':deleted2:');

    // No image tags
    expect(renderedHtml).not.toContain('<img');
  });
});
