/**
 * Contract Test: DELETE /api/groups/:id (delete with children validation)
 * Feature: 017-1-1 (Hierarchical Group System)
 *
 * Tests group deletion with hierarchical constraints.
 * Validates that Graduated groups with children cannot be deleted (409 Conflict).
 * This test MUST FAIL initially (TDD approach).
 *
 * Requirements:
 * - FR-014: Groups with children cannot be deleted (409 Conflict with child list)
 * - FR-015: Delete all children first, then parent
 * - FR-016: Deleting Theme child does not affect parent
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('DELETE /api/groups/:id (delete with children validation)', () => {
  const mockJWT = 'Bearer test-owner-token'; // Owner authentication

  beforeAll(async () => {
    // Setup: Create test groups with parent-child relationships (implementation pending)
    // This will be implemented in Phase 3.3-3.4
  });

  afterAll(async () => {
    // Cleanup: Delete test data
  });

  describe('Deletion blocked by children (409 Conflict)', () => {
    it('should reject deletion of Graduated group with 2 children (FR-014)', async () => {
      const graduatedParentId = 'parent-with-2-kids'; // Mock Graduated group with 2 Theme children

      const response = await fetch(`http://localhost:8787/api/groups/${graduatedParentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockJWT,
        },
      });

      expect(response.status).toBe(409);

      const data = (await response.json()) as {
        error: string;
        children: Array<{
          id: string;
          name: string;
        }>;
      };

      expect(data.error).toContain('children');
      expect(data.error).toContain('cannot be deleted');
      expect(data.children).toHaveLength(2);

      // Verify child list includes IDs and names
      data.children.forEach((child) => {
        expect(child.id).toBeTruthy();
        expect(child.name).toBeTruthy();
      });
    });

    it('should reject deletion of Graduated group with 5 children', async () => {
      const graduatedParentId = 'parent-with-5-kids'; // Mock Graduated group with 5 Theme children

      const response = await fetch(`http://localhost:8787/api/groups/${graduatedParentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockJWT,
        },
      });

      expect(response.status).toBe(409);

      const data = (await response.json()) as {
        error: string;
        children: Array<{
          id: string;
          name: string;
        }>;
      };

      expect(data.error).toContain('children');
      expect(data.children).toHaveLength(5);
    });

    it('should reject deletion of Graduated group that was downgraded to Community with children', async () => {
      const downgradedCommunityId = 'community-with-kids'; // Mock Community (downgraded from Graduated) with children

      const response = await fetch(`http://localhost:8787/api/groups/${downgradedCommunityId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockJWT,
        },
      });

      expect(response.status).toBe(409);

      const data = (await response.json()) as {
        error: string;
        children: Array<any>;
      };

      // Even if downgraded to Community, children relationships persist
      expect(data.error).toContain('children');
      expect(data.children.length).toBeGreaterThan(0);
    });
  });

  describe('Successful deletion cases', () => {
    it('should delete Graduated group with no children successfully', async () => {
      const graduatedNoKidsId = 'graduated-no-kids'; // Mock Graduated group with no children

      const response = await fetch(`http://localhost:8787/api/groups/${graduatedNoKidsId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockJWT,
        },
      });

      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        success: boolean;
        message: string;
      };

      expect(data.success).toBe(true);
      expect(data.message).toContain('deleted');
    });

    it('should delete Theme child without affecting parent (FR-016)', async () => {
      const childThemeId = 'child-theme01'; // Mock Theme child with parent
      const parentId = 'parent-with-3-kids'; // Parent of child-theme01

      // First, verify parent exists with children
      const parentBeforeResponse = await fetch(
        `http://localhost:8787/api/groups/${parentId}/children`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      expect(parentBeforeResponse.status).toBe(200);

      const parentBeforeData = (await parentBeforeResponse.json()) as {
        children: Array<any>;
      };

      const childCountBefore = parentBeforeData.children.length;
      expect(childCountBefore).toBeGreaterThan(0);

      // Delete the child
      const deleteResponse = await fetch(`http://localhost:8787/api/groups/${childThemeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockJWT,
        },
      });

      expect(deleteResponse.status).toBe(200);

      const deleteData = (await deleteResponse.json()) as {
        success: boolean;
      };

      expect(deleteData.success).toBe(true);

      // Verify parent still exists
      const parentAfterResponse = await fetch(`http://localhost:8787/api/groups/${parentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(parentAfterResponse.status).toBe(200);

      // Verify parent's children count decreased by 1
      const childrenAfterResponse = await fetch(
        `http://localhost:8787/api/groups/${parentId}/children`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const childrenAfterData = (await childrenAfterResponse.json()) as {
        children: Array<any>;
      };

      expect(childrenAfterData.children.length).toBe(childCountBefore - 1);
    });

    it('should delete Community group with no children successfully', async () => {
      const communityGroupId = 'community-no-kids';

      const response = await fetch(`http://localhost:8787/api/groups/${communityGroupId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockJWT,
        },
      });

      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        success: boolean;
      };

      expect(data.success).toBe(true);
    });

    it('should delete Theme group (top-level, no parent) successfully', async () => {
      const themeGroupId = 'theme-no-parent';

      const response = await fetch(`http://localhost:8787/api/groups/${themeGroupId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockJWT,
        },
      });

      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        success: boolean;
      };

      expect(data.success).toBe(true);
    });
  });

  describe('Sequential deletion workflow (FR-015)', () => {
    it('should delete all children first, then parent successfully', async () => {
      const parentId = 'parent-sequential-delete';
      const child1Id = 'child01-sequential';
      const child2Id = 'child02-sequential';

      // Step 1: Verify parent has 2 children
      const childrenResponse = await fetch(
        `http://localhost:8787/api/groups/${parentId}/children`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      expect(childrenResponse.status).toBe(200);

      const childrenData = (await childrenResponse.json()) as {
        children: Array<any>;
      };

      expect(childrenData.children.length).toBeGreaterThanOrEqual(2);

      // Step 2: Try to delete parent (should fail with 409)
      const deleteParentAttempt1 = await fetch(`http://localhost:8787/api/groups/${parentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockJWT,
        },
      });

      expect(deleteParentAttempt1.status).toBe(409);

      // Step 3: Delete first child
      const deleteChild1 = await fetch(`http://localhost:8787/api/groups/${child1Id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockJWT,
        },
      });

      expect(deleteChild1.status).toBe(200);

      // Step 4: Delete second child
      const deleteChild2 = await fetch(`http://localhost:8787/api/groups/${child2Id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockJWT,
        },
      });

      expect(deleteChild2.status).toBe(200);

      // Step 5: Now delete parent (should succeed)
      const deleteParentAttempt2 = await fetch(`http://localhost:8787/api/groups/${parentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockJWT,
        },
      });

      expect(deleteParentAttempt2.status).toBe(200);

      const deleteParentData = (await deleteParentAttempt2.json()) as {
        success: boolean;
      };

      expect(deleteParentData.success).toBe(true);

      // Step 6: Verify parent is deleted (404)
      const verifyParentDeleted = await fetch(`http://localhost:8787/api/groups/${parentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(verifyParentDeleted.status).toBe(404);
    });
  });

  describe('Authorization errors (403 Forbidden)', () => {
    it('should reject non-owner attempts to delete group', async () => {
      const groupId = 'graduated-no-kids';
      const nonOwnerJWT = 'Bearer test-non-owner-token';

      const response = await fetch(`http://localhost:8787/api/groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: nonOwnerJWT,
        },
      });

      expect(response.status).toBe(403);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain('owner');
    });

    it('should reject unauthenticated deletion attempts', async () => {
      const groupId = 'graduated-no-kids';

      const response = await fetch(`http://localhost:8787/api/groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header
        },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Not found errors (404)', () => {
    it('should return 404 for non-existent group', async () => {
      const nonExistentId = 'notfound';

      const response = await fetch(`http://localhost:8787/api/groups/${nonExistentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockJWT,
        },
      });

      expect(response.status).toBe(404);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain('not found');
    });
  });

  describe('Response format validation', () => {
    it('should return proper error format for 409 with children list', async () => {
      const parentId = 'parent-with-2-kids';

      const response = await fetch(`http://localhost:8787/api/groups/${parentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockJWT,
        },
      });

      expect(response.status).toBe(409);

      const data = (await response.json()) as {
        error: string;
        children: Array<{
          id: string;
          name: string;
        }>;
      };

      // Validate error message structure
      expect(data.error).toBeTruthy();
      expect(typeof data.error).toBe('string');

      // Validate children array structure
      expect(Array.isArray(data.children)).toBe(true);
      expect(data.children.length).toBeGreaterThan(0);

      // Validate child object structure
      const firstChild = data.children[0];
      expect(firstChild).toHaveProperty('id');
      expect(firstChild).toHaveProperty('name');
      expect(typeof firstChild.id).toBe('string');
      expect(typeof firstChild.name).toBe('string');
    });
  });
});
