// Integration Test: Deletion Blocking Flow
// Tests: Parent deletion blocked if children exist
// Verifies: 409 Conflict error, successful deletion after children removed

import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

describe.skip('Deletion Blocking Flow (requires deployed environment)', () => {
  const aliceDid = 'did:plc:alice123';
  const parentId = 'parent-community';
  const child1Id = 'child1-theme';
  const child2Id = 'child2-theme';
  const child3Id = 'child3-theme';
  const parentHashtag = '#atrarium_parent03';

  let parentStub: DurableObjectStub;
  let child1Stub: DurableObjectStub;
  let child2Stub: DurableObjectStub;
  let child3Stub: DurableObjectStub;

  beforeAll(async () => {
    const parentDOId = env.COMMUNITY_FEED.idFromName(parentId);
    parentStub = env.COMMUNITY_FEED.get(parentDOId);

    const child1DOId = env.COMMUNITY_FEED.idFromName(child1Id);
    child1Stub = env.COMMUNITY_FEED.get(child1DOId);

    const child2DOId = env.COMMUNITY_FEED.idFromName(child2Id);
    child2Stub = env.COMMUNITY_FEED.get(child2DOId);

    const child3DOId = env.COMMUNITY_FEED.idFromName(child3Id);
    child3Stub = env.COMMUNITY_FEED.get(child3DOId);
  });

  it('should create Graduated parent with 3 Theme children', async () => {
    const parentAtUri = `at://${aliceDid}/net.atrarium.group.config/${parentId}`;

    // Create Graduated parent
    await parentStub.fetch(
      new Request('http://test/updateConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Parent Community',
          hashtag: parentHashtag,
          stage: 'graduated',
          createdAt: new Date().toISOString(),
        }),
      })
    );

    // Create 3 child Themes
    const children = [
      { stub: child1Stub, id: child1Id, name: 'Child Theme 1' },
      { stub: child2Stub, id: child2Id, name: 'Child Theme 2' },
      { stub: child3Stub, id: child3Id, name: 'Child Theme 3' },
    ];

    for (const child of children) {
      await child.stub.fetch(
        new Request('http://test/updateConfig', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: child.name,
            hashtag: `#atrarium_${child.id}`,
            stage: 'theme',
            parentGroup: parentAtUri,
            createdAt: new Date().toISOString(),
          }),
        })
      );

      // Update parent's children list
      await parentStub.fetch(
        new Request('http://test/addChild', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId: child.id,
            childAtUri: `at://${aliceDid}/net.atrarium.group.config/${child.id}`,
          }),
        })
      );
    }

    // Verify parent has 3 children
    const getChildrenResponse = await parentStub.fetch(new Request('http://test/getChildren'));
    const childrenData = (await getChildrenResponse.json()) as {
      children: string[];
    };

    expect(childrenData.children).toHaveLength(3);
    expect(childrenData.children).toContain(child1Id);
    expect(childrenData.children).toContain(child2Id);
    expect(childrenData.children).toContain(child3Id);
  });

  it('should block parent deletion when children exist (409 Conflict)', async () => {
    // Attempt to delete parent with children
    const deleteResponse = await parentStub.fetch(
      new Request('http://test/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: parentId,
        }),
      })
    );

    // Deletion should be blocked
    expect(deleteResponse.ok).toBe(false);
    expect(deleteResponse.status).toBe(409);

    // Verify error message includes child names
    const errorData = (await deleteResponse.json()) as {
      error: string;
      message: string;
    };

    expect(errorData.error).toBe('ConflictError');
    expect(errorData.message).toContain('Cannot delete');
    expect(errorData.message).toContain('3 active children');
    expect(errorData.message).toContain('Child Theme 1');
    expect(errorData.message).toContain('Child Theme 2');
    expect(errorData.message).toContain('Child Theme 3');
  });

  it('should allow parent deletion after all children removed', async () => {
    // Delete all 3 children
    const children = [
      { stub: child1Stub, id: child1Id },
      { stub: child2Stub, id: child2Id },
      { stub: child3Stub, id: child3Id },
    ];

    for (const child of children) {
      const deleteChildResponse = await child.stub.fetch(
        new Request('http://test/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: child.id,
          }),
        })
      );

      expect(deleteChildResponse.ok).toBe(true);

      // Remove from parent's children list
      await parentStub.fetch(
        new Request('http://test/removeChild', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId: child.id,
          }),
        })
      );
    }

    // Verify parent has no children
    const getChildrenResponse = await parentStub.fetch(new Request('http://test/getChildren'));
    const childrenData = (await getChildrenResponse.json()) as {
      children: string[];
    };

    expect(childrenData.children).toHaveLength(0);

    // Now delete parent should succeed
    const deleteParentResponse = await parentStub.fetch(
      new Request('http://test/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: parentId,
        }),
      })
    );

    expect(deleteParentResponse.ok).toBe(true);

    const deleteData = (await deleteParentResponse.json()) as {
      success: boolean;
      deletedId: string;
    };

    expect(deleteData.success).toBe(true);
    expect(deleteData.deletedId).toBe(parentId);
  });

  it('should verify child deletion does not affect parent', async () => {
    // Recreate parent and children for this test
    const parentAtUri = `at://${aliceDid}/net.atrarium.group.config/${parentId}`;

    await parentStub.fetch(
      new Request('http://test/updateConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Parent Community',
          hashtag: parentHashtag,
          stage: 'graduated',
          createdAt: new Date().toISOString(),
        }),
      })
    );

    await child1Stub.fetch(
      new Request('http://test/updateConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Child Theme 1',
          hashtag: `#atrarium_${child1Id}`,
          stage: 'theme',
          parentGroup: parentAtUri,
          createdAt: new Date().toISOString(),
        }),
      })
    );

    await parentStub.fetch(
      new Request('http://test/addChild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: child1Id,
          childAtUri: `at://${aliceDid}/net.atrarium.group.config/${child1Id}`,
        }),
      })
    );

    // Delete child
    await child1Stub.fetch(
      new Request('http://test/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: child1Id,
        }),
      })
    );

    // Parent should still exist
    const getParentConfigResponse = await parentStub.fetch(new Request('http://test/getConfig'));
    const parentConfig = (await getParentConfigResponse.json()) as {
      name: string;
      stage: string;
    };

    expect(parentConfig.name).toBe('Parent Community');
    expect(parentConfig.stage).toBe('graduated');
  });
});
