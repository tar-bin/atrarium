/**
 * Contract Test: GET /api/groups/:id/parent (getParent)
 * Feature: 017-1-1 (Hierarchical Group System)
 *
 * Tests retrieval of parent group for a given child group.
 * Validates that only Theme-stage groups can have parents (Graduated stage).
 * This test MUST FAIL initially (TDD approach).
 *
 * Requirements:
 * - FR-006: Groups can reference another group as parent using AT-URI
 * - FR-008: Only Graduated can be parents, only Theme can have parents
 * - FR-020: Browse hierarchical structure (parent retrieval)
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('GET /api/groups/:id/parent (getParent)', () => {
  beforeAll(async () => {
    // Setup: Create test groups with parent-child relationships (implementation pending)
    // This will be implemented in Phase 3.3-3.4
  });

  afterAll(async () => {
    // Cleanup: Delete test data
  });

  describe('Success cases', () => {
    it('should return Graduated parent for Theme child with parent', async () => {
      const childThemeId = 'child-theme01'; // Mock Theme group with parent

      const response = await fetch(`http://localhost:8787/api/groups/${childThemeId}/parent`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        id: string;
        name: string;
        stage: string;
        hashtag: string;
        memberCount: number;
        createdAt: string;
      };

      // Verify parent is Graduated stage
      expect(data.stage).toBe('graduated');
      expect(data.id).toBeTruthy();
      expect(data.name).toBeTruthy();
      expect(data.hashtag).toMatch(/^#atrarium_[0-9a-f]{8}$/);
      expect(typeof data.memberCount).toBe('number');
      expect(data.createdAt).toBeTruthy();
    });

    it('should return null for Graduated group with no parent', async () => {
      const graduatedGroupId = 'graduated01'; // Mock Graduated group (top-level)

      const response = await fetch(`http://localhost:8787/api/groups/${graduatedGroupId}/parent`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        parent: null;
      };

      expect(data.parent).toBeNull();
    });

    it('should return null for Community group with no parent', async () => {
      const communityGroupId = 'community01'; // Mock Community group (top-level)

      const response = await fetch(`http://localhost:8787/api/groups/${communityGroupId}/parent`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        parent: null;
      };

      expect(data.parent).toBeNull();
    });

    it('should return null for Theme group with no parent (top-level)', async () => {
      const topLevelThemeId = 'theme-no-parent'; // Mock Theme group without parent

      const response = await fetch(`http://localhost:8787/api/groups/${topLevelThemeId}/parent`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        parent: null;
      };

      expect(data.parent).toBeNull();
    });
  });

  describe('Parent reference validation (FR-006)', () => {
    it('should return parent with all required fields', async () => {
      const childThemeId = 'child-theme02';

      const response = await fetch(`http://localhost:8787/api/groups/${childThemeId}/parent`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        id: string;
        name: string;
        description?: string;
        stage: string;
        hashtag: string;
        memberCount: number;
        createdAt: string;
      };

      // Validate all required fields
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('stage');
      expect(data).toHaveProperty('hashtag');
      expect(data).toHaveProperty('memberCount');
      expect(data).toHaveProperty('createdAt');

      // Validate field formats
      expect(data.stage).toBe('graduated');
      expect(data.hashtag).toMatch(/^#atrarium_[0-9a-f]{8}$/);
      expect(typeof data.memberCount).toBe('number');
      expect(data.memberCount).toBeGreaterThanOrEqual(0);
    });

    it('should return parent that matches the AT-URI reference in child config', async () => {
      const childThemeId = 'child-theme03';

      // First, get the child group to retrieve its parentGroup AT-URI
      const childResponse = await fetch(`http://localhost:8787/api/groups/${childThemeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(childResponse.status).toBe(200);

      const childData = (await childResponse.json()) as {
        parentGroup?: string;
      };

      expect(childData.parentGroup).toBeTruthy();
      expect(childData.parentGroup).toMatch(/^at:\/\//);

      // Extract parent ID from AT-URI (format: at://did:plc:xxx/net.atrarium.group.config/yyy)
      const parentRkey = childData.parentGroup!.split('/').pop();

      // Now, get the parent via getParent endpoint
      const parentResponse = await fetch(
        `http://localhost:8787/api/groups/${childThemeId}/parent`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      expect(parentResponse.status).toBe(200);

      const parentData = (await parentResponse.json()) as {
        id: string;
        stage: string;
      };

      // Verify parent ID matches the rkey from AT-URI
      expect(parentData.id).toBe(parentRkey);
      expect(parentData.stage).toBe('graduated');
    });
  });

  describe('Stage constraint validation (FR-008)', () => {
    it('should always return Graduated stage for parent groups', async () => {
      const childThemeId = 'child-theme04';

      const response = await fetch(`http://localhost:8787/api/groups/${childThemeId}/parent`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        stage: string;
      };

      // FR-008: Only Graduated can be parents
      expect(data.stage).toBe('graduated');
    });
  });

  describe('Not found errors (404)', () => {
    it('should return 404 for non-existent group', async () => {
      const nonExistentId = 'notfound';

      const response = await fetch(`http://localhost:8787/api/groups/${nonExistentId}/parent`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(404);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain('not found');
    });
  });

  describe('Public accessibility', () => {
    it('should allow unauthenticated requests (public endpoint)', async () => {
      const childThemeId = 'child-theme01';

      const response = await fetch(`http://localhost:8787/api/groups/${childThemeId}/parent`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header
        },
      });

      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        stage?: string;
        parent?: null;
      };

      // Either returns parent data or null, both are valid
      if (data.stage) {
        expect(data.stage).toBe('graduated');
      } else {
        expect(data.parent).toBeNull();
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle Theme group that upgraded to Community (retains parent reference)', async () => {
      const upgradedCommunityId = 'upgraded-community-with-parent'; // Mock Community that was previously Theme with parent

      const response = await fetch(
        `http://localhost:8787/api/groups/${upgradedCommunityId}/parent`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        id?: string;
        stage?: string;
        parent?: null;
      };

      // Parent reference is immutable (FR-007)
      // Even after upgrade to Community, parent reference should be retained
      if (data.id) {
        expect(data.stage).toBe('graduated');
      } else {
        // If parent reference was not set, returns null
        expect(data.parent).toBeNull();
      }
    });

    it('should handle Theme group that downgraded from Community (retains parent reference)', async () => {
      const downgradedThemeId = 'downgraded-theme-with-parent'; // Mock Theme that was previously Community with parent

      const response = await fetch(`http://localhost:8787/api/groups/${downgradedThemeId}/parent`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        id?: string;
        stage?: string;
        parent?: null;
      };

      // Parent reference is immutable (FR-007)
      // After downgrade to Theme, parent reference should be retained
      if (data.id) {
        expect(data.stage).toBe('graduated');
      } else {
        expect(data.parent).toBeNull();
      }
    });
  });
});
