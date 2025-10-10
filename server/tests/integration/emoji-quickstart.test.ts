import { AtpAgent } from '@atproto/api';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// import { renderMarkdown } from '../../../client/src/lib/markdown';
import { ATProtoService } from '../../src/services/atproto';
import type { Env } from '../../src/types';

/**
 * Integration test: Emoji Quickstart Scenario (015-markdown-pds: T049)
 * Scenario: Alice uploads :alice_wave: → Bob approves → Alice posts with Markdown + emoji → verify rendering
 *
 * Requires local PDS running on localhost:3000
 *
 * Setup:
 * 1. DevContainer should start PDS automatically
 * 2. Run: bash .devcontainer/setup-pds.sh
 * 3. Run tests: pnpm test tests/integration/emoji-quickstart.test.ts
 */

const PDS_URL = process.env.PDS_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds

describe.skip('Integration: Emoji Quickstart Scenario', { timeout: TEST_TIMEOUT }, () => {
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

  it('should complete full emoji workflow: upload → approve → post → render', async () => {
    // Step 1: Alice uploads emoji (:alice_wave:)
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
    expect(blobRef).toBeDefined();
    expect(blobRef.$type).toBe('blob');

    const emojiRecord = await aliceService.createCustomEmoji(
      aliceAgent,
      'alice_wave',
      blobRef,
      'png',
      mockPngBlob.size,
      { width: 1, height: 1 },
      false
    );
    expect(emojiRecord.uri).toMatch(/net\.atrarium\.emoji\.custom/);

    // Step 2: Alice submits emoji for approval to community (assume Bob is owner)
    const communityId = 'abc12345'; // Mock community ID
    const approvalRecord = await aliceService.createEmojiApproval(
      aliceAgent,
      'alice_wave',
      emojiRecord.uri,
      communityId,
      'pending'
    );
    expect(approvalRecord.uri).toMatch(/net\.atrarium\.emoji\.approval/);

    // Step 3: Bob (community owner) approves emoji
    const approvalUpdate = await bobService.createEmojiApproval(
      bobAgent,
      'alice_wave',
      emojiRecord.uri,
      communityId,
      'approved'
    );
    expect(approvalUpdate.value.status).toBe('approved');

    // Step 4: Alice creates post with Markdown + emoji
    const postText = 'Hello from Alice! :alice_wave:';
    const postMarkdown = '**Hello** from Alice! :alice_wave:';
    const emojiShortcodes = ['alice_wave'];

    const postRecord = await aliceService.createPost(
      aliceAgent,
      postText,
      communityId,
      undefined,
      postMarkdown,
      emojiShortcodes
    );
    expect(postRecord.uri).toMatch(/net\.atrarium\.community\.post/);
    expect(postRecord.value.markdown).toBe(postMarkdown);
    expect(postRecord.value.emojiShortcodes).toEqual(emojiShortcodes);

    // Step 5: Verify rendering (client-side)
    const emojiRegistry = {
      alice_wave: {
        emojiURI: emojiRecord.uri,
        blobURI: `${PDS_URL}/xrpc/com.atproto.sync.getBlob?did=${aliceAgent.session?.did}&cid=${blobRef.ref}`,
        animated: false,
      },
    };

    const renderedHtml = renderMarkdown(postMarkdown, emojiRegistry);

    // Verify rendered HTML contains:
    // 1. Bold text: <strong>Hello</strong>
    expect(renderedHtml).toContain('<strong>Hello</strong>');

    // 2. Emoji image tag with correct src
    expect(renderedHtml).toContain('<img');
    expect(renderedHtml).toContain('alt="alice_wave"');
    expect(renderedHtml).toContain(emojiRegistry.alice_wave.blobURI);

    // 3. No XSS vulnerabilities (DOMPurify sanitization)
    expect(renderedHtml).not.toContain('<script>');
    expect(renderedHtml).not.toContain('javascript:');
  });

  it('should handle emoji in code blocks correctly', async () => {
    const markdownWithCodeBlock = '```\nThis is code: :alice_wave:\n```';

    const emojiRegistry = {
      alice_wave: {
        emojiURI: 'at://did:plc:alice/net.atrarium.emoji.custom/123',
        blobURI: 'https://example.com/emoji.png',
        animated: false,
      },
    };

    const renderedHtml = renderMarkdown(markdownWithCodeBlock, emojiRegistry);

    // Emoji in code blocks should NOT be replaced
    expect(renderedHtml).toContain(':alice_wave:');
    expect(renderedHtml).not.toContain('<img');
  });

  it('should gracefully handle missing emoji in registry', async () => {
    const markdown = 'Hello :unknown_emoji:';
    const emojiRegistry = {}; // Empty registry

    const renderedHtml = renderMarkdown(markdown, emojiRegistry);

    // Unknown emoji should remain as plain text
    expect(renderedHtml).toContain(':unknown_emoji:');
    expect(renderedHtml).not.toContain('<img');
  });
});
