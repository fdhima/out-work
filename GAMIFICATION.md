# OutWork Gamification Plan — WorkNomad Passport

## Overview

The **WorkNomad Passport** is OutWork's unique gamification layer. Unlike generic point systems, it frames workspace discovery as a collector's journey: every place you visit, review, or report on earns an ink stamp in your digital passport. Complete neighborhoods, unlock titles, climb city leaderboards.

This system differentiates OutWork in the market because it ties identity and social status directly to the core product loop — discovering new places to work.

---

## Current Contribution Actions (no gamification today)

| Action | File |
|--------|------|
| Post a review | `services/reviews.ts` → `createReview()` |
| Submit crowd report | `services/crowd.ts` → `addCrowdReport()` |
| Save a favorite | `services/favorites.ts` → `addFavoriteApi()` |
| Sign up | `app/auth/signup.tsx` |

None of these currently reward the user. All four are natural trigger points for XP grants.

---

## Core Mechanics

### 1. XP & Levels (Contribution Points)

Every action earns XP. XP accumulates and determines the user's **WorkNomad Rank**.

| Action | XP |
|--------|----|
| Post a review (with text) | +50 XP |
| Post a review (with sub-ratings filled) | +20 XP bonus |
| Submit a crowd report | +15 XP |
| First review at a place | +30 XP bonus ("First Scout") |
| Add a new place | +100 XP |

**Rank Tiers:**

| Rank | XP Required | Title |
|------|-------------|-------|
| 1 | 0 | Desk Lurker |
| 2 | 150 | Coffee Scout |
| 3 | 500 | WiFi Wanderer |
| 4 | 1,200 | Office Nomad |
| 5 | 3,000 | WorkNomad Pro |
| 6 | 7,500 | Workspace Legend |

The rank title replaces the generic avatar subtitle in `app/(tabs)/settings.tsx` (the profile card at line 140–154).

---

### 2. WorkNomad Passport (The Unique Hook)

The passport is a visual collection screen — each workspace the user has reviewed or crowd-reported appears as an illustrated "stamp". Stamps are grouped by city/neighborhood.

**Mechanics:**
- Visiting (reviewing or reporting) a place earns its stamp.
- Completing all stamps in a neighborhood unlocks a **Neighborhood Badge** (e.g., "Soho Regular", "Downtown Grinder").
- Completing all neighborhoods in a city unlocks a **City Passport Page** — a shareable card with all stamps rendered together.

**Why it's sticky:** The passport creates a completionist loop. Users explore new neighborhoods not just to find good spots, but to fill gaps in their passport. This drives organic discovery and repeat engagement.

---

### 3. Badges (One-Time Achievements)

Badges are awarded once and displayed on the profile card. They are permanently visible and social-proof the user's contributions.

| Badge | Trigger |
|-------|---------|
| 🌟 First Steps | Post your first review |
| 👥 Crowd Whisperer | Submit 10 crowd reports |
| 🗺️ Explorer | Visit (review/report) 10 different places |
| 🔍 First Scout | Be the first to review a place |
| ⭐ Critic | Post 5 reviews with all sub-ratings filled |
| 🏙️ City Nomad | Earn stamps in 5+ different neighborhoods |
| 🔥 On a Roll | Submit crowd reports 5 days in a row |
| 🧭 WorkNomad Legend | Reach rank 6 |
| 📍 Place Publisher | Add your first workspace |
| 🏗️ Space Creator | Add 5 workspaces |

---

### 4. Leaderboard (Social Hook)

A weekly leaderboard of top XP earners, scoped to the user's city (derived from their most-reviewed locations). Displayed in the Explore tab.

- Resets every Monday.
- Top 3 get a temporary crown icon on their profile.
- Encourages friendly competition between regulars.

---

## Database Schema (Supabase)

### New tables

```sql
-- Tracks total XP and rank per user
CREATE TABLE user_gamification (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  xp INT NOT NULL DEFAULT 0,
  rank_level INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permanent log of every XP event
CREATE TABLE xp_events (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  xp_amount INT NOT NULL,
  reason TEXT NOT NULL, -- 'review', 'crowd_report', 'first_scout', 'sub_rating_bonus'
  reference_id TEXT,    -- review id or place id for traceability
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- One row per (user, badge) — insert-only
CREATE TABLE user_badges (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,           -- e.g. 'first_steps', 'explorer'
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, badge_key)
);

-- One row per (user, place) = one passport stamp
CREATE TABLE passport_stamps (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  place_id INT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, place_id)
);
```

### Existing tables to read (no changes needed)

- `reviews` — count per user, first-review detection
- `place_crowd_reports` — count per user, streak detection
- `profiles` — user identity for display
- `places` — neighborhood/city grouping for passport pages

---

## New Service: `services/gamification.ts`

This service is the single source of truth for all gamification logic. It is called from existing services after their primary write succeeds.

