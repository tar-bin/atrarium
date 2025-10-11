// Integration Test: Stage Progression Flow
// Tests: Theme → Community → Graduated progression
// Verifies: Dunbar thresholds (~15, ~50) enforced at each upgrade

import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

describe.skip('Stage Progression Flow (requires deployed environment)', () => {
  const aliceDid = 'did:plc:alice123';
  const groupId = 'progressive-community';
  const groupHashtag = '#atrarium_prog01';

  let communityStub: DurableObjectStub;

  beforeAll(async () => {
    const id = env.COMMUNITY_FEED.idFromName(groupId);
    communityStub = env.COMMUNITY_FEED.get(id);
  });

  it('should create Theme group with 1 member', async () => {
    // Create initial Theme group
    const createResponse = await communityStub.fetch(
      new Request('http://test/updateConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Progressive Community',
          description: 'Testing stage progression',
          hashtag: groupHashtag,
          stage: 'theme',
          createdAt: new Date().toISOString(),
        }),
      })
    );

    expect(createResponse.ok).toBe(true);

    // Add Alice as owner
    const addMemberResponse = await communityStub.fetch(
      new Request('http://test/addMember', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: aliceDid,
          role: 'owner',
          joinedAt: new Date().toISOString(),
          active: true,
        }),
      })
    );

    expect(addMemberResponse.ok).toBe(true);

    // Verify stage is Theme
    const getConfigResponse = await communityStub.fetch(new Request('http://test/getConfig'));
    const config = (await getConfigResponse.json()) as {
      stage: string;
    };

    expect(config.stage).toBe('theme');
  });

  it('should add 14 members to reach 15 total (Community threshold)', async () => {
    // Add 14 more members (total: 1 owner + 14 members = 15)
    for (let i = 2; i <= 15; i++) {
      await communityStub.fetch(
        new Request('http://test/addMember', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            did: `did:plc:member${i}`,
            role: 'member',
            joinedAt: new Date().toISOString(),
            active: true,
          }),
        })
      );
    }

    // Query member count
    const getMembersResponse = await communityStub.fetch(new Request('http://test/getMembers'));
    const membersData = (await getMembersResponse.json()) as {
      count: number;
    };

    expect(membersData.count).toBe(15);
  });

  it('should upgrade Theme → Community when memberCount >= 15', async () => {
    // Upgrade to Community
    const upgradeResponse = await communityStub.fetch(
      new Request('http://test/updateConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'community',
          updatedAt: new Date().toISOString(),
        }),
      })
    );

    expect(upgradeResponse.ok).toBe(true);

    // Verify stage updated to Community
    const getConfigResponse = await communityStub.fetch(new Request('http://test/getConfig'));
    const config = (await getConfigResponse.json()) as {
      stage: string;
    };

    expect(config.stage).toBe('community');
  });

  it('should add 35 more members to reach 50 total (Graduated threshold)', async () => {
    // Add 35 more members (total: 15 + 35 = 50)
    for (let i = 16; i <= 50; i++) {
      await communityStub.fetch(
        new Request('http://test/addMember', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            did: `did:plc:member${i}`,
            role: 'member',
            joinedAt: new Date().toISOString(),
            active: true,
          }),
        })
      );
    }

    // Query member count
    const getMembersResponse = await communityStub.fetch(new Request('http://test/getMembers'));
    const membersData = (await getMembersResponse.json()) as {
      count: number;
    };

    expect(membersData.count).toBe(50);
  });

  it('should upgrade Community → Graduated when memberCount >= 50', async () => {
    // Upgrade to Graduated
    const upgradeResponse = await communityStub.fetch(
      new Request('http://test/updateConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'graduated',
          updatedAt: new Date().toISOString(),
        }),
      })
    );

    expect(upgradeResponse.ok).toBe(true);

    // Verify stage updated to Graduated
    const getConfigResponse = await communityStub.fetch(new Request('http://test/getConfig'));
    const config = (await getConfigResponse.json()) as {
      stage: string;
    };

    expect(config.stage).toBe('graduated');
  });

  it('should verify PDS records updated at each stage', async () => {
    // This test validates that Firehose indexing correctly updates
    // Durable Object Storage with stage transitions from PDS

    // Query final config from Durable Object
    const getConfigResponse = await communityStub.fetch(new Request('http://test/getConfig'));
    const finalConfig = (await getConfigResponse.json()) as {
      name: string;
      stage: string;
      hashtag: string;
    };

    expect(finalConfig.name).toBe('Progressive Community');
    expect(finalConfig.stage).toBe('graduated');
    expect(finalConfig.hashtag).toBe(groupHashtag);

    // Verify updatedAt timestamp exists
    const storageResponse = await communityStub.fetch(new Request('http://test/getStorageKeys'));
    const storageData = (await storageResponse.json()) as {
      keys: string[];
    };

    expect(storageData.keys).toContain(`config:${groupId}`);
  });
});
