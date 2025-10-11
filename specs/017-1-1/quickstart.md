# Quickstart: Hierarchical Group System

**Feature**: 017-1-1
**Date**: 2025-10-11
**Prerequisites**: Local PDS running (via DevContainer), Server + Client dev servers started

---

## User Story Validation

This quickstart validates the primary user story from spec.md:
> Alice wants to create a graduated group with multiple specialized thematic discussion groups.

**Steps**:
1. Alice creates a Theme group ("Design Patterns")
2. Grows to ~15 members → upgrades to Group
3. Grows to ~50 members → upgrades to Graduated
4. Creates child Theme groups ("UI Patterns", "API Patterns", "Database Patterns")
5. Users browse hierarchy and discover child themes
6. Theme moderation performed by parent Graduated group's owner/moderators

---

## Prerequisites

### 1. Start Development Environment

```bash
# From repo root
./start-dev.sh all

# Services running:
# - PDS:    http://localhost:3000
# - Server: http://localhost:8787
# - Client: http://localhost:5173
```

### 2. Load Test Data

```bash
./scripts/load-test-data.sh

# Creates test accounts:
# - alice.test (password: test123)
# - bob.test (password: test123)
# - moderator.test (password: test123)
```

### 3. Login to Dashboard

1. Open http://localhost:5173
2. Login as `alice.test` / `test123`
3. Verify "Communities" page loads

---

## Step 1: Create Initial Theme Group

**Goal**: Alice creates a new Theme group

**Actions**:
1. Navigate to Communities page
2. Click "Create Group"
3. Fill form:
   - Name: "Design Patterns"
   - Description: "Discussing software design patterns"
   - (Parent: none - creating standalone theme)
4. Submit form

**Expected Result**:
```json
{
  "id": "<generated-id>",
  "name": "Design Patterns",
  "stage": "theme",
  "parentGroup": undefined,
  "hashtag": "#atrarium_a1b2c3d4",
  "memberCount": 1,
  "createdAt": "2025-10-11T..."
}
```

**Verification**:
- Group appears in alice.test's groups list
- Stage badge shows "Theme" (with ~15 member target)
- No "Create Child" button visible (only Graduated can create children)

---

## Step 2: Add Members (Reach ~15 Members)

**Goal**: Grow membership to trigger Group upgrade threshold

**Actions**:
1. Invite Bob to join "Design Patterns"
   ```bash
   # Via API or Dashboard UI
   POST /api/groups/{id}/memberships
   { "userDid": "did:plc:bob", "role": "member" }
   ```
2. Repeat for 13 more test users (reach 15 total members)

**Verification**:
```bash
# Query member count
curl http://localhost:8787/api/groups/{id}
# Response: { ..., "memberCount": 15 }
```

- Dashboard shows "Member count: 15 / ~15 (eligible for Group upgrade)"
- "Upgrade to Group" button appears (green highlight)

---

## Step 3: Upgrade to Group Stage

**Goal**: Alice upgrades theme to community stage

**Actions**:
1. Click "Upgrade to Group" button
2. Confirm modal: "Upgrade Design Patterns to Group stage?"
3. Submit

**API Call** (behind the scenes):
```typescript
await apiClient.groups.upgradeStage({
  groupId: '<design-patterns-id>',
  targetStage: 'community',
});
```

**Expected Result**:
```json
{
  "id": "<design-patterns-id>",
  "stage": "community",
  "memberCount": 15,
  "parentGroup": undefined,  // Still no parent (retained)
  "updatedAt": "2025-10-11T..."
}
```

**Verification**:
- Stage badge changes to "Group" (with ~50 member target)
- Moderation remains independent (no change from Theme)
- Still no "Create Child" button (need Graduated stage)

---

## Step 4: Add More Members (Reach ~50 Members)

**Goal**: Grow membership to trigger Graduated upgrade threshold

**Actions**:
1. Add 35 more members (15 → 50 total)
2. Monitor member count in Dashboard

**Verification**:
- Dashboard shows "Member count: 50 / ~50 (eligible for Graduated upgrade)"
- "Upgrade to Graduated" button appears

