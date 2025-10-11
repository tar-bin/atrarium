/**
 * Contract Test: POST /api/groups/:id/downgrade (downgradeStage)
 * Feature: 017-1-1 (Hierarchical Group System)
 *
 * Tests bidirectional stage transitions: Graduated → Community → Theme
 * Validates that downgrades retain parent references (immutability)
 * This test MUST FAIL initially (TDD approach).
 *
 * Requirements:
 * - FR-005: Stage downgrades allowed (bidirectional transitions)
 * - FR-005a: Downgrade with children retains parent, but cannot create new children until re-upgraded
 * - FR-007: Parent reference immutable (retained during downgrade)
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('POST /api/groups/:id/downgrade (downgradeStage)', () => {
  const mockJWT = 'Bearer test-owner-token'; // Owner authentication

  beforeAll(async () => {
    // Setup: Create test groups at various stages (implementation pending)
    // This will be implemented in Phase 3.3-3.4
  });

  afterAll(async () => {
    // Cleanup: Delete test data
  });

  describe('Graduated → Community downgrade', () => {
    it('should downgrade Graduated to Community successfully', async () => {
      const graduatedGroupId = 'graduated01'; // Mock Graduated group (no children)

      const response = await fetch(
        `http://localhost:8787/api/groups/${graduatedGroupId}/downgrade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: mockJWT,
          },
          body: JSON.stringify({
            targetStage: 'community',
          }),
        }
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        id: string;
        stage: string;
        memberCount: number;
        updatedAt: string;
      };

      expect(data.stage).toBe('community');
      expect(data.updatedAt).toBeTruthy();
    });

    it('should allow downgrade even if Graduated has children (FR-005a)', async () => {
      const graduatedWithChildrenId = 'graduated-with-kids'; // Mock Graduated group with 2 children

      const response = await fetch(
        `http://localhost:8787/api/groups/${graduatedWithChildrenId}/downgrade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: mockJWT,
          },
          body: JSON.stringify({
            targetStage: 'community',
          }),
        }
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        id: string;
        stage: string;
      };

      expect(data.stage).toBe('community');

      // Note: Children are retained, but parent cannot create NEW children until re-upgraded to Graduated
      // This constraint will be validated in createChild tests (T006)
    });

    it('should retain moderation independence after Graduated → Community', async () => {
      const graduatedGroupId = 'graduated02';

      const response = await fetch(
        `http://localhost:8787/api/groups/${graduatedGroupId}/downgrade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: mockJWT,
          },
          body: JSON.stringify({
            targetStage: 'community',
          }),
        }
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        id: string;
        stage: string;
      };

      expect(data.stage).toBe('community');

      // Note: Community stage retains independent moderation (FR-019a)
      // This will be validated in moderation inheritance tests (T045)
    });
  });

  describe('Community → Theme downgrade', () => {
    it('should downgrade Community to Theme successfully', async () => {
      const communityGroupId = 'community01'; // Mock Community group

      const response = await fetch(
        `http://localhost:8787/api/groups/${communityGroupId}/downgrade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: mockJWT,
          },
          body: JSON.stringify({
            targetStage: 'theme',
          }),
        }
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        id: string;
        stage: string;
        updatedAt: string;
      };

      expect(data.stage).toBe('theme');
      expect(data.updatedAt).toBeTruthy();
    });

    it('should switch to inherited moderation after Community → Theme', async () => {
      const communityGroupId = 'community-with-parent'; // Mock Community with parent

      const response = await fetch(
        `http://localhost:8787/api/groups/${communityGroupId}/downgrade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: mockJWT,
          },
          body: JSON.stringify({
            targetStage: 'theme',
          }),
        }
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        id: string;
        stage: string;
      };

      expect(data.stage).toBe('theme');

      // Note: Theme stage switches to inherited moderation from parent (FR-019)
      // This will be validated in moderation inheritance tests (T045)
    });
  });

  describe('Graduated → Theme downgrade (skip Community)', () => {
    it('should downgrade Graduated directly to Theme', async () => {
      const graduatedGroupId = 'graduated03';

      const response = await fetch(
        `http://localhost:8787/api/groups/${graduatedGroupId}/downgrade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: mockJWT,
          },
          body: JSON.stringify({
            targetStage: 'theme',
          }),
        }
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        id: string;
        stage: string;
      };

      expect(data.stage).toBe('theme');
    });
  });

  describe('Invalid stage transitions (400 Bad Request)', () => {
    it('should reject Theme → Graduated (use /upgrade instead)', async () => {
      const themeGroupId = 'theme01';

      const response = await fetch(`http://localhost:8787/api/groups/${themeGroupId}/downgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockJWT,
        },
        body: JSON.stringify({
          targetStage: 'graduated',
        }),
      });

      expect(response.status).toBe(400);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain('upgrade');
      expect(data.error).toContain('/upgrade');
    });

    it('should reject downgrade to same stage (Community → Community)', async () => {
      const communityGroupId = 'community01';

      const response = await fetch(
        `http://localhost:8787/api/groups/${communityGroupId}/downgrade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: mockJWT,
          },
          body: JSON.stringify({
            targetStage: 'community',
          }),
        }
      );

      expect(response.status).toBe(400);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain('same stage');
    });

    it('should reject Theme → Community (use /upgrade for upgrades)', async () => {
      const themeGroupId = 'theme15';

      const response = await fetch(`http://localhost:8787/api/groups/${themeGroupId}/downgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockJWT,
        },
        body: JSON.stringify({
          targetStage: 'community',
        }),
      });

      expect(response.status).toBe(400);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain('upgrade');
    });
  });

  describe('Validation errors', () => {
    it('should reject missing targetStage', async () => {
      const graduatedGroupId = 'graduated01';

      const response = await fetch(
        `http://localhost:8787/api/groups/${graduatedGroupId}/downgrade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: mockJWT,
          },
          body: JSON.stringify({}),
        }
      );

      expect(response.status).toBe(400);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain('targetStage');
    });

    it('should reject invalid targetStage value', async () => {
      const graduatedGroupId = 'graduated01';

      const response = await fetch(
        `http://localhost:8787/api/groups/${graduatedGroupId}/downgrade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: mockJWT,
          },
          body: JSON.stringify({
            targetStage: 'invalid-stage',
          }),
        }
      );

      expect(response.status).toBe(400);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain('targetStage');
    });
  });

  describe('Authorization errors (403 Forbidden)', () => {
    it('should reject non-owner attempts to downgrade', async () => {
      const graduatedGroupId = 'graduated01';
      const nonOwnerJWT = 'Bearer test-non-owner-token';

      const response = await fetch(
        `http://localhost:8787/api/groups/${graduatedGroupId}/downgrade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: nonOwnerJWT,
          },
          body: JSON.stringify({
            targetStage: 'community',
          }),
        }
      );

      expect(response.status).toBe(403);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain('owner');
    });

    it('should reject unauthenticated requests', async () => {
      const graduatedGroupId = 'graduated01';

      const response = await fetch(
        `http://localhost:8787/api/groups/${graduatedGroupId}/downgrade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // No Authorization header
          },
          body: JSON.stringify({
            targetStage: 'community',
          }),
        }
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Not found errors (404)', () => {
    it('should return 404 for non-existent group', async () => {
      const nonExistentId = 'notfound';

      const response = await fetch(`http://localhost:8787/api/groups/${nonExistentId}/downgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockJWT,
        },
        body: JSON.stringify({
          targetStage: 'community',
        }),
      });

      expect(response.status).toBe(404);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain('not found');
    });
  });

  describe('Parent reference retention (immutability)', () => {
    it('should retain parentGroup field after Community → Theme downgrade', async () => {
      const childCommunityId = 'child-community01'; // Mock Community child with parent

      const response = await fetch(
        `http://localhost:8787/api/groups/${childCommunityId}/downgrade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: mockJWT,
          },
          body: JSON.stringify({
            targetStage: 'theme',
          }),
        }
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        id: string;
        stage: string;
        parentGroup?: string;
      };

      expect(data.stage).toBe('theme');
      expect(data.parentGroup).toBeTruthy(); // Parent reference retained (FR-007: immutable)
      expect(data.parentGroup).toMatch(/^at:\/\//);
    });

    it('should retain parentGroup field after Graduated → Theme downgrade', async () => {
      const childGraduatedId = 'child-graduated01'; // Mock Graduated child with parent

      const response = await fetch(
        `http://localhost:8787/api/groups/${childGraduatedId}/downgrade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: mockJWT,
          },
          body: JSON.stringify({
            targetStage: 'theme',
          }),
        }
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        id: string;
        stage: string;
        parentGroup?: string;
      };

      expect(data.stage).toBe('theme');
      expect(data.parentGroup).toBeTruthy(); // Parent reference retained
      expect(data.parentGroup).toMatch(/^at:\/\//);
    });
  });
});
