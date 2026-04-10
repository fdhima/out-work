import { supabase } from '@/lib/supabase';

// ─── Rank configuration ────────────────────────────────────────────────────────

export const RANKS = [
  { level: 1, title: 'Desk Lurker',      minXp: 0 },
  { level: 2, title: 'Coffee Scout',     minXp: 150 },
  { level: 3, title: 'WiFi Wanderer',    minXp: 500 },
  { level: 4, title: 'Office Nomad',     minXp: 1200 },
  { level: 5, title: 'WorkNomad Pro',    minXp: 3000 },
  { level: 6, title: 'Workspace Legend', minXp: 7500 },
] as const;

// Static require map — bundler resolves these at build time
export const RANK_IMAGES: Record<number, ReturnType<typeof require>> = {
  1: require('@/assets/images/rank_desk_lurker.png'),
  2: require('@/assets/images/rank_coffee_scout.png'),
  3: require('@/assets/images/rank_wifi_wanderer.png'),
  4: require('@/assets/images/rank_office_nomad.png'),
  5: require('@/assets/images/rank_worknomad_pro.png'),
  6: require('@/assets/images/rank_workspace_legend.png'),
};

export const XP_REWARDS = {
  review: 50,
  sub_rating_bonus: 20,
  first_scout: 30,
  crowd_report: 15,
  add_place: 100,
} as const;

export type XpReason = keyof typeof XP_REWARDS;

// ─── Badge configuration ───────────────────────────────────────────────────────

export const BADGES: Record<string, { emoji: string; name: string; desc: string }> = {
  first_steps:       { emoji: '🌟', name: 'First Steps',       desc: 'Posted your first review' },
  crowd_whisperer:   { emoji: '👥', name: 'Crowd Whisperer',   desc: 'Submitted 10 crowd reports' },
  explorer:          { emoji: '🗺️', name: 'Explorer',          desc: 'Visited 10 different places' },
  first_scout:       { emoji: '🔍', name: 'First Scout',       desc: 'First to review a place' },
  critic:            { emoji: '⭐', name: 'Critic',            desc: '5 reviews with all sub-ratings' },
  city_nomad:        { emoji: '🏙️', name: 'City Nomad',        desc: 'Stamped 5+ different neighborhoods' },
  on_a_roll:         { emoji: '🔥', name: 'On a Roll',         desc: 'Crowd reports 5 days in a row' },
  workspace_legend:  { emoji: '🧭', name: 'Workspace Legend',  desc: 'Reached the highest rank' },
  place_publisher:   { emoji: '📍', name: 'Place Publisher',   desc: 'Added your first workspace to OutWork' },
  space_creator:     { emoji: '🏗️', name: 'Space Creator',     desc: 'Added 5 workspaces to OutWork' },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GamificationProfile {
  xp: number;
  rankLevel: number;
  rankTitle: string;
  xpToNextRank: number | null; // null at max rank
  xpInCurrentRank: number;
  rankProgressPct: number;     // 0–1
  badges: string[];
  stampCount: number;
}

export interface LeaderboardEntry {
  profileId: string;
  fullName: string;
  xp: number;
  rankLevel: number;
  rankTitle: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rankForXp(xp: number): (typeof RANKS)[number] {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.minXp) rank = r;
  }
  return rank;
}

// ─── Core functions ────────────────────────────────────────────────────────────

/**
 * Grant XP to the authenticated user, recalculate rank, and log the event.
 * Returns the updated totals and whether the user just levelled up.
 */
export async function grantXp(
  profileId: string,
  amount: number,
  reason: XpReason,
  referenceId?: string,
): Promise<{ newXp: number; newRank: number; rankedUp: boolean }> {
  // Log the XP event
  await supabase.from('xp_events').insert({
    profile_id: profileId,
    xp_amount: amount,
    reason,
    reference_id: referenceId ?? null,
  });

  // Upsert user_gamification row
  const { data: existing } = await supabase
    .from('user_gamification')
    .select('xp, rank_level')
    .eq('profile_id', profileId)
    .maybeSingle();

  const prevXp = existing?.xp ?? 0;
  const prevRank = existing?.rank_level ?? 1;
  const newXp = prevXp + amount;
  const newRankObj = rankForXp(newXp);
  const newRank = newRankObj.level;

  await supabase.from('user_gamification').upsert(
    { profile_id: profileId, xp: newXp, rank_level: newRank, updated_at: new Date().toISOString() },
    { onConflict: 'profile_id' },
  );

  return { newXp, newRank, rankedUp: newRank > prevRank };
}