---

## Step 5: Upgrade to Graduated Stage

**Goal**: Alice upgrades group to graduated stage

**Actions**:
1. Click "Upgrade to Graduated" button
2. Confirm upgrade

**API Call**:
```typescript
await apiClient.groups.upgradeStage({
  groupId: '<design-patterns-id>',
  targetStage: 'graduated',
});
```

**Expected Result**:
```json
{
  "id": "<design-patterns-id>",
  "stage": "graduated",
  "memberCount": 50,
  "updatedAt": "2025-10-11T..."
}
```

**Verification**:
- Stage badge changes to "Graduated" (50+ members)
- **"Create Child Theme" button now visible** (key capability unlocked)
- Independent moderation continues

---

## Step 6: Create Child Theme Groups

**Goal**: Alice creates 3 child theme groups under "Design Patterns"

### 6a. Create "UI Patterns" Child

**Actions**:
1. Click "Create Child Theme"
2. Fill form:
   - Name: "UI Patterns"
   - Description: "User interface design patterns"
   - Parent: "Design Patterns" (auto-filled)
3. Submit

**API Call**:
```typescript
const uiPatterns = await apiClient.groups.createChild({
  parentId: '<design-patterns-id>',
  name: 'UI Patterns',
  description: 'User interface design patterns',
});
```

**Expected Result**:
```json
{
  "id": "<ui-patterns-id>",
  "name": "UI Patterns",
  "stage": "theme",  // Always created as Theme
  "parentGroup": "at://did:plc:alice/net.atrarium.group.config/<design-patterns-rkey>",
  "memberCount": 0,  // Newly created
  "createdAt": "2025-10-11T..."
}
```

**Verification**:
- Child appears in "Design Patterns" children list
- Parent link visible on child's detail page
- Stage is Theme (with ~15 member target)

### 6b. Create "API Patterns" and "Database Patterns" Children

**Actions**: Repeat step 6a for:
- Name: "API Patterns", Description: "REST, GraphQL, RPC patterns"
- Name: "Database Patterns", Description: "Data modeling and query patterns"

**Verification**:
- All 3 children visible in parent's children list
- Each child shows parent link: "Part of: Design Patterns"

---

## Step 7: Browse Hierarchical Structure

**Goal**: Users can navigate parent-child hierarchy

### 7a. View Parent with Children

**Actions**:
1. Navigate to "Design Patterns" detail page
2. Scroll to "Child Themes" section

**Expected UI**:
```
Design Patterns (Graduated, 50 members)
├─ UI Patterns (Theme, 0 members)
├─ API Patterns (Theme, 0 members)
└─ Database Patterns (Theme, 0 members)
```

**Verification**:
- Tree view shows hierarchy
- Click child name → navigates to child detail page
- Click parent name → navigates back to parent

### 7b. View Child with Parent Link

**Actions**:
1. Navigate to "UI Patterns" detail page
2. Check breadcrumb or parent link

**Expected UI**:
```
Design Patterns > UI Patterns

[Parent: Design Patterns (Graduated)]
```

**Verification**:
- Parent link visible and clickable
- Breadcrumb navigation works

---

## Step 8: Test Moderation Inheritance

**Goal**: Theme groups moderated by parent Graduated group's owner/moderators

### 8a. Post to Child Theme

**Actions**:
1. Login as `bob.test`
2. Post to "UI Patterns" theme: "Button component best practices?"

**Verification**:
- Post appears in "UI Patterns" timeline
- Post tagged with `#atrarium_<ui-patterns-hashtag>`

### 8b. Moderate from Parent

**Actions**:
1. Login as `alice.test` (owner of parent "Design Patterns")
2. Navigate to "UI Patterns" timeline
3. Moderate Bob's post (e.g., hide post)

**API Call**:
```typescript
await apiClient.moderation.hidePost({
  groupId: '<ui-patterns-id>',
  postUri: 'at://did:plc:bob/net.atrarium.group.post/<post-rkey>',
  reason: 'Off-topic',
});
```

**Expected Result**:
- Post hidden successfully
- Alice can moderate despite not being UI Patterns owner (moderation inherited)

