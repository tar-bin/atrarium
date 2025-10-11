# Quickstart: Communities Hierarchy API

**Feature**: 019-communities-api-api
**Purpose**: Validate complete implementation of all 6 hierarchy API endpoints
**Duration**: ~5 minutes

## Prerequisites

- [ ] Local PDS running (`pnpm --filter server dev`)
- [ ] Test accounts created (alice.test, bob.test)
- [ ] Server running with Durable Objects enabled

## Test Scenario: Complete Hierarchy Lifecycle

### 1. Setup: Create Parent Community

Create a community that will be upgraded to graduated stage.

```bash
# Login as Alice
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"handle": "alice.test", "password": "test123"}'

# Save JWT token
export ALICE_TOKEN="<token>"

# Create parent community
curl -X POST http://localhost:8787/api/communities \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Tech Hub", "description": "Technology community"}'

# Save community ID
export PARENT_ID="<returned_id>"
```

**Expected Result**:
- Community created with `stage: "theme"`
- Community ID saved in `$PARENT_ID`

### 2. Upgrade to Community Stage

```bash
# Upgrade theme → community (requires 10+ members)
# Note: Add 10 test members first, or mock member count for testing

curl -X POST "http://localhost:8787/api/communities/$PARENT_ID/upgrade" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"groupId": "'$PARENT_ID'", "targetStage": "community"}'
```

**Expected Result**:
- Community upgraded to `stage: "community"`
- `updatedAt` timestamp set

**Expected Error (if insufficient members)**:
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Community has X members, requires 10 for community stage"
  }
}
```

### 3. Upgrade to Graduated Stage

```bash
# Upgrade community → graduated (requires 50+ members)
# Note: Add 50 test members first, or mock member count for testing

curl -X POST "http://localhost:8787/api/communities/$PARENT_ID/upgrade" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"groupId": "'$PARENT_ID'", "targetStage": "graduated"}'
```

**Expected Result**:
- Community upgraded to `stage: "graduated"`
- Now capable of creating children

### 4. Create Child Theme

```bash
# Create child theme under graduated parent
curl -X POST "http://localhost:8787/api/communities/$PARENT_ID/children" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parentId": "'$PARENT_ID'",
    "name": "Design Theme",
    "description": "UI/UX design discussions",
    "feedMix": {
      "own": 50,
      "parent": 30,
      "global": 20
    }
  }'

# Save child ID
export CHILD_ID="<returned_id>"
```

**Expected Result**:
- Child created with `stage: "theme"`
- `parentGroup` set to parent AT-URI
- `feedMix` set to specified ratios
- Child ID saved in `$CHILD_ID`

**Expected Error (if parent not graduated)**:
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Only graduated communities can have children"
  }
}
```

### 5. List Children

```bash
# List all children of parent community
curl "http://localhost:8787/api/communities/$PARENT_ID/children?limit=10"
```

**Expected Result**:
```json
{
  "children": [
    {
      "id": "<CHILD_ID>",
      "name": "Design Theme",
      "description": "UI/UX design discussions",
      "stage": "theme",
      "hashtag": "#atrarium_<8-hex>",
      "parentGroup": "at://did:plc:xxx/net.atrarium.group.config/<PARENT_ID>",
      "memberCount": 1,
      "postCount": 0,
      "feedMix": { "own": 50, "parent": 30, "global": 20 },
      "createdAt": 1234567890
    }
  ],
  "cursor": null
}
```

### 6. Get Parent Community

```bash
# Get parent of child community
curl "http://localhost:8787/api/communities/$CHILD_ID/parent"
```

**Expected Result**:
```json
{
  "id": "<PARENT_ID>",
  "name": "Tech Hub",
  "description": "Technology community",
  "stage": "graduated",
  "hashtag": "#atrarium_<8-hex>",
  "memberCount": 50,
  "postCount": 100,
  "children": ["<CHILD_ID>"],
  "createdAt": 1234567890,
  "updatedAt": 1234568000
}
```

### 7. Attempt Downgrade with Children (Should Fail)

```bash
# Try to downgrade graduated community with children
curl -X POST "http://localhost:8787/api/communities/$PARENT_ID/downgrade" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"groupId": "'$PARENT_ID'", "targetStage": "community"}'
```