/**
 * Check which badges the user has now earned but hasn't been awarded yet.
 * Inserts newly earned badges and returns their keys.
 */
export async function checkAndAwardBadges(profileId: string): Promise<string[]> {
  // Fetch already-awarded badges
  const { data: existing } = await supabase
    .from('user_badges')
    .select('badge_key')
    .eq('profile_id', profileId);

  const alreadyAwarded = new Set((existing ?? []).map((r: any) => r.badge_key));
  const toAward: string[] = [];

  // ── first_steps: posted at least 1 review ─────────────────────────────────
  if (!alreadyAwarded.has('first_steps')) {
    const { count } = await supabase
      .from('xp_events')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('reason', 'review');
    if ((count ?? 0) >= 1) toAward.push('first_steps');
  }

  // ── crowd_whisperer: 10+ crowd reports ────────────────────────────────────
  if (!alreadyAwarded.has('crowd_whisperer')) {
    const { count } = await supabase
      .from('xp_events')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('reason', 'crowd_report');
    if ((count ?? 0) >= 10) toAward.push('crowd_whisperer');
  }

  // ── explorer: stamps at 10+ distinct places ───────────────────────────────
  if (!alreadyAwarded.has('explorer')) {
    const { count } = await supabase
      .from('passport_stamps')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId);
    if ((count ?? 0) >= 10) toAward.push('explorer');
  }

  // ── first_scout: ever been the first to review a place ────────────────────
  if (!alreadyAwarded.has('first_scout')) {
    const { count } = await supabase
      .from('xp_events')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('reason', 'first_scout');
    if ((count ?? 0) >= 1) toAward.push('first_scout');
  }

  // ── critic: 5+ reviews with the sub_rating_bonus ─────────────────────────
  if (!alreadyAwarded.has('critic')) {
    const { count } = await supabase
      .from('xp_events')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('reason', 'sub_rating_bonus');
    if ((count ?? 0) >= 5) toAward.push('critic');
  }

  // ── workspace_legend: reached rank 6 ─────────────────────────────────────
  if (!alreadyAwarded.has('workspace_legend')) {
    const { data: gData } = await supabase
      .from('user_gamification')
      .select('rank_level')
      .eq('profile_id', profileId)
      .maybeSingle();
    if ((gData?.rank_level ?? 0) >= 6) toAward.push('workspace_legend');
  }

  // ── place_publisher: added at least 1 place ───────────────────────────────
  if (!alreadyAwarded.has('place_publisher')) {
    const { count } = await supabase
      .from('xp_events')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('reason', 'add_place');
    if ((count ?? 0) >= 1) toAward.push('place_publisher');
  }

  // ── space_creator: added 5+ places ───────────────────────────────────────
  if (!alreadyAwarded.has('space_creator')) {
    const { count } = await supabase
      .from('xp_events')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('reason', 'add_place');
    if ((count ?? 0) >= 5) toAward.push('space_creator');
  }

  if (toAward.length === 0) return [];

  await supabase.from('user_badges').insert(
    toAward.map(badge_key => ({ profile_id: profileId, badge_key })),
  );

  return toAward;
}

/**
 * Insert a passport stamp for (profileId, placeId).
 * Returns true if this is a new stamp, false if already existed.
 */
export async function awardPassportStamp(
  profileId: string,
  placeId: number,
): Promise<boolean> {
  const { error } = await supabase
    .from('passport_stamps')
    .insert({ profile_id: profileId, place_id: placeId });

  // 23505 = unique_violation (already stamped)
  if (error && error.code !== '23505') {
    console.error('passport stamp error', error);
  }
  return !error;
}

/**
 * Check whether this is the first-ever review for a given place.
 * If so, grant the first_scout bonus XP.
 */
export async function checkFirstScout(
  profileId: string,
  placeId: number,
): Promise<boolean> {
  const { count } = await supabase
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('place_id', placeId);

  // count includes the just-inserted review, so <=1 means it's the first
  if ((count ?? 0) <= 1) {
    await grantXp(profileId, XP_REWARDS.first_scout, 'first_scout', String(placeId));
    return true;
  }
  return false;
}

/**
 * Fetch the full gamification profile for a user.
 */
