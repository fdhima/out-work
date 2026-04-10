-- ─── Gamification Tables ───────────────────────────────────────────────────────

-- Tracks total XP and current rank per user
CREATE TABLE IF NOT EXISTS user_gamification (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  xp INT NOT NULL DEFAULT 0,
  rank_level INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Immutable log of every XP event for auditing / badge detection
CREATE TABLE IF NOT EXISTS xp_events (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  xp_amount INT NOT NULL,
  reason TEXT NOT NULL, -- 'review', 'sub_rating_bonus', 'first_scout', 'crowd_report'
  reference_id TEXT,    -- review id or place id for traceability
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS xp_events_profile_id_idx ON xp_events(profile_id);
CREATE INDEX IF NOT EXISTS xp_events_reason_idx ON xp_events(profile_id, reason);

-- One row per (user, badge) – insert-only, unique constraint prevents duplicates
CREATE TABLE IF NOT EXISTS user_badges (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, badge_key)
);

CREATE INDEX IF NOT EXISTS user_badges_profile_id_idx ON user_badges(profile_id);

-- One row per (user, place) = one passport stamp
CREATE TABLE IF NOT EXISTS passport_stamps (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  place_id INT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, place_id)
);

CREATE INDEX IF NOT EXISTS passport_stamps_profile_id_idx ON passport_stamps(profile_id);

-- ─── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE passport_stamps ENABLE ROW LEVEL SECURITY;

-- user_gamification: users can read their own row; leaderboard reads all
CREATE POLICY "users can read own gamification" ON user_gamification
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "users can insert own gamification" ON user_gamification
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "users can update own gamification" ON user_gamification
  FOR UPDATE USING (auth.uid() = profile_id);

-- xp_events: insert + read own
CREATE POLICY "users can insert own xp events" ON xp_events
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "users can read own xp events" ON xp_events
  FOR SELECT USING (auth.uid() = profile_id);

-- user_badges: insert + read own
CREATE POLICY "users can insert own badges" ON user_badges
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "users can read own badges" ON user_badges
  FOR SELECT USING (auth.uid() = profile_id);

-- passport_stamps: insert + read own
CREATE POLICY "users can insert own stamps" ON passport_stamps
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "users can read own stamps" ON passport_stamps
  FOR SELECT USING (auth.uid() = profile_id);

-- Leaderboard: anyone authenticated can read all gamification rows
CREATE POLICY "authenticated can read all gamification for leaderboard" ON user_gamification
  FOR SELECT USING (auth.role() = 'authenticated');
