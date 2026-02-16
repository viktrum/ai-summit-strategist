# TODO: Email Capture Rules Engine (Open-Source Candidate)

**Created**: Feb 16, 2026
**Status**: Idea — not yet implemented
**Priority**: Post Day 3 deploy

---

## The Problem

Email capture timing/targeting needs complex rules:
- Different triggers per page (Plan, Explore, Home)
- Different triggers per day (progressive rollout)
- Different copy per user type (has plan vs no plan)
- Global frequency caps (max N impressions lifetime, per session, per page)
- Cross-page coordination (shown on Plan → skip on Explore this session)
- Dismissal memory (session vs permanent)

Building this ad-hoc = spaghetti. A rules engine would make it declarative.

---

## Vision: Declarative Communication Rules Engine

```typescript
const emailCaptureRules = defineRules({
  globalCaps: {
    maxLifetimeImpressions: 5,
    maxSessionImpressions: 2,
    maxPerPagePerSession: 1,
  },
  contexts: [
    {
      id: 'plan-page-returning',
      page: 'plan',
      dateRange: ['2026-02-18', null],  // Day 3 onward
      userFilter: { hasPlan: true, isReturning: true },
      trigger: 'immediate',
      copy: { headline: 'Post-Summit Intelligence Brief', ... },
    },
    {
      id: 'plan-page-sameday',
      page: 'plan',
      dateRange: ['2026-02-18', null],
      userFilter: { hasPlan: true, isReturning: false },
      trigger: { type: 'visit', minVisits: 2 },
      copy: { ... },
    },
    {
      id: 'explore-with-plan',
      page: 'explore',
      dateRange: ['2026-02-19', null],  // Day 4 onward
      userFilter: { hasPlan: true },
      trigger: { type: 'time', delaySeconds: 45 },
      copy: { ... },
    },
    // ... more contexts
  ],
});
```

## Open-Source Potential

This pattern applies to any app that needs contextual, frequency-capped communication:
- SaaS onboarding modals
- Feature announcements
- Upgrade prompts
- Survey triggers
- Conference/event apps

### Package name ideas
- `capture-rules`
- `comm-engine`
- `nudge-engine`

---

## Current State

- **Shipped**: Simple email capture on Plan page only (Day 3+, returning users or 2nd visit)
- **Next**: Explore page (Day 4+), Home page (Day 5+)
- **Long-term**: Extract rules engine into standalone package

---

## Progressive Rollout Matrix (for reference)

| Day | Page | User Type | Show? | Copy |
|-----|------|-----------|-------|------|
| Day 1-2 | All | All | No | — |
| Day 3 | Plan | Has plan, returning/2nd visit | Yes | Post-Summit Brief (personalized) |
| Day 4 | Plan | Same as Day 3 | Yes | Same |
| Day 4 | Explore | Has plan | Yes | Brief (lighter, references plan) |
| Day 4 | Explore | No plan | Yes | Generic summit insights |
| Day 5+ | All pages | Has plan | Yes | Same as above |
| Day 5+ | All pages | No plan | Yes | Generic summit recap |

**Global caps**: Max 5 lifetime, max 2 per session, max 1 per page per session.
**Dismissal**: Per page per session. Submit = never again.