**Expected Error**:
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Cannot downgrade community with active children"
  }
}
```

### 8. Delete Empty Child

```bash
# Delete child theme (empty, no members/posts)
curl -X DELETE "http://localhost:8787/api/communities/$CHILD_ID" \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Result**:
```json
{
  "success": true,
  "deletedId": "<CHILD_ID>"
}
```

### 9. Downgrade Parent After Child Deletion

```bash
# Now downgrade should succeed (no children)
curl -X POST "http://localhost:8787/api/communities/$PARENT_ID/downgrade" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"groupId": "'$PARENT_ID'", "targetStage": "community"}'
```

**Expected Result**:
- Community downgraded to `stage: "community"`
- Cannot create new children until upgraded back to graduated

### 10. Attempt Delete with Members (Should Fail)

```bash
# Try to delete community with active members
curl -X DELETE "http://localhost:8787/api/communities/$PARENT_ID" \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Error**:
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Community has 50 active members, cannot delete"
  }
}
```

## Validation Checklist

After completing the scenario, verify:

- [ ] ✅ Create child: Graduated parent can create theme children
- [ ] ✅ Create child (fail): Non-graduated parent cannot create children
- [ ] ✅ Upgrade: Stage transitions work with member count validation
- [ ] ✅ Downgrade: Stage transitions work in reverse
- [ ] ✅ Downgrade (fail): Cannot downgrade graduated with children
- [ ] ✅ List children: Returns all children sorted by creation date
- [ ] ✅ Get parent: Returns parent metadata for child themes
- [ ] ✅ Get parent (null): Returns null for top-level communities
- [ ] ✅ Delete: Empty community can be deleted
- [ ] ✅ Delete (fail): Non-empty community cannot be deleted

## Edge Cases to Test

### Circular Reference Prevention

```bash
# Create parent A
export PARENT_A="<id>"

# Create child B under A
export CHILD_B="<id>"

# Upgrade B to graduated (after adding members)
# Try to create A as child of B (should fail - circular)
curl -X POST "http://localhost:8787/api/communities/$CHILD_B/children" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"parentId": "'$CHILD_B'", "name": "'$PARENT_A'"}'
```

**Expected Error**:
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Circular parent-child relationship detected"
  }
}
```

### Feed Mix Validation

```bash
# Create child with invalid feed mix (doesn't sum to 100)
curl -X POST "http://localhost:8787/api/communities/$PARENT_ID/children" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parentId": "'$PARENT_ID'",
    "name": "Invalid Mix",
    "feedMix": {
      "own": 50,
      "parent": 30,
      "global": 30
    }
  }'
```

**Expected Error**:
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Feed mix ratios must sum to 100"
  }
}
```

### Permission Validation

```bash
# Login as Bob
export BOB_TOKEN="<bob_token>"

# Try to create child under Alice's community (should fail)
curl -X POST "http://localhost:8787/api/communities/$PARENT_ID/children" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"parentId": "'$PARENT_ID'", "name": "Bob Child"}'
```

**Expected Error**:
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only parent owner can create children"
  }
}
```

## Performance Validation

All operations should complete within target latency (p95 <200ms):

```bash
# Run 100 iterations and measure latency
for i in {1..100}; do
  time curl -s "http://localhost:8787/api/communities/$PARENT_ID/children" > /dev/null
done

# Expected: p95 latency <100ms for list operation
```

## Troubleshooting

**Issue**: "Community has X members, requires Y for {stage}"
- **Solution**: Add more test members or temporarily adjust member count validation for testing

**Issue**: "Cannot downgrade community with active children"
- **Solution**: Delete or reassign children first

**Issue**: "Circular parent-child relationship detected"
- **Solution**: Verify hierarchy logic (A cannot be parent and child simultaneously)

**Issue**: "Feed mix ratios must sum to 100"
- **Solution**: Ensure own + parent + global = 100

**Issue**: Durable Object not found
- **Solution**: Restart server to reinitialize Durable Objects

## Success Criteria

✅ All 10 test steps pass
✅ All 3 edge case tests pass
✅ All error scenarios return correct error codes
✅ All operations complete within latency targets
✅ No console errors or warnings
✅ Durable Object state consistent with PDS records

## Next Steps

After validation:

1. Run integration tests: `pnpm --filter server test:integration`
2. Run contract tests: `pnpm --filter server test:contract`
3. Update CLAUDE.md with completion status
4. Create PR for code review
