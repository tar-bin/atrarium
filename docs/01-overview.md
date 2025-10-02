# Atrarium Project Overview

**Last Updated**: 2025-10-02
**Version**: 2.0

---

## Table of Contents

1. [Vision](#vision)
2. [Problems Being Solved](#problems-being-solved)
3. [Target Users](#target-users)
4. [Why AT Protocol](#why-at-protocol)
5. [Core Design Philosophy](#core-design-philosophy)
6. [Market Research](#market-research)
7. [Competitive Analysis](#competitive-analysis)

---

## 🎯 Vision

**"Create countless small, comfortable public spaces on the internet that remain connected to the world"**

Specifically: **Support administrators who want to operate and maintain small communities (10-200 people)**

---

## 🚨 Problems Being Solved

### Structural Problems in the Fediverse

#### 1. Isolation of Small Servers
- **Abandonment rate**: 50-70% close within 1-2 years
- **Lack of discovery**: Cannot be found from outside
- **Fear of defederation**: Anxiety about being cut off by large servers

#### 2. Misaligned Interests

```
Large server perspective:
"Small servers have heavy federation costs"
"We'd prefer to defederate them"
"They're a burden"

Small server perspective:
"Federation with large servers is our lifeline"
"Constant fear of being cut off"
"Asymmetric relationship"
```

#### 3. Operational Burden

| Item | Burden |
|------|--------|
| **Operating cost** | $30-150/month |
| **Operating time** | 5 hours/week (unpaid) |
| **Technical load** | Server management, DB, security |
| **Legal risk** | Lawsuit risk, provider liability |
| **Moderation** | 24/7 monitoring (impossible alone) |

#### 4. Real-World Examples

**Spam Incident → Whitelist System**
- Spam originated from some small servers
- Large servers moved to whitelist for defense
- **Many innocent small servers were defederated**
- Small server admin: "We didn't do anything wrong..."

**mstdn.jp Closure Crisis (2020)**
- Large server with ~200k users
- Became difficult to handle due to strengthened provider liability laws
- Operating company: "Zero revenue, only one-sided expenses"
- Could not bear lawsuit risks

---

## 👥 Target Users

### Primary Target

**Small community (10-200 people) administrators**

Specifically:
- Mastodon/Misskey small server operators
- Discord small server administrators
- People who want to create new communities

### Market Size

**Japanese-speaking small instances: 450-800**

| Size | Instance Count |
|------|---------------|
| 10-30 people | 225-400 |
| 30-100 people | 150-300 |
| 100-200 people | 75-150 |

**Estimated user count**: 75,000-200,000 people

### User Personas

#### Persona 1: Misskey Server Admin
- 30s, engineer
- Started Misskey server 3 years ago
- Current active members: 8 (peak: 25)
- **Pain point**: "It's become deserted and sad. But I don't want to close it"

#### Persona 2: Discord Small Server Admin
- 20s, designer
- Hobby book club (12 people)
- **Pain point**: "Want more people, but not random strangers"

#### Persona 3: New Community Creator
- 40s, researcher
- Wants to create a community for specialized field (ecology)
- **Pain point**: "Technical barrier is too high"

---

## 🔑 Why AT Protocol

### How AT Protocol Solves Fediverse Problems

| Challenge | Fediverse | AT Protocol |
|-----------|-----------|-------------|
| **Abandonment** | Isolation, not discovered | Inflow from Bluesky population (30M+) |
| **Discoverability** | Low | Discoverable via Custom Feeds |
| **Operational load** | Server management required | Shared infrastructure |
| **Federation risk** | Fear of defederation | No risk |
| **Data ownership** | Server dependent | Independent via DID |
| **Migration cost** | High | Zero |

### 4 Key Strengths of AT Protocol

#### 1. Bluesky Population (30M+ users)
- Guarantees connection to the world
- Small communities can still be discovered
- **The key to solving Misskey's small server problem**

#### 2. DID (Decentralized Identity)
- Accounts are independent from communities
- No cost for server migration
- Can belong to multiple communities simultaneously
- Easy to "gather again" even after splits

#### 3. Custom Feeds Flexibility
- Create multiple "places" on the same infrastructure
- Dynamic filtering by theme
- Easy to merge when deserted, split when thriving

#### 4. Avoiding ActivityPub Problems
- Unified implementation
- Light federation communication load
- High maintainability

---

## 💡 Core Design Philosophy

### 1. Dynamic Maintenance of "Appropriate Size"

**Basic Philosophy**
- Too small → Becomes deserted
- Too large → Becomes uncomfortable
- **Always maintain "just right"**

**Design Based on Dunbar's Number**
- Phase 0 (Theme): ~15 people (close friends layer)
- Phase 1 (Community): ~50 people (culture formation)
- Phase 2 (Graduation): ~150 people (cognitive limit)

### 2. Growth Lifecycle (3 Stages)

```
Stage 1: Theme Feed (Trial)
  ↓ People gather, becomes active

Stage 2: Community (Independent)
  ↓ Further growth or different direction

Stage 3: Graduation (New horizons)
```

**Important Principle**
- **All choices are positive**
- Split = Not failure, but proof of growth
- Return to parent = Wise choice
- Closure = A natural conclusion

### 3. Membrane Model

**Neither completely closed nor completely open**

```
Community feed composition:
- 80%: Posts from within community
- 15%: "Recommendations" from parent or related communities
- 5%: "Trending" from Bluesky global

→ Not isolated, always feeling the pulse of the world
```

**Adjustable**
- Fully closed: 100-0-0%
- Semi-open: 80-20-0%
- Fully open: Integrated with Bluesky main feed

### 4. Respect for Data Ownership

**Aligned with AT Protocol Design Philosophy**

```
Data owner = User
This system = Index provider

→ If PDS disappears, data also disappears
→ This is a "specification", not a "bug"
```

**Implementation Impact**
- No media storage needed (no R2)
- Don't save post content
- Only save URIs (references)
- Cache for 7 days only

### 5. Achievement System (Gamification)

**All choices unlock achievements**

| Action | Achievement | Message |
|--------|-------------|---------|
| Create theme | 🌱 Theme Creator | You've planted a new seed |
| Independence | 🏆 First Split | Congratulations on your independence |
| Graduation | 🎓 Mentor | You've nurtured the next generation |
| Return to parent | 🔄 Reintegration | A wise choice |
| Owner transfer | 🎁 Succession | You've passed the baton |
| Closure | 📦 Archive | A natural conclusion |

**Rarity**
- Common: Anyone can get
- Rare: 10-30% of users
- Epic: 5% of users
- Legendary: 1% of users

---

## 📊 Market Research

### Japanese-Speaking Fediverse Small Instances

#### Scale
- **Estimated count**: 450-800 instances
- **Mastodon**: 300-600
- **Misskey**: 150-200

#### Abandonment Rate
- **50-70% close within 1-2 years**
- Average operation period: 6-12 months
- 3+ years of operation: Very rare

#### 5 Structural Issues Leading to Closure

1. **Technical issues**
   - Server performance limits, DB inconsistency, backup failures

2. **Operating cost burden**
   - $15-450/month
   - Personal burden, donations difficult

3. **Legal liability and moderation burden**
   - Provider liability laws
   - 24/7 monitoring system (impossible for individuals)

4. **Community problems**
   - User conflicts
   - Downward spiral of abandonment
   - Exodus to large servers

5. **Administrator burnout**
   - Sole responsibility
   - More complaints than appreciation
   - Sacrifice of personal time

#### Needs for Operation Support Tools

**Top priorities (from operator voices)**
1. Moderation support (auto spam detection, report handling)
2. Legal risk response (disclosure requests, lawsuit handling)
3. Cost reduction (efficient storage, load reduction)
4. Operation automation (auto backup, monitoring)
5. Community formation support (initial user acquisition)

---

## 🔍 Competitive Analysis

### Similar Projects on AT Protocol

**Research result: No direct competitors**

| Project | Purpose | Competition Level |
|---------|---------|------------------|
| Smoke Signal | Event management | ❌ None |
| OpenMeet | Meetup alternative | △ Partial |
| Custom Feeds | Filtering | △ Use as foundation |
| Lists | User lists | △ Limited features |

**Uniqueness**
- Specialized for continuous community operation
- Staged growth model (Phase 0-2)
- Automated abandonment countermeasures
- Cell division model
- Moderation succession system

### Differentiation from Existing Platforms

| Element | Reddit | Discord | Mastodon | **This System** |
|---------|--------|---------|----------|-----------------|
| **Size optimization** | ✗ Manual | ✗ Manual | ✗ Server-based | **✓ Auto-adjust** |
| **Discoverability** | ✓ High | ✗ Low | ✗ Low | **✓ Via Bluesky** |
| **World connection** | △ Partial | ✗ Closed | △ Federation only | **✓ Layer structure** |
| **Migration cost** | ✗ High | ✗ High | △ Medium | **✓ Low (DID)** |
| **Operational load** | Corporate | △ High individual | ✗ High federation | **✓ Light** |

### Obsolescence Risk

**Bluesky Roadmap Analysis**

| Feature | Timeline | Risk |
|---------|----------|------|
| Auth Scopes | 2025 Q3-Q4 | Low (favorable for implementation) |
| Shared Data | 2026 Q2-Q3 | Medium (may become alternative) |
| E2EE DMs | 2026 Q4+ | Low (different use case) |

**Countermeasures**
- Complete implementation by end of 2025 (first-mover advantage)
- Differentiate with semi-open membrane model
- Focus on small community management (niche)

---

## Summary

### What This Project Is

**Not just a "community management system", but an attempt to recreate traditional public spaces (plazas, churches, libraries) on the internet**

### Innovation

1. **Dynamic size adjustment**: Automation to maintain appropriate size
2. **Membrane model**: Achieve middle ground between open and closed with layer structure
3. **Structured cell division**: System supports natural splits
4. **AT Protocol utilization**: Unique value through combination of DID and Custom Feeds

### Appeal (User Perspective)

1. **Safe to talk**: Not too many, not too few people
2. **Not isolated**: Feeling connected to the world
3. **Being discovered**: Small scale doesn't mean buried
4. **Free movement**: Easy to move between communities

### Appeal (Operator Perspective)

1. **Light operational load**: Shared infrastructure, no federation load
2. **No abandonment countermeasures needed**: Resolved with auto-integration
3. **Easy growth**: Inflow from Bluesky
4. **Distributed legal risk**: Position as tool provider

---

**Next Document: [System Design](02-system-design.md)**