**Verification**:
- Theme groups show "Moderated by: Design Patterns (parent)"
- Parent owner/moderators can moderate all child themes
- Child theme does not have separate moderator list

---

## Step 9: Test Deletion Blocking

**Goal**: Cannot delete parent with active children

### 9a. Attempt to Delete Parent

**Actions**:
1. Login as `alice.test`
2. Navigate to "Design Patterns" settings
3. Click "Delete Group"
4. Confirm deletion

**API Call**:
```typescript
await apiClient.groups.delete({
  groupId: '<design-patterns-id>',
});
```

**Expected Error**:
```json
{
  "error": "ConflictError",
  "message": "Cannot delete group with 3 active children. Delete children first: UI Patterns, API Patterns, Database Patterns"
}
```

**Verification**:
- Deletion blocked (409 Conflict)
- Error message lists child names
- Dashboard shows warning: "Remove child themes before deleting"

### 9b. Delete Child, Then Parent

**Actions**:
1. Delete all 3 child themes first
   ```typescript
   await apiClient.groups.delete({ groupId: '<ui-patterns-id>' });
   await apiClient.groups.delete({ groupId: '<api-patterns-id>' });
   await apiClient.groups.delete({ groupId: '<database-patterns-id>' });
   ```
2. Now delete parent "Design Patterns"

**Verification**:
- Parent deletion succeeds after children removed
- Dashboard confirms deletion

---

## Step 10: Test Stage Downgrade

**Goal**: Graduated can downgrade to Group/Theme (bidirectional)

**Actions**:
1. Create another Graduated group (50+ members, no children)
2. Click "Downgrade to Group"
3. Confirm downgrade

**API Call**:
```typescript
await apiClient.groups.downgradeStage({
  groupId: '<group-id>',
  targetStage: 'community',
});
```

**Expected Result**:
```json
{
  "id": "<group-id>",
  "stage": "community",
  "memberCount": 50,
  "updatedAt": "2025-10-11T..."
}
```

**Verification**:
- Stage badge changes to "Group"
- "Create Child Theme" button hidden (Group cannot create children)
- Moderation remains independent
- Can upgrade back to Graduated later

---

## Validation Checklist

After completing all steps, verify:

- [x] **FR-001a**: All groups created as Theme initially
- [x] **FR-003**: Theme → Group upgrade at ~15 members
- [x] **FR-004**: Group → Graduated upgrade at ~50 members
- [x] **FR-005**: Stage downgrades allowed (bidirectional)
- [x] **FR-006**: Child themes reference parent via AT-URI
- [x] **FR-007**: Parent reference immutable after creation
- [x] **FR-008**: Only Graduated can create children, children are Theme
- [x] **FR-008a**: 1-level hierarchy (no grandchildren)
- [x] **FR-011a**: Deletion blocked if children exist
- [x] **FR-019**: Theme moderation inherited from parent Graduated group
- [x] **FR-019a**: Group/Graduated have independent moderation
- [x] **FR-020**: Hierarchical structure browsable in Dashboard
- [x] **FR-021**: Parent-child relationships displayed
- [x] **FR-022**: Navigation between parent and children works

---

## Clean Up

```bash
# Stop dev servers
Ctrl+C in terminal running start-dev.sh

# Optional: Clear test data
docker compose -f .devcontainer/docker-compose.yml restart pds
```

---

## Success Criteria

✅ **User Story Validated**: Alice successfully:
1. Created Theme group
2. Upgraded to Group (~15 members) then Graduated (~50 members)
3. Created 3 child Theme groups
4. Browsed hierarchical structure
5. Moderated child themes as parent owner
6. Deletion blocked by children (then succeeded after cleanup)

✅ **All Acceptance Scenarios** (from spec.md) passed
✅ **Dunbar Thresholds** (~15, ~50) enforced
✅ **Hierarchy Constraints** (1-level, Graduated→Theme only) enforced
✅ **Moderation Inheritance** (Theme uses parent's) working
✅ **Deletion Blocking** (cannot delete parent with children) working

**Quickstart Complete** - Feature implementation validated end-to-end.