export async function getGamificationProfile(
  profileId: string,
): Promise<GamificationProfile> {
  const [gamRes, badgesRes, stampsRes] = await Promise.all([
    supabase
      .from('user_gamification')
      .select('xp, rank_level')
      .eq('profile_id', profileId)
      .maybeSingle(),
    supabase
      .from('user_badges')
      .select('badge_key')
      .eq('profile_id', profileId),
    supabase
      .from('passport_stamps')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId),
  ]);

  const xp = gamRes.data?.xp ?? 0;
  const rankLevel = gamRes.data?.rank_level ?? 1;
  const rankObj = RANKS.find(r => r.level === rankLevel) ?? RANKS[0];
  const nextRankObj = RANKS.find(r => r.level === rankLevel + 1) ?? null;

  const xpInCurrentRank = xp - rankObj.minXp;
  const xpToNextRank = nextRankObj ? nextRankObj.minXp - xp : null;
  const rankRange = nextRankObj ? nextRankObj.minXp - rankObj.minXp : 1;
  const rankProgressPct = nextRankObj
    ? Math.min(xpInCurrentRank / rankRange, 1)
    : 1;

  return {
    xp,
    rankLevel,
    rankTitle: rankObj.title,
    xpToNextRank,
    xpInCurrentRank,
    rankProgressPct,
    badges: (badgesRes.data ?? []).map((r: any) => r.badge_key),
    stampCount: stampsRes.count ?? 0,
  };
}

/**
 * Fetch the top N users by XP for the weekly leaderboard.
 * (Week-scoping is done by the weekly-reset job; this just reads current totals.)
 */
export async function getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('user_gamification')
    .select('profile_id, xp, rank_level, profiles(full_name)')
    .order('xp', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row: any) => {
    const rankObj = RANKS.find(r => r.level === row.rank_level) ?? RANKS[0];
    return {
      profileId: row.profile_id,
      fullName: row.profiles?.full_name ?? 'Unknown',
      xp: row.xp,
      rankLevel: row.rank_level,
      rankTitle: rankObj.title,
    };
  });
}

/**
 * Fetch all passport stamps for a user, joined with place name and location fields.
 */
export async function getPassportStamps(profileId: string) {
  const { data, error } = await supabase
    .from('passport_stamps')
    .select('id, place_id, earned_at, places(name, city, neighborhood, latitude, longitude, type)')
    .eq('profile_id', profileId)
    .order('earned_at', { ascending: false });

  if (error) {
    console.error('passport stamps fetch error', error);
    return [];
  }
  return data ?? [];
}

/**
 * Check if the user has stamped every approved place in a given neighborhood.
 * Returns the badge key if newly completed, null otherwise.
 */
export async function checkNeighborhoodCompletion(
  profileId: string,
  city: string,
  neighborhood: string,
): Promise<string | null> {
  const badgeKey = `nbhd_${city}_${neighborhood}`
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_');

  // Already awarded?
  const { count: alreadyCount } = await supabase
    .from('user_badges')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('badge_key', badgeKey);
  if ((alreadyCount ?? 0) > 0) return null;

  // Total approved places in this neighborhood
  const { count: totalPlaces } = await supabase
    .from('places')
    .select('id', { count: 'exact', head: true })
    .eq('approved', true)
    .eq('city', city)
    .eq('neighborhood', neighborhood);

  if (!totalPlaces || totalPlaces < 2) return null; // need at least 2 places to be meaningful

  // User's stamps in this neighborhood
  const { count: stampedPlaces } = await supabase
    .from('passport_stamps')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .in(
      'place_id',
      // subquery via RPC isn't available here; fetch the place IDs first
      await supabase
        .from('places')
        .select('id')
        .eq('approved', true)
        .eq('city', city)
        .eq('neighborhood', neighborhood)
        .then(({ data }) => (data ?? []).map((p: any) => p.id)),
    );

  if ((stampedPlaces ?? 0) < totalPlaces) return null;

  // All stamped — award the badge
  await supabase
    .from('user_badges')
    .insert({ profile_id: profileId, badge_key: badgeKey });

  return badgeKey;
}

/**
 * Update a place's city and neighborhood (backfill for existing places).
 */
export async function updatePlaceLocation(
  placeId: number,
  city: string,
  neighborhood: string,
): Promise<void> {
  await supabase
    .from('places')
    .update({ city, neighborhood })
    .eq('id', placeId)
    .is('city', null); // only update if not already set (avoid races)
}
