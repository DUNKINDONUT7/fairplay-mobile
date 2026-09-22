// Mirrors the real Supabase schema (supabase/schema.sql in the web repo).
// These are the actual Postgres column names — do not rename to camelCase,
// the web app reads/writes these exact columns and mobile must stay in sync.

export type CriteriaItem = {
  id: string;
  name: string;
  weight: number;
  description?: string;
  scoringRange?: { min: number; max: number };
  judgeInstructions?: string;
};

export type EventRow = {
  id: number;
  title: string;
  type?: string | null;
  organizer_id?: number | null;
  participants?: number | null;
  max_participants?: number | null;
  metadata?: Record<string, unknown> | null;
  criteria?: CriteriaItem[] | null;
  contestants?: unknown[] | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  scheduled_date?: string | null;
  location?: string | null;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type JudgeRow = {
  id: number;
  name: string;
  email?: string | null;
  role?: string | null;
  specialty?: string | null;
  status?: string | null;
  score_count?: number | null;
};

export type JudgeAssignmentRow = {
  id: string;
  judge_id: number;
  event_id: number;
  sub_event_id?: string | null;
  assigned_at?: string | null;
  status?: string | null;
  notes?: string | null;
};

export type JudgeInviteRow = {
  id: number;
  event_id: number;
  event_title?: string | null;
  judge_email: string;
  judge_name: string;
  token: string;
  status: string;
  created_at?: string | null;
  claimed_at?: string | null;
  revoked_at?: string | null;
};

export type RegistrationRow = {
  id: number;
  event_id: number;
  participant_id?: number | null;
  team_id?: number | null;
  participant_name: string;
  email?: string | null;
  category?: string | null;
  status?: string | null;
  registration_type?: string | null;
  team_name?: string | null;
  created_at?: string | null;
};

export type ScoreRow = {
  id: string;
  event_id: number;
  judge_id?: string | null;
  judge_name?: string | null;
  contestant_id?: string | null;
  contestant_name?: string | null;
  criteria_scores?: unknown[] | null;
  total_score?: number | null;
  locked?: boolean | null;
  created_at?: string | null;
};

export type EventStatus = 'draft' | 'upcoming' | 'active' | 'completed' | 'approved' | 'rejected' | string;

// A bracket lives entirely on the `tournaments` table: `matches` is a jsonb
// array column, not a separate table (the `brackets`/`matches` tables that
// also exist in the schema are unused by the web app's OrganizerBracket page).
export type TournamentEntrant = {
  id: string;
  name: string;
  seed?: number | null;
  type?: string | null;
};

export type TournamentMatch = {
  id: string;
  round: number;
  team1?: TournamentEntrant | null;
  team2?: TournamentEntrant | null;
  score1?: number | null;
  score2?: number | null;
  winner?: TournamentEntrant | null;
  status?: string | null;
  completedDate?: string | null;
  scheduledDate?: string | null;
};

export type TournamentRow = {
  id: number;
  event_id: number;
  name: string;
  title?: string | null;
  bracket_type?: string | null;
  status?: string | null;
  current_round?: number | null;
  total_rounds?: number | null;
  is_published?: boolean | null;
  is_locked?: boolean | null;
  champion?: TournamentEntrant | null;
  matches: TournamentMatch[];
  created_at?: string | null;
};
