// Integration Test: Create Child Theme Flow
// Tests: Graduated group creates Theme child
// Verifies: Child created with parentGroup AT-URI, parent's children list updated

import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

describe.skip('Create Child Theme Flow (requires deployed environment)', () => {
  const aliceDid = 'did:plc:alice123';
  const parentId = 'design-patterns';
  const parentHashtag = '#atrarium_parent01';
  const childId = 'ui-patterns';
  const childHashtag = '#atrarium_child01';

  let parentStub: DurableObjectStub;
  let childStub: DurableObjectStub;

  beforeAll(async () => {
    const parentDOId = env.COMMUNITY_FEED.idFromName(parentId);
    parentStub = env.COMMUNITY_FEED.get(parentDOId);

    const childDOId = env.COMMUNITY_FEED.idFromName(childId);
    childStub = env.COMMUNITY_FEED.get(childDOId);
  });

  it('should create Graduated parent with 50 members', async () => {
    // Create Graduated parent group
    const createParentResponse = await parentStub.fetch(
      new Request('http://test/updateConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Design Patterns',
          description: 'Software design patterns community',
          hashtag: parentHashtag,
          stage: 'graduated',
          createdAt: new Date().toISOString(),
        }),
      })
    );

    expect(createParentResponse.ok).toBe(true);

    const configData = (await createParentResponse.json()) as {
      success: boolean;
    };
    expect(configData.success).toBe(true);

    // Add 50 members to reach Graduated threshold
    for (let i = 1; i <= 50; i++) {
      await parentStub.fetch(
        new Request('http://test/addMember', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            did: `did:plc:member${i}`,
            role: i === 1 ? 'owner' : 'member',
            joinedAt: new Date().toISOString(),
            active: true,
          }),
        })
      );
    }
  });

  it('should create child Theme with parentGroup AT-URI', async () => {
    const parentAtUri = `at://${aliceDid}/net.atrarium.group.config/${parentId}`;

    // Create child Theme group
    const createChildResponse = await childStub.fetch(
      new Request('http://test/updateConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'UI Patterns',
          description: 'User interface design patterns',
          hashtag: childHashtag,
          stage: 'theme',
          parentGroup: parentAtUri,
          createdAt: new Date().toISOString(),
        }),
      })
    );

    expect(createChildResponse.ok).toBe(true);

    const childConfigData = (await createChildResponse.json()) as {
      success: boolean;
    };
    expect(childConfigData.success).toBe(true);

    // Verify child has parentGroup field
    const getChildConfigResponse = await childStub.fetch(new Request('http://test/getConfig'));
    const childConfig = (await getChildConfigResponse.json()) as {
      stage: string;
      parentGroup?: string;
    };

    expect(childConfig.stage).toBe('theme');
    expect(childConfig.parentGroup).toBe(parentAtUri);
  });

  it("should update parent's children list in Durable Object cache", async () => {
    const _parentAtUri = `at://${aliceDid}/net.atrarium.group.config/${parentId}`;

    // Simulate Firehose indexing: update parent's children list
    const updateChildrenResponse = await parentStub.fetch(
      new Request('http://test/addChild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: childId,
          childAtUri: `at://${aliceDid}/net.atrarium.group.config/${childId}`,
        }),
      })
    );

    expect(updateChildrenResponse.ok).toBe(true);

    // Query parent's children list
    const getChildrenResponse = await parentStub.fetch(new Request('http://test/getChildren'));
    const childrenData = (await getChildrenResponse.json()) as {
      children: string[];
    };

    expect(childrenData.children).toContain(childId);
    expect(childrenData.children.length).toBeGreaterThanOrEqual(1);
  });

  it("should cache parent AT-URI in child's Durable Object", async () => {
    const parentAtUri = `at://${aliceDid}/net.atrarium.group.config/${parentId}`;

    // Query child's parent reference
    const getParentResponse = await childStub.fetch(new Request('http://test/getParent'));
    const parentData = (await getParentResponse.json()) as {
      parentAtUri?: string;
    };

    expect(parentData.parentAtUri).toBe(parentAtUri);
  });

  it('should verify Durable Objects cache keys', async () => {
    // Verify parent:childId key in child DO
    const childStorageResponse = await childStub.fetch(new Request('http://test/getStorageKeys'));
    const childKeys = (await childStorageResponse.json()) as {
      keys: string[];
    };

    expect(childKeys.keys).toContain(`parent:${childId}`);

    // Verify children:parentId key in parent DO
    const parentStorageResponse = await parentStub.fetch(new Request('http://test/getStorageKeys'));
    const parentKeys = (await parentStorageResponse.json()) as {
      keys: string[];
    };

    expect(parentKeys.keys).toContain(`children:${parentId}`);
  });
});