```typescript
// Key functions to implement:

// Grant XP and update rank, return new totals
grantXp(profileId: string, amount: number, reason: string, referenceId?: string): Promise<{ newXp: number; newRank: number; rankedUp: boolean }>

// Check and award any newly unlocked badges
checkAndAwardBadges(profileId: string): Promise<string[]>  // returns newly awarded badge keys

// Upsert a passport stamp for a (user, place) pair
awardPassportStamp(profileId: string, placeId: number): Promise<boolean>  // returns true if new stamp

// Fetch the user's full gamification profile (XP, rank, badges, stamp count)
getGamificationProfile(profileId: string): Promise<GamificationProfile>

// Fetch weekly leaderboard entries for a city
getLeaderboard(city: string, limit?: number): Promise<LeaderboardEntry[]>
```

### Integration points in existing code

**`app/components/ReviewForm.tsx` — after `createReview()` succeeds (line 87–95):**
```typescript
// After onReviewPosted?.()
const { grantXp, checkAndAwardBadges, awardPassportStamp } = useGamification()
await awardPassportStamp(session.user.id, placeForReview.id)
const { rankedUp, newRank } = await grantXp(session.user.id, 50, 'review', String(review.id))
if (wifiSpeed && noiseLevel && seatComfort) {
  await grantXp(session.user.id, 20, 'sub_rating_bonus', String(review.id))
}
const newBadges = await checkAndAwardBadges(session.user.id)
// Trigger celebration UI if rankedUp or newBadges.length > 0
```

**`app/components/CrowdLevelModal.tsx` — after `onSubmit()` handler in the parent:**
```typescript
await grantXp(session.user.id, 15, 'crowd_report', String(placeId))
await awardPassportStamp(session.user.id, placeId)
await checkAndAwardBadges(session.user.id)
```

---

## New UI Components

### `app/components/gamification/XpToast.tsx`
A bottom-of-screen toast that slides up after an action, shows "+50 XP" and animates away. Triggered from ReviewForm and CrowdLevelModal. Uses `react-native-reanimated` (already in project) for the slide+fade animation.

### `app/components/gamification/RankUpModal.tsx`
A full-screen celebration modal shown when the user crosses a rank threshold. Displays the new rank name and a confetti burst. Uses `react-native-reanimated` for particle animation. Dismisses on tap.

### `app/components/gamification/BadgeAwardedSheet.tsx`
A bottom sheet (same pattern as `CrowdLevelModal.tsx`) shown when a new badge is unlocked. Shows the badge emoji, name, and a short description.

### `app/(tabs)/passport.tsx` — New Tab Screen
The passport screen. Layout:
- Header: user rank title, XP bar showing progress to next rank.
- Badge shelf: horizontal scroll of earned badges (grayed out unearned ones to drive completion).
- Passport pages: grouped by city, each page shows a grid of circular stamps (one per place). Tapping a stamp navigates to that place's detail screen.
- Neighborhood completion banners between groups.

### `app/components/gamification/LeaderboardCard.tsx`
A ranked list card used inside the Explore tab or as a section in the passport screen. Shows rank #, avatar initial, name, XP, and a crown icon for top 3.

---

## Tab Navigation Change

Add the Passport tab to `app/(tabs)/_layout.tsx`. Icon: a passport/book icon from `MaterialIcons` (`menu-book` or `book`). Place it between Home and Explore, or as the 4th tab after Favorites.

---

## Implementation Phases

### Phase 1 — Backend & Core XP (Week 1)
- [ ] Apply Supabase migrations for the 4 new tables
- [ ] Implement `services/gamification.ts` with `grantXp`, `checkAndAwardBadges`, `awardPassportStamp`
- [ ] Wire XP grants into `ReviewForm.tsx` and the crowd report handler in `PlaceDetailed.tsx`
- [ ] Build `XpToast.tsx` component

### Phase 2 — Profile & Badges (Week 2)
- [ ] Update `app/(tabs)/settings.tsx` profile card to show rank title and XP bar
- [ ] Implement `BadgeAwardedSheet.tsx`
- [ ] Implement `RankUpModal.tsx` with animation
- [ ] Build `getGamificationProfile()` and render badges on the settings/profile screen

### Phase 3 — Passport Screen (Week 3)
- [ ] Implement `getPassportStamps()` grouped by neighborhood/city
- [ ] Build `app/(tabs)/passport.tsx` with stamp grid layout
- [ ] Add Passport tab to `_layout.tsx`
- [ ] Neighborhood completion detection and badge rendering

### Phase 4 — Leaderboard (Week 4)
- [ ] Implement `getLeaderboard()` with weekly reset logic (Postgres function or scheduled job)
- [ ] Build `LeaderboardCard.tsx`
- [ ] Add leaderboard section to Explore tab or Passport screen

---

## Design Principles

- **Non-intrusive by default**: XP toasts are small and auto-dismiss. The modal only appears on rank-up or new badge.
- **Respect the existing dark/light theme**: All new components must read `useColorScheme()` and the project's existing `isDark` pattern (see `CrowdLevelModal.tsx:59`).
- **No fabricated progress**: Never show the user XP or badges they didn't earn. Badge unlock logic runs server-side or is verified against live Supabase counts.
- **Privacy**: Leaderboard uses `full_name` from `profiles` — users already provide this. No new personal data required.
- **Haptics**: Use `expo-haptics` (already imported in `settings.tsx`) on XP grant and badge award for satisfying tactile feedback.
